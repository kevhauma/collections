import { msg } from "@lingui/core/macro";
import { actionI18n } from "../../i18n";
import type { ImageErrorReason } from "./fetch";

const messages: Record<ImageErrorReason, ReturnType<typeof msg>> = {
  notImage: msg({
    id: "images.error.notImage",
    message: "This isn't an image that can be read. Use a JPEG, PNG, WebP, GIF or AVIF.",
  }),
  tooLarge: msg({ id: "images.error.tooLarge", message: "This image is too large (max 15 MB)." }),
  download: msg({ id: "images.error.download", message: "Couldn't download an image from that address." }),
};

// In the admin's language (actionI18n, Lingui #2615), for actions and for the form's own size check.
export const imageErrorText = (reason: ImageErrorReason): string => actionI18n()._(messages[reason]);
