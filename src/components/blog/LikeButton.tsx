import { useEffect, useState } from "react";
import { likes } from "@wix/blog";

const FQDN = "wix.blog.v3.post";

type Props = {
  postId: string;
  initialLikes: number;
};

export default function LikeButton({ postId, initialLikes }: Props) {
  const [count, setCount] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await likes.queryLikes()
          .eq("entityId", postId)
          .eq("fqdn", FQDN)
          .find();
        if (!cancelled && (res.items?.length ?? 0) > 0) {
          setLiked(true);
        }
      } catch {
        // unauthenticated visitors can't query their own likes — that's fine, leave as not-liked
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    try {
      if (prevLiked) {
        await likes.deleteLikeByFqdnAndEntityId({ entityId: postId, fqdn: FQDN });
      } else {
        await likes.createLike({ like: { entityId: postId, fqdn: FQDN } });
      }
    } catch (err) {
      setLiked(prevLiked);
      setCount(prevCount);
      setError(err instanceof Error ? err.message : "Couldn't update like.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`like-btn ${liked ? "is-liked" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this post" : "Like this post"}
      title={error ?? (liked ? "Unlike" : "Like")}
    >
      <svg className="like-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.35-9.5-9C1 7.7 3.2 4.5 6.5 4.5c1.85 0 3.4.95 4.5 2.4 1.1-1.45 2.65-2.4 4.5-2.4C18.8 4.5 21 7.7 19.5 11c-2.5 4.65-9.5 9-9.5 9z"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span className="like-btn__count">{count.toLocaleString()}</span>
    </button>
  );
}
