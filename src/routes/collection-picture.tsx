import { imageUrl, thumbUrl } from "../features/images/shared";
import { PostIt } from "../ui/post-it";

// A collection's picture (TICKET-COL-06) on a post-it clipped to the page: the thumbnail on a card or a reminder, the display size
// under a collection's title. Nothing when it has none. Images are cropped square, so width and height say so.
const sizes = {
  // A wishlist reminder card (TICKET-WSH-06): smaller than the items it sits above.
  reminder: { postIt: "sm", src: thumbUrl, px: 300, loading: "lazy" },
  card: { postIt: "md", src: thumbUrl, px: 300, loading: "lazy" },
  page: { postIt: "lg", src: imageUrl, px: 1000, loading: "eager" },
} as const;

export const CollectionPicture = ({ image, name, size }: { image: string | null; name: string; size: keyof typeof sizes }) => {
  const { postIt, src, px, loading } = sizes[size];
  return (
    image && (
      <PostIt size={postIt} tilt="right" fastening="paperclip" className="shrink-0">
        <img src={src(image)} alt={name} width={px} height={px} loading={loading} className="size-full object-cover" />
      </PostIt>
    )
  );
};
