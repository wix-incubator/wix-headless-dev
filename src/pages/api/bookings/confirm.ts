import type { APIRoute } from "astro";
import { auth, httpClient } from "@wix/essentials";

export const prerender = false;

// Trial: route anonymous bookings through Confirm Or Decline with
// `paymentStatus: PAID` instead of Confirm Booking. The hypothesis is that
// Bookings only fires the customer confirmation email when the booking
// transitions via the paid path — confirmBooking sets status without
// touching payment status, so the email template never gets the trigger
// it's waiting for.
//
// The endpoint isn't in @wix/bookings yet, so we hit REST directly via
// the auth-aware fetch and elevate it (anonymous visitors lack
// BOOKINGS.BOOKING_CONFIRM_OR_DECLINE).
const elevatedFetch = auth.elevate(httpClient.fetchWithAuth);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { bookingId } = body ?? {};
    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const url = `https://www.wixapis.com/bookings/v2/confirmation/${encodeURIComponent(
      bookingId,
    )}:confirmOrDecline`;
    const res = await elevatedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: text || `confirmOrDecline failed (${res.status})` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const data: any = await res.json().catch(() => ({}));
    return new Response(
      JSON.stringify({
        status: data?.booking?.status ?? null,
        paymentStatus: data?.booking?.paymentStatus ?? null,
        eventId: data?.booking?.bookedEntity?.slot?.eventId ?? null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "confirmOrDecline failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
