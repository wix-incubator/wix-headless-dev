import { bookings } from "@wix/bookings";
import { createCart, calculateCart, placeOrder } from "@wix/auto_sdk_ecom_cart-v-2";
import { redirects } from "@wix/redirects";

export const BOOKING_APP_ID = "13d21c63-b5ec-5912-8397-c3a5ddb27a97";
export const STAFF_MEMBER_RESOURCE_TYPE_ID = "1cd44cf8-756f-41c3-bd90-3e2ffcaf1155";

export type FormValues = Record<string, unknown>;

export interface SelectedSlot {
  serviceType: "APPOINTMENT" | "CLASS";
  serviceId: string;
  localStartDate: string;
  localEndDate: string;
  timezone: string;
  scheduleId?: string;
  locationId?: string;
  locationType?: string;
  eventId?: string;
  resource?: { _id: string; name?: string };
}

export interface BookParams {
  service: any;
  slot: SelectedSlot;
  formSubmission: FormValues;
  timezone: string;
  totalParticipants?: number;
  selectedPaymentOption?: "ONLINE" | "OFFLINE";
}

export const BookResultType = {
  CheckoutRequired: "checkout_required",
  CheckoutSkipped: "checkout_skipped",
} as const;
export type BookResult =
  | { type: typeof BookResultType.CheckoutRequired; cartId: string }
  | { type: typeof BookResultType.CheckoutSkipped; orderId: string };

function deriveSelectedPaymentOption(service: any): "ONLINE" | "OFFLINE" {
  const options = service?.payment?.options;
  if (options?.online && !options?.inPerson) return "ONLINE";
  if (!options?.online && options?.inPerson) return "OFFLINE";
  return "ONLINE";
}

function mapLocationType(slotType?: string): string {
  switch (slotType) {
    case "BUSINESS":
      return "OWNER_BUSINESS";
    case "CUSTOMER":
      return "CUSTOM";
    case "CUSTOM":
      return "OWNER_CUSTOM";
    default:
      return "OWNER_BUSINESS";
  }
}

function buildBookingRequest(params: BookParams) {
  const { service, slot, formSubmission, timezone } = params;
  const resource = slot.resource;

  return {
    booking: {
      selectedPaymentOption:
        params.selectedPaymentOption ?? deriveSelectedPaymentOption(service),
      totalParticipants: params.totalParticipants || 1,
      bookedEntity: {
        slot: {
          serviceId: slot.serviceId,
          scheduleId: slot.scheduleId ?? undefined,
          startDate: slot.localStartDate,
          endDate: slot.localEndDate,
          timezone,
          eventId: slot.eventId ?? undefined,
          ...(resource
            ? { resource: { _id: resource._id, name: resource.name } }
            : {
                resourceSelections: [
                  {
                    resourceTypeId: STAFF_MEMBER_RESOURCE_TYPE_ID,
                    selectionMethod: "ANY_RESOURCE",
                  },
                ],
              }),
          location:
            slot.locationId || slot.locationType
              ? {
                  ...(slot.locationId ? { _id: slot.locationId } : {}),
                  locationType: mapLocationType(slot.locationType),
                }
              : { locationType: "OWNER_BUSINESS" },
        },
      },
    },
    participantNotification: {
      metadata: { channels: "EMAIL,SMS" },
      notifyParticipants: true,
    },
    sendSmsReminder: true,
    formSubmission,
  };
}

function buildCartRequest(args: {
  bookingIds: string[];
  contactDetails?: any;
  businessLocationId?: string | null;
}) {
  const cart: any = { source: { channelType: "WEB" } };
  if (args.businessLocationId)
    cart.businessInfo = { locationId: args.businessLocationId };
  if (args.contactDetails) {
    cart.customerInfo = args.contactDetails.email
      ? { email: args.contactDetails.email }
      : {};
    if (args.contactDetails.fullAddress?.country) {
      cart.deliveryInfo = { address: { ...args.contactDetails.fullAddress } };
      cart.paymentInfo = {
        billingAddress: { ...args.contactDetails.fullAddress },
      };
    }
  }
  return {
    catalogItems: args.bookingIds.map((id) => ({
      quantity: 1,
      catalogReference: { catalogItemId: id, appId: BOOKING_APP_ID },
    })),
    cart,
  };
}

function isCheckoutRequired(cart: any, summary: any, service: any): boolean {
  if (service?.bookingPolicy?.cancellationFeePolicy?.enabled) return true;
  const total = Number(summary?.priceSummary?.total?.amount ?? 0);
  if (total === 0) return false;
  if (cart?.lineItems?.[0]?.paymentConfig?.paymentOption === "FULL_PAYMENT_OFFLINE")
    return false;
  return true;
}

function canBook(params: BookParams): boolean {
  const slotOk =
    !!params.slot &&
    !!params.slot.localStartDate &&
    (params.slot.serviceType === "CLASS"
      ? !!params.slot.eventId
      : !!params.slot.scheduleId);
  return slotOk && params.formSubmission != null;
}

export async function book(params: BookParams): Promise<BookResult> {
  if (!canBook(params))
    throw new Error("Cannot book: missing slot or form submission");

  const req = buildBookingRequest(params);
  const created = await bookings.createBooking(req.booking as any, {
    participantNotification: req.participantNotification,
    sendSmsReminder: req.sendSmsReminder,
    formSubmission: req.formSubmission as any,
  });
  const bookingId = created?.booking?._id;
  if (!bookingId) throw new Error("Failed to create booking");
  const contactDetails = created?.booking?.contactDetails;

  const businessLocationId = params.slot.locationId ?? undefined;
  const cart = await createCart(
    buildCartRequest({ bookingIds: [bookingId], contactDetails, businessLocationId }),
  );
  const cartId = cart?._id;
  if (!cartId) throw new Error("Failed to create cart");

  const { cart: calculatedCart, summary } = await calculateCart(cartId);
  if (!calculatedCart || !summary) throw new Error("Failed to calculate cart");

  if (isCheckoutRequired(calculatedCart, summary, params.service)) {
    return { type: BookResultType.CheckoutRequired, cartId };
  }
  const order = await placeOrder(cartId);
  const orderId = order?.orderId;
  if (!orderId) throw new Error("Failed to place order");
  return { type: BookResultType.CheckoutSkipped, orderId };
}

export async function navigateToCheckout(
  cartId: string,
  postFlowUrl: string,
): Promise<void> {
  const { redirectSession } = await redirects.createRedirectSession({
    ecomCheckout: { checkoutId: cartId },
    callbacks: { postFlowUrl },
  });
  if (redirectSession?.fullUrl) {
    window.location.href = redirectSession.fullUrl;
  } else {
    throw new Error("Failed to create redirect session");
  }
}
