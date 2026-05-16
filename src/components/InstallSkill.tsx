import { useState } from "react";
import { analytics } from "@wix/site";

const INSTALL_CMD = "npx skills add wix/skills -s wix-headless";

export default function InstallSkill() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = INSTALL_CMD;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    analytics.buttonClicked();
  };

  return (
    <button
      type="button"
      className={`install-skill ${copied ? "is-copied" : ""}`}
      onClick={handleCopy}
      aria-label="Copy skill install command"
      data-xray="install-skill"
    >
      <span className="install-skill__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2.5v8" />
          <path d="M4.5 7L8 10.5 11.5 7" />
          <path d="M3 13h10" />
        </svg>
      </span>
      <span className="install-skill__label">
        {copied ? "Copied" : "Install skill"}
      </span>
    </button>
  );
}
