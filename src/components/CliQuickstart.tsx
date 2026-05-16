import { useEffect, useMemo, useState } from "react";

const PMS = [
  { id: "npm", label: "npm", command: "create @wix/new@latest headless" },
  { id: "yarn", label: "yarn", command: "create @wix/new headless" },
] as const;

type PmId = (typeof PMS)[number]["id"];

const STORAGE_KEY = "cli-pm";

export default function CliQuickstart() {
  const [pm, setPm] = useState<PmId>("npm");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && PMS.some((p) => p.id === stored)) {
        setPm(stored as PmId);
      }
    } catch {}
  }, []);

  const command = useMemo(() => `${pm} ${PMS.find((p) => p.id === pm)?.command}`, [pm]);

  const pickPm = (id: PmId) => {
    setPm(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="cli">
      <div className="cli__tabs" role="tablist" aria-label="Package manager">
        {PMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pm === id}
            className={`cli__tab ${pm === id ? "is-active" : ""}`}
            onClick={() => pickPm(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cli__box" onClick={handleCopy} data-xray="wix-cli">
        <div className="cli__line">
          <span className="cli__prefix" aria-hidden="true">$</span>
          <code className="cli__command">{`${pm} ${PMS.find((p) => p.id === pm)?.command}`}</code>
        </div>
        <button
          type="button"
          className={`cli__copy ${copied ? "is-copied" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          aria-label="Copy command"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
