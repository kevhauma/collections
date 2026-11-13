import { moveInList } from "../lib/order";
import { db } from "./connection";

// All SQL for a collection's fields (TICKET-COL-02). Every statement is scoped to the collection, and the title field
// is protected here, in SQL, so no caller can delete it or make it optional or private.

export const fieldTypes = ["text", "number", "date", "select", "checkbox", "url"] as const;
export type FieldType = (typeof fieldTypes)[number];

export type Field = {
  id: number;
  label: string;
  type: FieldType;
  options: string[] | null;
  required: 0 | 1;
  isPublic: 0 | 1;
  position: number;
  isTitle: 0 | 1;
  // Items holding a non-empty value for this field, for the delete confirmation.
  valueCount: number;
};

export type FieldInput = Pick<Field, "label" | "options" | "required" | "isPublic">;
export type NewField = FieldInput & Pick<Field, "type">;

const isTitleField = "id = (select title_field_id from collections where id = @collectionId)";

export const listFields = (collectionId: number): Field[] =>
  (
    db()
      .prepare(
        `select f.id, f.label, f.type, f.options_json as options, f.required, f.is_public as isPublic, f.position,
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
      `insert into fields (collection_id, label, type, options_json, required, is_public, position)
       select @collectionId, @label, @type, @options, @required, @isPublic, coalesce(max(position), 0) + 1
       from fields where collection_id = @collectionId`,
    )
    .run({ ...field, options: optionsJson(field.options), collectionId });
};

// The title field stays required and public whatever the input says.
export const updateField = (collectionId: number, fieldId: number, field: FieldInput): void => {
  db()
    .prepare(
      `update fields set label = @label, options_json = @options,
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
