import { useSyncExternalStore } from "react";
import { xrayStore, getServerSnapshot } from "./store";

export default function Toggle() {
  const state = useSyncExternalStore(
    xrayStore.subscribe,
    xrayStore.get,
    getServerSnapshot,
  );

  return (
    <button
      type="button"
      className={`xray-toggle ${state.isOn ? "is-on" : ""}`}
      onClick={() => xrayStore.toggle()}
      aria-pressed={state.isOn}
      aria-label="Toggle X-Ray mode — show how this site is built"
      title="Show how this site is built"
    >
      <span className="xray-toggle__glyph" aria-hidden="true">
        &lt;/&gt;
      </span>
      <span className="xray-toggle__label">X-Ray</span>
      <span className="xray-toggle__dot" aria-hidden="true" />
    </button>
  );
}
