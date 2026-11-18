"use server";
import { z } from "zod";
import { moveWant } from "../db/items";
import { moveWishItem } from "../db/wishlist";
import { requireAdmin } from "../features/auth/guard";
import { requireCollection } from "../features/collections/require-collection";
import { requireWishlist } from "../features/wishlist/require-wishlist";

const moveSchema = z.object({ slug: z.string(), itemId: z.number().int(), to: z.number().int() });

// Drag-and-drop on the admin want tab (bound to the slug there). The rank inputs post the same move to the list
// route's action instead, so reordering also works without JS. Throws when the item isn't a want of this collection,
// so the dragged order falls back.
export const moveWantAction = async (slug: string, itemId: number, to: number): Promise<void> => {
  requireAdmin();
  const input = moveSchema.parse({ slug, itemId, to });
  if (!moveWant(requireCollection(input.slug).id, input.itemId, input.to)) throw new Error("Not a want of this collection");
};

// Drag-and-drop on an admin wishlist (TICKET-WSH-03, bound to its slug since TICKET-WSH-09); the rank inputs post
// to the page's route action instead. Throws when the item isn't on this wishlist.
export const moveWishItemAction = async (slug: string, itemId: number, to: number): Promise<void> => {
  requireAdmin();
  const input = moveSchema.parse({ slug, itemId, to });
  if (!moveWishItem(requireWishlist(input.slug).id, input.itemId, input.to)) throw new Error("Not on this wishlist");
};
