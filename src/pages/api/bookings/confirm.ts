import type { APIRoute } from "astro";
import { bookings } from "@wix/bookings";
import { auth } from "@wix/essentials";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { bookingId, revision, email, message } = body ?? {};
    if (!bookingId || !revision) {
      return new Response(
        JSON.stringify({ error: "bookingId and revision are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Anonymous-visitor bookings come back as `CREATED` because they lack
    // the BOOKINGS.OVERRIDE_AVAILABILITY scope — the SDK silently drops
    // any flag that would auto-confirm. Without confirmation no session is
    // minted, no email goes out. `auth.elevate` runs confirmBooking with
    // the site app's permissions, which can transition the booking.
    const elevatedConfirm = auth.elevate(bookings.confirmBooking);
    const res = await elevatedConfirm(bookingId, revision, {
      participantNotification: {
        notifyParticipants: true,
        ...(typeof message === "string" && message.trim()
          ? { message: message.trim() }
          : {}),
      },
    } as any);

    return new Response(
      JSON.stringify({
        status: (res as any)?.booking?.status ?? null,
        eventId: (res as any)?.booking?.bookedEntity?.slot?.eventId ?? null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "confirmBooking failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
