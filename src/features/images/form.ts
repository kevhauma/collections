import { imageSource, prepareImage, sourceInput } from "./change";
import { ImageError } from "./fetch";
import { imageErrorText } from "./messages";

// A form's new image (TICKET-ITM-04): its files are written before the DB, or the error to show on the input it came
// from. Used by the item form and the collection settings (TICKET-COL-06).
export const prepareFormImage = async (
  form: Record<string, unknown>,
): Promise<{ image: string | null | undefined } | { errors: Partial<Record<string, string>> }> => {
  const source = imageSource(form);
  try {
    return { image: await prepareImage(source) };
  } catch (error) {
    if (!(error instanceof ImageError)) throw error;
    return { errors: { [sourceInput(source)]: imageErrorText(error.reason) } };
  }
};
