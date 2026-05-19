const POSTHOG_KEY = import.meta.env.PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type CaptureParams = {
  event: string;
  distinctId: string;
  properties?: Record<string, unknown>;
};

export async function captureServerEvent(params: CaptureParams): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: params.event,
        distinct_id: params.distinctId,
        properties: params.properties ?? {},
      }),
    });
  } catch {
    // Analytics must never break the response.
  }
}
