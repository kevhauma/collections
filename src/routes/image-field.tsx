"use client";
import { useEffect, useState, type ChangeEvent } from "react";
import { checkChosenFile } from "../features/images/shared";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { PostIt } from "../ui/post-it";

type ImageFieldProps = {
  label: string;
  // The server's message after a failed save.
  error?: string;
  tooLargeMessage: string;
  previewAlt: string;
};

// The item form's file input (TICKET-ITM-04). With JS it previews the chosen file and refuses one over 15 MB before
// it's sent, since the server can only answer an oversized upload by dropping the connection. Without JS it's a plain
// file input.
export const ImageField = ({ label, error, tooLargeMessage, previewAlt }: ImageFieldProps) => {
  const [preview, setPreview] = useState<string>();
  const [tooLarge, setTooLarge] = useState(false);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const verdict = checkChosenFile(file);
    // An oversized file is taken back out, so the form can still be saved without it.
    if (verdict === "tooLarge") input.value = "";
    setTooLarge(verdict === "tooLarge");
    setPreview(verdict === "ok" ? URL.createObjectURL(file!) : undefined);
  };

  return (
    <div className="grid gap-3">
      <FormField id="item-image" label={label} error={tooLarge ? tooLargeMessage : error}>
        {(control) => <Input {...control} type="file" name="image" accept="image/*" onChange={choose} />}
      </FormField>
      {preview && (
        <PostIt size="lg" tilt="right" fastening="tape">
          <img src={preview} alt={previewAlt} className="size-full object-cover" />
        </PostIt>
      )}
    </div>
  );
};
