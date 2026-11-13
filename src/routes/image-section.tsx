import { useLingui } from "@lingui/react/macro";
import { imageErrorText } from "../features/images/messages";
import { thumbUrl } from "../features/images/shared";
import { Checkbox } from "../ui/choice";
import { FormField } from "../ui/form-field";
import { Input } from "../ui/input";
import { PostIt } from "../ui/post-it";
import { ImageField } from "./image-field";

// The image inputs of a multipart form (TICKET-ITM-04), shared by the item form and the collection settings
// (TICKET-COL-06). They post `image`, `imageUrl` and `removeImage`, read by `prepareFormImage`.

type ImageSectionProps = {
  image: string | null;
  // The alt text: the item title or the collection name.
  title: string;
  url?: string;
  errors: Partial<Record<string, string>>;
  labels: { image: string; imageUrl: string };
};

// The current image on a post-it with a "remove" box, then a file to upload or an address to download from.
export const ImageSection = ({ image, title, url, errors, labels }: ImageSectionProps) => {
  const { t } = useLingui();
  return (
    <div className="grid gap-4">
      {image && (
        <div className="flex flex-wrap items-end gap-4">
          <PostIt size="lg" tilt="left">
            <img src={thumbUrl(image)} alt={title} className="size-full object-cover" />
          </PostIt>
          <Checkbox name="removeImage" label={t({ id: "items.image.remove", message: "Remove image" })} />
        </div>
      )}
      <ImageField
        label={labels.image}
        error={errors.image}
        tooLargeMessage={imageErrorText("tooLarge")}
        previewAlt={title}
      />
      <FormField
        id="item-image-url"
        label={labels.imageUrl}
        hint={t({
          id: "items.image.urlHint",
          message: "It's downloaded once and stored here. If you also choose a file, the file is used.",
        })}
        error={errors.imageUrl}
      >
        {(control) => <Input {...control} type="url" name="imageUrl" defaultValue={url} />}
      </FormField>
    </div>
  );
};
