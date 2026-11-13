import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getCollectionBySlug, listCollections, type Collection } from "../../db/collections";
import { fieldTypes, listFields, type Field } from "../../db/fields";
import { createItem, deleteItem, getItem, moveWant, updateItem, type Item } from "../../db/items";
import { addField, editField } from "../collections/field-changes";
import type { FieldRejected } from "../collections/form";
import type { FormInput } from "../collections/validation";
import { commitImage } from "../images/change";
import { translateItemErrors } from "../items/messages";
import { parseItemForm } from "../items/schema";
import { itemView } from "../items/view";

// The MCP tools (TICKET-MCP-01): what the admin can do in the UI, through the same repositories and parsers, so an
// agent's input passes the same validation and gets the same (English) messages. A tool throws to report a problem;
// the SDK returns that as a tool error with the message as its text. Runs inside a request context (locale "en").

// A thrown message the agent can act on.
const refuse = (message: string): never => {
  throw new Error(message);
};

const collectionOf = (slug: string): Collection =>
  getCollectionBySlug(slug) ?? refuse(`No collection has the slug "${slug}". list_collections shows them.`);

const itemOf = (collection: Collection, id: number): Item =>
  getItem(collection.id, id) ?? refuse(`Item ${id} isn't in "${collection.slug}".`);

const fieldOf = (collection: Collection, id: number): Field =>
  listFields(collection.id).find((field) => field.id === id) ??
  refuse(`Field ${id} isn't in "${collection.slug}". get_collection lists its fields.`);

const fieldView = (field: Field) => ({
  id: field.id,
  label: field.label,
  type: field.type,
  options: field.options,
  required: field.required === 1,
  public: field.isPublic === 1,
  title: field.isTitle === 1,
  prefix: field.prefix,
  suffix: field.suffix,
  ratingMax: field.ratingMax,
  ratingSymbol: field.ratingSymbol,
});

// Values keyed by field id, each with its label, in field order.
const itemOut = (fields: Field[]) => (item: Item) => ({
  id: item.id,
  status: item.status,
  quantity: item.quantity,
  rank: item.rank,
  values: fields
    .filter((field) => item.values[field.id] !== undefined)
    .map((field) => ({ fieldId: field.id, label: field.label, value: item.values[field.id] })),
});

// The form validation's messages, one per line, named by field label.
const refuseItem = (fields: Field[], errors: Partial<Record<string, string>>): never => {
  const nameOf = (input: string) => fields.find((field) => `f.${field.id}` === input)?.label ?? input;
  return refuse(Object.entries(errors).map(([input, message]) => `${nameOf(input)}: ${message}`).join("\n"));
};

const refuseField = (rejected: FieldRejected): never =>
  refuse(Object.entries(rejected.errors).map(([input, message]) => `${input}: ${message}`).join("\n"));

type ItemArgs = { status?: "have" | "want"; quantity?: number; values: Record<string, unknown> };

// Through the item form's parser. A value key that isn't a field id is refused rather than silently dropped. Every
// field gets an input, blank when not given, as the form posts them: a missing key would skip the required check.
const parseItem = (collection: Collection, args: ItemArgs) => {
  const fields = listFields(collection.id);
  const unknown = Object.keys(args.values).filter((key) => !fields.some((field) => String(field.id) === key));
  if (unknown.length > 0) refuse(`Unknown field ids: ${unknown.join(", ")}. get_collection lists the fields.`);
  const values = fields.map((field) => [`f.${field.id}`, args.values[field.id] ?? ""]);
  const parsed = parseItemForm({ status: args.status, quantity: args.quantity, ...Object.fromEntries(values) }, fields);
  return parsed.success ? parsed.data : refuseItem(fields, translateItemErrors(parsed.errors));
};

// Places a want at `rank` after it was written; ranks outside 1..n are clamped.
const placeWant = (collection: Collection, id: number, rank: number | undefined) => {
  if (rank !== undefined) moveWant(collection.id, id, rank);
  return itemOut(listFields(collection.id))(itemOf(collection, id));
};

// Booleans and lists in the shape the field form posts: a ticked checkbox is "on", options one per line.
const fieldForm = (inputs: Record<string, string | number | boolean | string[] | null | undefined>): FormInput =>
  Object.fromEntries(
    Object.entries(inputs)
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([name, value]) => [name, value === true ? "on" : Array.isArray(value) ? value.join("\n") : String(value)]),
  );

const slug = z.string().describe("The collection's slug, from list_collections.");
const itemId = z.number().int().describe("The item's id.");
const status = z.enum(["have", "want"]);
const values = z
  .record(z.string(), z.unknown())
  .describe("Values keyed by field id (get_collection lists them). null or \"\" clears a value.");
const affix = z.string().describe("Display-only text before or after the value, like € or cm; \"\" for none.");

type Tool<S extends z.ZodObject> = {
  description: string;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  input: S;
  run: (args: z.infer<S>) => unknown;
};

// Keeps each tool's argument type tied to its own schema.
const tool = <S extends z.ZodObject>(definition: Tool<S>) => definition;

const read = { readOnlyHint: true };

export const tools = {
  list_collections: tool({
    description: "Lists every collection with its slug, public flag and how many items it has and wants.",
    annotations: read,
    input: z.object({}),
    run: () =>
      listCollections().map((collection) => ({
        slug: collection.slug,
        name: collection.name,
        public: collection.isPublic === 1,
        have: collection.haveCount,
        want: collection.wantCount,
      })),
  }),
  get_collection: tool({
    description: "A collection's settings and its fields in order. Item values are keyed by these field ids.",
    annotations: read,
    input: z.object({ collection: slug }),
    run: ({ collection }) => {
      const found = collectionOf(collection);
      return {
        slug: found.slug,
        name: found.name,
        public: found.isPublic === 1,
        defaultView: found.defaultView,
        fields: listFields(found.id).map(fieldView),
      };
    },
  }),
  list_items: tool({
    description:
      "Items of a collection with one status. Like the list page: search text, sort by a field id, \"created\" or " +
      "\"rank\" (wants), and filters on choice and yes/no fields (an option, or \"yes\" / \"no\").",
    annotations: read,
    input: z.object({
      collection: slug,
      status: status.default("have"),
      q: z.string().optional(),
      sort: z.string().optional().describe("A field id, \"created\", or \"rank\" for wants."),
      dir: z.enum(["asc", "desc"]).optional(),
      filters: z.record(z.string(), z.string()).optional().describe("Field id → option, or \"yes\" / \"no\"."),
    }),
    run: ({ collection, status: tab, q, sort, dir, filters = {} }) => {
      const found = collectionOf(collection);
      const params = { q, sort, dir, ...Object.fromEntries(Object.entries(filters).map(([id, v]) => [`f.${id}`, v])) };
      const search = new URLSearchParams(
        Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
      );
      const { fields, items } = itemView(found, tab, search);
      return items.map(itemOut(fields));
    },
  }),
  get_item: tool({
    description: "One item with all its values, each with its field id and label.",
    annotations: read,
    input: z.object({ collection: slug, id: itemId }),
    run: ({ collection, id }) => {
      const found = collectionOf(collection);
      return itemOut(listFields(found.id))(itemOf(found, id));
    },
  }),
  create_item: tool({
    description:
      "Adds an item, validated like the item form. A have gets quantity (default 1); a want goes to the bottom of the " +
      "ranking, or to `rank`.",
    input: z.object({
      collection: slug,
      status: status.default("have"),
      quantity: z.number().int().optional(),
      rank: z.number().int().optional(),
      values,
    }),
    run: ({ collection, rank, ...args }) => {
      const found = collectionOf(collection);
      return placeWant(found, createItem(found.id, parseItem(found, args)), rank);
    },
  }),
  update_item: tool({
    description:
      "Changes an item, validated like the item form. Only the values given change; status and quantity keep theirs " +
      "unless given. `rank` moves a want.",
    input: z.object({
      collection: slug,
      id: itemId,
      status: status.optional(),
      quantity: z.number().int().optional(),
      rank: z.number().int().optional(),
      values: values.default({}),
    }),
    run: ({ collection, id, rank, ...args }) => {
      const found = collectionOf(collection);
      const item = itemOf(found, id);
      const parsed = parseItem(found, {
        status: args.status ?? item.status,
        quantity: args.quantity ?? item.quantity ?? undefined,
        values: { ...item.values, ...args.values },
      });
      updateItem(found.id, id, parsed);
      return placeWant(found, id, rank);
    },
  }),
  delete_item: tool({
    description: "Deletes one item and its image. This can't be undone.",
    annotations: { destructiveHint: true },
    input: z.object({ collection: slug, id: itemId }),
    run: async ({ collection, id }) => {
      const found = collectionOf(collection);
      const item = itemOf(found, id);
      await commitImage(null, item.image, () => deleteItem(found.id, id));
      return { deleted: id };
    },
  }),
  move_want: tool({
    description: "Moves a want to a rank (1 is the top); the other wants shift to make room.",
    input: z.object({ collection: slug, id: itemId, rank: z.number().int() }),
    run: ({ collection, id, rank }) => {
      const found = collectionOf(collection);
      if (!moveWant(found.id, id, rank)) refuse(`Item ${id} isn't a want in "${found.slug}".`);
      return placeWant(found, id, undefined);
    },
  }),
  create_field: tool({
    description: "Adds a field at the end, validated like the field form. A choice (select) field needs options.",
    input: z.object({
      collection: slug,
      label: z.string(),
      type: z.enum(fieldTypes),
      options: z.array(z.string()).optional().describe("The choices of a select field."),
      required: z.boolean().default(false),
      public: z.boolean().default(true).describe("Private fields never show on public pages."),
      prefix: affix.optional(),
      suffix: affix.optional(),
      ratingMax: z.number().int().optional().describe("A rating's maximum, 2 to 10 (default 5)."),
      ratingSymbol: z.string().optional().describe("A rating's one symbol (default ★)."),
    }),
    run: ({ collection, public: isPublic, ...inputs }) => {
      const found = collectionOf(collection);
      const rejected = addField(found, fieldForm({ ...inputs, isPublic }));
      if (rejected) refuseField(rejected);
      return listFields(found.id).map(fieldView).at(-1);
    },
  }),
  update_field: tool({
    description:
      "Renames a field, changes required / public, prefix and suffix or a rating's maximum and symbol, or adds " +
      "options to a choice field. What isn't given stays. The type can't change here.",
    input: z.object({
      collection: slug,
      id: z.number().int().describe("The field's id."),
      label: z.string().optional(),
      required: z.boolean().optional(),
      public: z.boolean().optional(),
      addOptions: z.array(z.string()).optional().describe("New choices for a select field."),
      prefix: affix.optional(),
      suffix: affix.optional(),
      ratingMax: z.number().int().optional(),
      ratingSymbol: z.string().optional(),
    }),
    run: ({ collection, id, ...change }) => {
      const found = collectionOf(collection);
      const field = fieldOf(found, id);
      const rejected = editField(
        found,
        field,
        fieldForm({
          label: change.label ?? field.label,
          required: change.required ?? field.required === 1,
          isPublic: change.public ?? field.isPublic === 1,
          options: change.addOptions,
          prefix: change.prefix ?? field.prefix,
          suffix: change.suffix ?? field.suffix,
          ratingMax: change.ratingMax ?? field.ratingMax,
          ratingSymbol: change.ratingSymbol ?? field.ratingSymbol,
        }),
      );
      if (rejected) refuseField(rejected);
      return fieldView(fieldOf(found, id));
    },
  }),
};

// A fresh server per request: the endpoint is stateless (createMcpHandler calls this for every request).
export const mcpServer = (): McpServer => {
  const server = new McpServer({ name: "collections", version: "1.0.0" });
  Object.entries(tools).forEach(([name, definition]) => {
    const { description, annotations, input, run } = definition as Tool<z.ZodObject>;
    server.registerTool(name, { description, annotations, inputSchema: input }, async (args: unknown) => ({
      content: [{ type: "text", text: JSON.stringify(await run(args as z.infer<typeof input>)) }],
    }));
  });
  return server;
};
