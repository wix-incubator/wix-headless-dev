import { Fragment, useState } from "react";
import { analytics } from "@wix/site";

/** A run of prompt text with an optional tone, mirroring the home prompt:
 *  "muted" → framing words (.tryprompt__static, gray)
 *  "host"  → the accent-styled host (.tryprompt__host)
 *  undefined → default body text (white). */
interface Segment {
  text: string;
  tone?: "muted" | "host";
}

interface CopyPromptProps {
  /** Display lines, each an array of styled segments. */
  lines: Segment[][];
  /** The actual text written to the clipboard (can differ from what's shown). */
  copyText: string;
}

/**
 * The "copy this prompt" box on the site-ready page. Same surface and copy
 * button as the home page's TryPrompt, and the same tone vocabulary (gray
 * framing words + accent host), but shows a short human-readable prompt while
 * copying a fuller machine-ready prompt that carries the real URLs.
 */
export default function CopyPrompt({ lines, copyText }: CopyPromptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    analytics.buttonClicked();
  };

  const toneClass = (tone?: Segment["tone"]) =>
    tone === "muted"
      ? "tryprompt__static"
      : tone === "host"
        ? "tryprompt__host"
        : undefined;

  return (
    <div className="copyprompt">
      <pre className="copyprompt__text">
        {lines.map((segments, i) => (
          <Fragment key={i}>
            {i > 0 && "\n"}
            {segments.map((seg, j) => {
              const cls = toneClass(seg.tone);
              return cls ? (
                <span key={j} className={cls}>{seg.text}</span>
              ) : (
                <Fragment key={j}>{seg.text}</Fragment>
              );
            })}
          </Fragment>
        ))}
      </pre>
      <button
        type="button"
        className={`copyprompt__copy ${copied ? "is-copied" : ""}`}
        onClick={handleCopy}
        aria-label="Copy prompt"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
