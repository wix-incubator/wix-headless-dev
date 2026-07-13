import { useEffect, useMemo, useRef, useState } from "react";
import { analytics } from "@wix/site";

// === Vibe-coding platform CTAs ===
const PLATFORMS = [
  { id: "base44",  label: "Base44" },
  { id: "lovable", label: "Lovable" },
  { id: "bolt",    label: "Bolt" },
  { id: "v0",      label: "v0" },
  { id: "manus",   label: "Manus" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

function getCreateProjectUrl(platformId: string, prompt: string): string {
  return `https://manage.wix.com/setup-headless-business?platform=${encodeURIComponent(platformId)}&prompt=${encodeURIComponent(prompt)}`;
}

function PlatformIcon({ id }: { id: PlatformId }) {
  switch (id) {
    case "base44":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
          <rect x="1" y="1" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
          <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
          <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
          <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" fill="currentColor" />
        </svg>
      );
    case "lovable":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
          <path d="M10 17S2 12 2 7a4.5 4.5 0 0 1 8-2.83A4.5 4.5 0 0 1 18 7c0 5-8 10-8 10z" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
          <path d="M11 2L3.5 11H9l-1 7 8.5-9H11V2z" />
        </svg>
      );
    case "v0":
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
          <path d="M10 2L18.5 17.5H1.5L10 2z" />
        </svg>
      );
    case "manus":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
          <path d="M3 16V4l7 8 7-8v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

const INTENTS_DESKTOP = [
  "a storefront for handmade ceramics",
  "a booking site for a yoga studio",
  "a restaurant with online ordering",
  "a portfolio with a paid clients area",
];

// Same length so the typing animation's index math stays valid even if
// the viewport crosses the breakpoint mid-cycle.
const INTENTS_MOBILE = [
  "a storefront",
  "a booking site",
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
  const [selectedPlatformId, setSelectedPlatformId] = useState<PlatformId | null>(null);
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
    return `build ${effectiveIntent} using https://${HOST}${SKILL_PATH}`;
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

  const handleCreate = () => {
    if (!selectedPlatformId) return;
    const url = getCreateProjectUrl(selectedPlatformId, copyText);
    window.open(url, "_blank", "noopener,noreferrer");
    analytics.buttonClicked();
  };

  const focusInput = () => inputRef.current?.focus();

  const inputSize = Math.max(
    (userText || placeholder).length,
    10,
  ) + 1;

  const selectedPlatform = selectedPlatformId
    ? PLATFORMS.find((p) => p.id === selectedPlatformId) ?? null
    : null;

  return (
    <div className="tryprompt">
      <div className="tryprompt__platforms">
        <span className="tryprompt__platforms-label">or launch on</span>
        <div className="platform-strip" role="group" aria-label="Choose a vibe coding platform">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`platform-btn${selectedPlatformId === p.id ? " is-selected" : ""}`}
              aria-pressed={selectedPlatformId === p.id}
              onClick={() =>
                setSelectedPlatformId(selectedPlatformId === p.id ? null : p.id)
              }
            >
              <span className="platform-btn__icon">
                <PlatformIcon id={p.id} />
              </span>
              <span className="platform-btn__label">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

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
                    selectedPlatform ? handleCreate() : handleCopy();
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
        {selectedPlatform ? (
          <button
            type="button"
            className="tryprompt__copy tryprompt__create"
            onClick={(e) => { e.stopPropagation(); handleCreate(); }}
            aria-label={`Create project on ${selectedPlatform.label}`}
          >
            {selectedPlatform.label}
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
              <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            className={`tryprompt__copy ${copied ? "is-copied" : ""}`}
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            aria-label="Copy prompt"
            data-xray="copy-button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
