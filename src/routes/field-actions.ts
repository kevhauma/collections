"use server";
import { z } from "zod";
import { moveField } from "../db/fields";
import { requireAdmin } from "../features/auth/guard";
import { requireCollection } from "../features/collections/require-collection";

const moveSchema = z.object({ slug: z.string(), fieldId: z.number().int(), to: z.number().int() });

// Drag-and-drop reordering on /admin/c/:slug/fields (bound to the slug there). The up/down buttons post the same
// move to the route action instead, so reordering also works without JS.
export const moveFieldAction = async (slug: string, fieldId: number, to: number): Promise<void> => {
  requireAdmin();
  const input = moveSchema.parse({ slug, fieldId, to });
  moveField(requireCollection(input.slug).id, input.fieldId, input.to);
};
