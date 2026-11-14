import { createItem, deleteItem, updateItem, type Item, type ItemWrite } from "../../db/items";
import { commitImage } from "../images/change";

// Saving and deleting an item: the item form and the MCP tools (TICKET-MCP-01) share these, so both handle the image
// files the same way. `input.image` is a prepared image (see commitImage): undefined keeps the current one.

// Creates the item when there is none yet. Returns the saved item's id.
export const saveItem = (collectionId: number, item: Item | undefined, input: ItemWrite): Promise<number> =>
  commitImage(input.image, item?.image, () => {
    if (!item) return createItem(collectionId, input);
    updateItem(collectionId, item.id, input);
    return item.id;
  });

// Its image files go once the row is gone.
export const removeItem = (collectionId: number, item: Item): Promise<boolean> =>
  commitImage(null, item.image, () => deleteItem(collectionId, item.id));
