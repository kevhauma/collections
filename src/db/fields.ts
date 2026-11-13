import { moveInList } from "../lib/order";
import { db } from "./connection";

// All SQL for a collection's fields (TICKET-COL-02). Every statement is scoped to the collection, and the title field
// is protected here, in SQL, so no caller can delete it or make it optional or private.

export const fieldTypes = ["text", "number", "date", "select", "checkbox", "url"] as const;
export type FieldType = (typeof fieldTypes)[number];

// The title field stays text-like, so every item keeps a usable title (TICKET-COL-03).
export const titleFieldTypes: readonly FieldType[] = ["text", "url", "select"];

// Types whose value can carry a display-only prefix and suffix, like "€" or "cm" (TICKET-COL-04).
export const affixTypes: readonly FieldType[] = ["text", "number", "select"];

export type Field = {
  id: number;
  label: string;
  type: FieldType;
  options: string[] | null;
  required: 0 | 1;
  isPublic: 0 | 1;
  prefix: string | null;
  suffix: string | null;
  position: number;
  isTitle: 0 | 1;
  // Items holding a non-empty value for this field, for the delete confirmation.
  valueCount: number;
};

export type FieldInput = Pick<Field, "label" | "options" | "required" | "isPublic" | "prefix" | "suffix">;
export type NewField = FieldInput & Pick<Field, "type">;

const isTitleField = "id = (select title_field_id from collections where id = @collectionId)";

export const listFields = (collectionId: number): Field[] =>
  (
    db()
      .prepare(
        `select f.id, f.label, f.type, f.options_json as options, f.required, f.is_public as isPublic, f.prefix, f.suffix,
           f.position,
           f.id is c.title_field_id as isTitle,
           (select count(*) from items i where i.collection_id = f.collection_id
              and nullif(json_extract(i.values_json, '$."' || f.id || '"'), '') is not null) as valueCount
         from fields f join collections c on c.id = f.collection_id
         where f.collection_id = ? order by f.position`,
      )
      .all(collectionId) as Array<Omit<Field, "options"> & { options: string | null }>
  ).map((row) => ({ ...row, options: row.options === null ? null : (JSON.parse(row.options) as string[]) }));

const optionsJson = (options: string[] | null) => (options === null ? null : JSON.stringify(options));

// New fields go last.
export const createField = (collectionId: number, field: NewField): void => {
  db()
    .prepare(
      `insert into fields (collection_id, label, type, options_json, required, is_public, prefix, suffix, position)
       select @collectionId, @label, @type, @options, @required, @isPublic, @prefix, @suffix, coalesce(max(position), 0) + 1
       from fields where collection_id = @collectionId`,
    )
    .run({ ...field, options: optionsJson(field.options), collectionId });
};

// The title field stays required and public whatever the input says.
export const updateField = (collectionId: number, fieldId: number, field: FieldInput): void => {
  db()
    .prepare(
      `update fields set label = @label, options_json = @options, prefix = @prefix, suffix = @suffix,
         required = iif(${isTitleField}, 1, @required), is_public = iif(${isTitleField}, 1, @isPublic)
       where id = @fieldId and collection_id = @collectionId`,
    )
    .run({ ...field, options: optionsJson(field.options), fieldId, collectionId });
};

// `to` is the 1-based target position (clamped). Positions are renumbered 1..n in the same transaction.
export const moveField = (collectionId: number, fieldId: number, to: number): void =>
  db().transaction(() => {
    const ids = db()
      .prepare("select id from fields where collection_id = ? order by position")
      .pluck()
      .all(collectionId) as number[];
    const setPosition = db().prepare("update fields set position = ? where id = ?");
    moveInList(ids, ids.indexOf(fieldId), to - 1).forEach((id, index) => setPosition.run(index + 1, id));
  })();

// Removes the field's key from every item, deletes the field and closes the gap, in one transaction. False when
// nothing was deleted: an unknown field, or the title field.
export const deleteField = (collectionId: number, fieldId: number): boolean =>
  db().transaction(() => {
    const deleted = db()
      .prepare(
        `delete from fields where id = @fieldId and collection_id = @collectionId and not ${isTitleField}
         returning position`,
      )
      .get({ fieldId, collectionId }) as { position: number } | undefined;
    if (!deleted) return false;
    db()
      .prepare("update items set values_json = json_remove(values_json, ?) where collection_id = ?")
      .run(`$."${fieldId}"`, collectionId);
    db()
      .prepare("update fields set position = position - 1 where collection_id = ? and position > ?")
      .run(collectionId, deleted.position);
    return true;
  })();

// A constant type list as SQL literals; the values are our own, never user input.
const quoted = (types: readonly FieldType[]) => types.map((type) => `'${type}'`).join(", ");

// Schema changes that rewrite item data (TICKET-COL-03). Paths are built from the integer field id and bound.
const pathOf = (fieldId: number) => `$."${fieldId}"`;

const titled = (select: string) =>
  `select i.id, json_extract(i.values_json, '$."' || c.title_field_id || '"') as title${select}
   from items i join collections c on c.id = i.collection_id`;

export type FieldValueRow = { id: number; title: unknown; value: unknown };

// Every item holding a value for the field, oldest first. `->` keeps the JSON type: a checkbox's true stays true,
// where json_extract would give 1.
export const fieldValues = (collectionId: number, fieldId: number): FieldValueRow[] =>
  (
    db()
      .prepare(
        `${titled(", i.values_json -> @path as value")}
         where i.collection_id = @collectionId and i.values_json -> @path is not null order by i.id`,
      )
      .all({ collectionId, path: pathOf(fieldId) }) as Array<{ id: number; title: unknown; value: string }>
  ).map((row) => ({ ...row, value: JSON.parse(row.value) as unknown }));

type TypeChange = { kept: Array<{ id: number; value: unknown }>; blanked: Array<{ id: number }>; options: string[] | null };

// One transaction: `plan` runs on the values as they are now (so an item edited after the preview converts on its
// current value) and returns undefined to refuse. Then the field gets its new type and options, kept values are
// rewritten and blanked ones removed. False when nothing changed; the title field never leaves the text-like types.
// A type without affixes loses the prefix and suffix.
export const changeFieldType = (
  collectionId: number,
  fieldId: number,
  toType: FieldType,
  plan: (rows: FieldValueRow[]) => TypeChange | undefined,
): boolean =>
  db().transaction(() => {
    const result = plan(fieldValues(collectionId, fieldId));
    if (!result) return false;
    const changed = db()
      .prepare(
        `update fields set type = @toType, options_json = @options,
           prefix = iif(@toType in (${quoted(affixTypes)}), prefix, null),
           suffix = iif(@toType in (${quoted(affixTypes)}), suffix, null)
         where id = @fieldId and collection_id = @collectionId
           and (not ${isTitleField} or @toType in (${quoted(titleFieldTypes)}))`,
      )
      .run({ toType, options: optionsJson(result.options), fieldId, collectionId }).changes;
    if (changed === 0) return false;
    const path = pathOf(fieldId);
    const set = db().prepare("update items set values_json = json_set(values_json, ?, json(?)) where id = ?");
    const remove = db().prepare("update items set values_json = json_remove(values_json, ?) where id = ?");
    result.kept.forEach((row) => set.run(path, JSON.stringify(row.value), row.id));
    result.blanked.forEach((row) => remove.run(path, row.id));
    return true;
  })();

const optionsOf = (collectionId: number, fieldId: number): string[] | null => {
  const json = db()
    .prepare("select options_json from fields where id = ? and collection_id = ? and type = 'select'")
    .pluck()
    .get(fieldId, collectionId) as string | null | undefined;
  return json ? (JSON.parse(json) as string[]) : null;
};

const setOptions = (collectionId: number, fieldId: number, options: string[]) => {
  db()
    .prepare("update fields set options_json = ? where id = ? and collection_id = ?")
    .run(optionsJson(options), fieldId, collectionId);
};

// Items whose value for the field is exactly `option`.
export const itemsWithOption = (collectionId: number, fieldId: number, option: string): Array<{ id: number; title: unknown }> =>
  db()
    .prepare(`${titled("")} where i.collection_id = ? and json_extract(i.values_json, ?) = ? order by i.id`)
    .all(collectionId, pathOf(fieldId), option) as Array<{ id: number; title: unknown }>;

// Renames the option and every value exactly equal to it, in one transaction. False for an unknown option or a name
// another option already has.
export const renameOption = (collectionId: number, fieldId: number, from: string, to: string): boolean =>
  db().transaction(() => {
    const options = optionsOf(collectionId, fieldId);
    if (!options?.includes(from) || options.includes(to)) return false;
    setOptions(collectionId, fieldId, options.map((option) => (option === from ? to : option)));
    db()
      .prepare(
        `update items set values_json = json_set(values_json, @path, @to)
         where collection_id = @collectionId and json_extract(values_json, @path) = @from`,
      )
      .run({ path: pathOf(fieldId), to, from, collectionId });
    return true;
  })();

// Drops the option and blanks every value equal to it, in one transaction. False for an unknown option or the last
// one: a choice field keeps at least one.
export const removeOption = (collectionId: number, fieldId: number, option: string): boolean =>
  db().transaction(() => {
    const options = optionsOf(collectionId, fieldId);
    if (!options?.includes(option) || options.length === 1) return false;
    setOptions(collectionId, fieldId, options.filter((candidate) => candidate !== option));
    db()
      .prepare(
        `update items set values_json = json_remove(values_json, @path)
         where collection_id = @collectionId and json_extract(values_json, @path) = @option`,
      )
      .run({ path: pathOf(fieldId), option, collectionId });
    return true;
  })();
