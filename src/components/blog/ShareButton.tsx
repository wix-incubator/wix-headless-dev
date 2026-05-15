import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export default function ShareButton({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as any).share({ url, title });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      type="button"
      className={`share-btn ${copied ? "is-copied" : ""}`}
      onClick={share}
      aria-label="Share this post"
      title={copied ? "Link copied" : "Share"}
    >
      <svg className="share-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="2.4" />
        <circle cx="6" cy="12" r="2.4" />
        <circle cx="18" cy="19" r="2.4" />
        <path d="M8.1 11 15.9 6.2" />
        <path d="M8.1 13l7.8 4.8" />
      </svg>
      <span className="share-btn__label">{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
