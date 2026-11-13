// Image facts the browser needs too (the form's preview checks the size), so nothing here imports server code.

export const maxImageBytes = 15 * 1024 * 1024;

// What the form does with a chosen file: nothing chosen, refuse it (over the cap), or preview it.
export const checkChosenFile = (file?: { size: number }): "none" | "tooLarge" | "ok" => {
  if (!file) return "none";
  return file.size > maxImageBytes ? "tooLarge" : "ok";
};

// The 300 px thumbnail of an image id, served by Express from DATA_DIR/uploads.
export const thumbUrl = (id: string): string => `/uploads/${id}.thumb.webp`;
