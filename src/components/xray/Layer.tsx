import { useEffect, useSyncExternalStore } from "react";
import { xrayStore, getServerSnapshot } from "./store";
import { registry } from "./registry";

export default function Layer() {
  const state = useSyncExternalStore(
    xrayStore.subscribe,
    xrayStore.get,
    getServerSnapshot,
  );

  useEffect(() => {
    if (state.isOn) {
      document.body.classList.add("xray-on");
    } else {
      document.body.classList.remove("xray-on");
    }
    return () => {
      document.body.classList.remove("xray-on");
    };
  }, [state.isOn]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!xrayStore.get().isOn) return;
      const el = (e.target as HTMLElement | null)?.closest("[data-xray]");
      if (!el) return;
      const id = el.getAttribute("data-xray");
      if (!id || !registry[id]) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      xrayStore.setEntry(id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (xrayStore.get().activeEntry) {
          xrayStore.setEntry(null);
        } else if (xrayStore.get().isOn) {
          xrayStore.setOn(false);
        }
      }
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.querySelectorAll<HTMLElement>("[data-xray]").forEach((el) => {
      const id = el.getAttribute("data-xray");
      if (!id) return;
      const entry = registry[id];
      if (!entry) return;
      el.setAttribute("data-xray-label", entry.capability);
    });
  }, [state.isOn]);

  const entry = state.activeEntry ? registry[state.activeEntry] : null;
  const open = Boolean(entry);

  return (
    <>
      <div
        className={`xray-drawer-scrim ${open ? "is-open" : ""}`}
        onClick={() => xrayStore.setEntry(null)}
        aria-hidden="true"
      />
      <aside
        className={`xray-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="xray-drawer-title"
        aria-hidden={!open}
      >
        {entry && (
          <div className="xray-drawer__inner">
            <header className="xray-drawer__head">
              <span className="xray-drawer__cap">{entry.capability}</span>
              <button
                type="button"
                className="xray-drawer__close"
                onClick={() => xrayStore.setEntry(null)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <h2 id="xray-drawer-title" className="xray-drawer__title">
              {entry.title}
            </h2>
            <p className="xray-drawer__summary">{entry.summary}</p>
            <div className="xray-drawer__code">
              {entry.codePath && (
                <div className="xray-drawer__codepath">{entry.codePath}</div>
              )}
              <pre>
                <code>{entry.code}</code>
              </pre>
            </div>
            <div className="xray-drawer__cta">
              <a
                className="xray-drawer__btn xray-drawer__btn--primary"
                href={entry.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5v5M14 2L7.5 8.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                className="xray-drawer__btn"
                href={entry.docsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Docs
              </a>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
