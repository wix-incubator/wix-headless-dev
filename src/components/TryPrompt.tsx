import { useEffect, useMemo, useRef, useState } from "react";
import { analytics } from "@wix/site";

const INTENTS_DESKTOP = [
  "a storefront for handmade ceramics",
  "a booking site for a yoga studio",
  "a marketplace for local artists",
  "a restaurant with online ordering",
  "a portfolio with a paid clients area",
];

// Same length so the typing animation's index math stays valid even if
// the viewport crosses the breakpoint mid-cycle.
const INTENTS_MOBILE = [
  "a storefront",
  "a booking site",
  "a marketplace",
  "a restaurant",
  "a portfolio",
];

const MOBILE_QUERY = "(max-width: 600px)";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

const HOST = "wix-headless.dev";
const SKILL_PATH = "/skill.md";

const TYPE_MS = 38;
const ERASE_MS = 22;
const HOLD_MS = 1600;

export default function TryPrompt() {
  const isMobile = useIsMobile();
  const INTENTS = isMobile ? INTENTS_MOBILE : INTENTS_DESKTOP;
  const [intent, setIntent] = useState("");
  const [intentIndex, setIntentIndex] = useState(0);
  const [phase, setPhase] = useState<"type" | "hold" | "erase">("type");
  const [userText, setUserText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const paused = isFocused || userText.length > 0;

  useEffect(() => {
    if (paused) return;

    const target = INTENTS[intentIndex];

    if (phase === "type") {
      if (intent.length < target.length) {
        timerRef.current = window.setTimeout(
          () => setIntent(target.slice(0, intent.length + 1)),
          TYPE_MS,
        );
      } else {
        timerRef.current = window.setTimeout(() => setPhase("hold"), HOLD_MS);
      }
    } else if (phase === "hold") {
      setPhase("erase");
    } else {
      if (intent.length > 0) {
        timerRef.current = window.setTimeout(
          () => setIntent(intent.slice(0, -1)),
          ERASE_MS,
        );
      } else {
        setIntentIndex((i) => (i + 1) % INTENTS.length);
        setPhase("type");
      }
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [intent, intentIndex, phase, paused]);

  const placeholder = INTENTS[intentIndex];

  const copyText = useMemo(() => {
    const effectiveIntent = userText.trim() || placeholder;
    return `build ${effectiveIntent} using ${HOST}${SKILL_PATH}`;
  }, [userText, placeholder]);

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

  const focusInput = () => inputRef.current?.focus();

  const inputSize = Math.max(
    (userText || placeholder).length,
    10,
  ) + 1;

  return (
    <div className="tryprompt">
      <div className="tryprompt__box" onClick={focusInput}>
        <div className="tryprompt__line">
          <span className="tryprompt__body">
            <span className="tryprompt__static">build </span>
            {paused ? (
              <input
                ref={inputRef}
                className="tryprompt__intent-input"
                type="text"
                value={userText}
                placeholder={placeholder}
                size={inputSize}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                onChange={(e) => setUserText(e.target.value)}
                onFocus={(e) => {
                  setIsFocused(true);
                  if (userText) e.currentTarget.select();
                }}
                onBlur={() => setIsFocused(false)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCopy();
                  }
                }}
                aria-label="What do you want to build?"
              />
            ) : (
              <>
                <span className="tryprompt__intent">{intent}</span>
                <span className="tryprompt__caret" aria-hidden>|</span>
              </>
            )}
            <span className="tryprompt__suffix">
              <span className="tryprompt__static">using </span>
              <span className="tryprompt__host">{HOST}</span>
            </span>
          </span>
        </div>
        <button
          type="button"
          className={`tryprompt__copy ${copied ? "is-copied" : ""}`}
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          aria-label="Copy prompt"
          data-xray="copy-button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
