import { useMemo, useState } from "react";
import { bookings } from "@wix/bookings";
import { submittedContact, notes } from "@wix/crm";

type Phase =
  | "pick"
  | "form"
  | "submitting"
  | "done"
  | "error"
  | "request"
  | "request-submitting"
  | "request-done";

type Slot = any;
type Service = any;
type StaffInfo = { name: string; imageUrl?: string };

type Props = {
  initialService?: Service | null;
  initialSlots?: Slot[];
  staffById?: Record<string, StaffInfo>;
};

const SLOTS_VISIBLE = 6;

function Avatar({ name, imageUrl, size = 22 }: { name?: string; imageUrl?: string; size?: number }) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
  return (
    <span
      className="book-avatar"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" />
      ) : (
        <span className="book-avatar__initials">{initials || "·"}</span>
      )}
    </span>
  );
}

export default function BookEngineer({
  initialService = null,
  initialSlots = [],
  staffById = {},
}: Props) {
  const hasData = !!initialService && initialSlots.length > 0;
  const [phase, setPhase] = useState<Phase>(hasData ? "pick" : "request");
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);

  const service = initialService;
  const slots = initialSlots;

  // Staff that actually appear in any slot's availableResources.
  const availableStaff = useMemo(() => {
    const ids = new Set<string>();
    for (const s of slots) {
      const list = s?.availableResources?.[0]?.resources ?? [];
      for (const r of list) {
        const id = r?._id ?? r?.id;
        if (id) ids.add(id);
      }
    }
    return Array.from(ids).map((id) => ({
      id,
      info: staffById[id] ?? { name: "Engineer" },
    }));
  }, [slots, staffById]);

  const visibleSlots = useMemo(() => {
    if (!filterStaffId) return slots;
    return slots.filter((s) => {
      const list = s?.availableResources?.[0]?.resources ?? [];
      return list.some((r: any) => (r?._id ?? r?.id) === filterStaffId);
    });
  }, [slots, filterStaffId]);

  const reset = () => {
    setSelectedSlot(null);
    setName("");
    setEmail("");
    setDescription("");
    setError(null);
    setShowAll(false);
    setFilterStaffId(null);
    setPhase(hasData ? "pick" : "request");
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase("request-submitting");
    setError(null);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || undefined;
      const msg = description.trim();
      const res: any = await submittedContact.appendOrCreateContact({
        info: {
          name: { first: firstName || "Guest", last: lastName },
          emails: { items: [{ email, tag: "MAIN" as any }] },
        },
        passThroughData: msg.slice(0, 300),
      } as any);
      const contactId = res?.contactId;
      if (contactId && msg) {
        try {
          await notes.createNote({
            contactId,
            text: `Meeting request via wix-headless.dev:\n\n${msg}`,
            type: "MEETING_SUMMARY",
          } as any);
        } catch {
          // notes may require elevated permissions; the contact is enough.
        }
      }
      setPhase("request-done");
    } catch (err: any) {
      setError(err?.message ?? "Couldn't send your request. Try again in a moment.");
      setPhase("request");
    }
  };

  const pickResource = (slot: Slot) => {
    const list = slot?.availableResources?.[0]?.resources ?? [];
    if (filterStaffId) {
      const match = list.find((r: any) => (r?._id ?? r?.id) === filterStaffId);
      if (match) return match;
    }
    return list[0];
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !service) return;
    setPhase("submitting");
    setError(null);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || undefined;
      const slotLocationType = (() => {
        switch (selectedSlot.location?.locationType) {
          case "BUSINESS": return "OWNER_BUSINESS";
          case "CUSTOM":   return "OWNER_CUSTOM";
          case "CUSTOMER": return "CUSTOM";
          default:         return "UNDEFINED";
        }
      })();
      const resource = pickResource(selectedSlot);
      const resourceId = resource?._id ?? resource?.id;
      const trimmedDescription = description.trim();
      await bookings.createBooking({
        bookedEntity: {
          slot: {
            serviceId: service._id,
            scheduleId: selectedSlot.scheduleId,
            startDate: selectedSlot.localStartDate ?? selectedSlot.startDate,
            endDate: selectedSlot.localEndDate ?? selectedSlot.endDate,
            timezone: selectedSlot.timezone ?? service.schedule?.timezone,
            location: {
              locationType: slotLocationType,
              ...(selectedSlot.location?.id && { _id: selectedSlot.location.id }),
            },
            ...(resourceId && { resource: { _id: resourceId } }),
          },
        },
        contactDetails: {
          firstName: firstName || "Guest",
          lastName,
          email,
        },
        totalParticipants: 1,
        ...(trimmedDescription && {
          participantNotification: {
            notifyParticipants: true,
            message: `What I want to build:\n${trimmedDescription}`,
          },
        }),
      } as any);
      setPhase("done");
    } catch (e: any) {
      setPhase("error");
      setError(e?.message ?? "Couldn't complete the booking. Please try again.");
    }
  };

  const formatSlot = (s: Slot | null): string => {
    const iso = s?.localStartDate ?? s?.startDate;
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Returns the staff to display for a slot — respects the current filter.
  const slotStaff = (s: Slot | null): { id: string; info: StaffInfo } | null => {
    const list = s?.availableResources?.[0]?.resources ?? [];
    if (filterStaffId) {
      const match = list.find((r: any) => (r?._id ?? r?.id) === filterStaffId);
      if (match) {
        const id = match._id ?? match.id;
        return { id, info: staffById[id] ?? { name: match.name } };
      }
    }
    const first = list[0];
    if (!first) return null;
    const id = first._id ?? first.id;
    return { id, info: staffById[id] ?? { name: first.name } };
  };

  if (phase === "request" || phase === "request-submitting") {
    return (
      <form className="book-inline book-inline--form" onSubmit={submitRequest}>
        <p className="book-inline__lede">
          No open slots in the next two weeks. Leave your details and we'll reach out with a time.
        </p>
        <div className="book-inline__row">
          <label className="book-inline__field">
            <span>Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={phase === "request-submitting"}
            />
          </label>
          <label className="book-inline__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={phase === "request-submitting"}
            />
          </label>
        </div>
        <label className="book-inline__field book-inline__field--wide">
          <span>What do you want to build? <em>optional</em></span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A storefront for handmade ceramics, a booking site for a yoga studio…"
            rows={3}
            maxLength={300}
            disabled={phase === "request-submitting"}
          />
        </label>
        {error && <p className="book-inline__error">{error}</p>}
        <div className="book-inline__actions book-inline__actions--end">
          <button
            type="submit"
            className="book-inline__submit"
            disabled={phase === "request-submitting"}
          >
            {phase === "request-submitting" ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    );
  }

  if (phase === "request-done") {
    return (
      <div className="book-inline__done">
        <p>
          Got it. We'll reach out to <strong>{email}</strong> with times that work.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    const who = slotStaff(selectedSlot);
    return (
      <div className="book-inline__done">
        <p>
          Booked <strong>{formatSlot(selectedSlot)}</strong>
          {who && <> with <strong>{who.info.name}</strong></>}.
          We'll send a confirmation to <strong>{email}</strong>.
        </p>
        <button type="button" className="book-inline__again" onClick={reset}>
          Book another time
        </button>
      </div>
    );
  }

  if (phase === "form" || phase === "submitting" || phase === "error") {
    const who = slotStaff(selectedSlot);
    return (
      <form className="book-inline book-inline--form" onSubmit={submit}>
        <p className="book-inline__lede">
          Booking <strong>{formatSlot(selectedSlot)}</strong>
          {who && (
            <>
              {" "}with{" "}
              <span className="book-inline__who-inline">
                <Avatar name={who.info.name} imageUrl={who.info.imageUrl} size={20} />
                <strong>{who.info.name}</strong>
              </span>
            </>
          )}
        </p>
        <div className="book-inline__row">
          <label className="book-inline__field">
            <span>Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              disabled={phase === "submitting"}
            />
          </label>
          <label className="book-inline__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={phase === "submitting"}
            />
          </label>
        </div>
        <label className="book-inline__field book-inline__field--wide">
          <span>What do you want to build? <em>optional</em></span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A storefront for handmade ceramics, a booking site for a yoga studio…"
            rows={3}
            maxLength={400}
            disabled={phase === "submitting"}
          />
        </label>
        {phase === "error" && error && (
          <p className="book-inline__error">{error}</p>
        )}
        <div className="book-inline__actions">
          <button
            type="button"
            className="book-inline__back"
            onClick={() => setPhase("pick")}
            disabled={phase === "submitting"}
          >
            ← Pick another time
          </button>
          <button
            type="submit"
            className="book-inline__submit"
            disabled={phase === "submitting"}
          >
            {phase === "submitting" ? "Booking…" : "Confirm booking"}
          </button>
        </div>
      </form>
    );
  }

  const slotsToRender = showAll ? visibleSlots : visibleSlots.slice(0, SLOTS_VISIBLE);
  return (
    <div className="book-inline">
      {availableStaff.length > 1 && (
        <div className="book-filter" role="tablist" aria-label="Filter by engineer">
          <button
            type="button"
            className={`book-filter__chip ${filterStaffId === null ? "is-on" : ""}`}
            onClick={() => { setFilterStaffId(null); setShowAll(false); }}
            role="tab"
            aria-selected={filterStaffId === null}
          >
            Any engineer
          </button>
          {availableStaff.map(({ id, info }) => (
            <button
              key={id}
              type="button"
              className={`book-filter__chip ${filterStaffId === id ? "is-on" : ""}`}
              onClick={() => { setFilterStaffId(id); setShowAll(false); }}
              role="tab"
              aria-selected={filterStaffId === id}
            >
              <Avatar name={info.name} imageUrl={info.imageUrl} size={20} />
              <span>{info.name}</span>
            </button>
          ))}
        </div>
      )}

      {slotsToRender.length === 0 ? (
        <p className="book-inline__empty">
          No upcoming slots for that engineer in the next two weeks.
        </p>
      ) : (
        <>
          <ul className="book-slots">
            {slotsToRender.map((slot, i) => {
              const who = slotStaff(slot);
              return (
                <li key={i}>
                  <button
                    type="button"
                    className="book-slots__slot"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setPhase("form");
                    }}
                  >
                    <span className="book-slots__time">{formatSlot(slot)}</span>
                    {who && (
                      <span className="book-slots__who">
                        <Avatar name={who.info.name} imageUrl={who.info.imageUrl} size={18} />
                        <span>with {who.info.name}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {!showAll && visibleSlots.length > SLOTS_VISIBLE && (
            <button
              type="button"
              className="book-inline__more"
              onClick={() => setShowAll(true)}
            >
              Show {visibleSlots.length - SLOTS_VISIBLE} more
            </button>
          )}
        </>
      )}
    </div>
  );
}
