// Silence  @wix/ricos's harmless React warning during SSR.
const e = console.error;
console.error = (...a: any[]) => { if (typeof a[0] === "string" && a[0].includes("useLayoutEffect does nothing on the server")) return; e(...a); };
