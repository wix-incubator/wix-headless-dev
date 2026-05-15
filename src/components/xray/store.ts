type XRayState = {
  isOn: boolean;
  activeEntry: string | null;
};

const STORAGE_KEY = "xray:on";
let state: XRayState = { isOn: false, activeEntry: null };
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    state.isOn = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {}
}

function emit() {
  listeners.forEach((fn) => fn());
}

export const xrayStore = {
  get(): XRayState {
    return state;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  setOn(isOn: boolean) {
    state = { ...state, isOn, activeEntry: isOn ? state.activeEntry : null };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, isOn ? "1" : "0");
      } catch {}
    }
    emit();
  },
  toggle() {
    this.setOn(!state.isOn);
  },
  setEntry(id: string | null) {
    state = { ...state, activeEntry: id };
    emit();
  },
};

const serverSnapshot: XRayState = { isOn: false, activeEntry: null };
export const getServerSnapshot = (): XRayState => serverSnapshot;
