import { useEffect, useMemo, useRef, useState } from "react";
import { submittedContact, notes } from "@wix/crm";
import { book, navigateToCheckout, BookResultType, type SelectedSlot } from "./bookingDriver";

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
type StaffInfo = { name: string; imageUrl?: string; description?: string };

type Props = {
  initialService?: Service | null;
  initialSlots?: Slot[];
  staffById?: Record<string, StaffInfo>;
};

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const dateHeaderFmt = (d: Date) =>
  d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeOnlyFmt = (d: Date) =>
  d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });

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
  const [filterStaffId, setFilterStaffId] = useState<string | null>(null);

  const daysRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateNavState = () => {
    const el = daysRef.current;
    if (!el) { setCanPrev(false); setCanNext(false); return; }
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollPage = (dir: 1 | -1) => {
    const el = daysRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const pickFilter = (id: string | null) => {
    setFilterStaffId(id);
    setSelectedSlot(null);
  };

  const service = initialService;
  const slots = initialSlots;

  const availableStaff = useMemo(() => {
    const ids = new Set<string>();
    for (const s of slots) {
      const list = s?.availableResources?.[0]?.resources ?? [];
      for (const r of list) {
        const id = r?._id ?? r?.id;
        if (id) ids.add(id);
      }
    }
    return Array.from(ids)
      .map((id) => ({ id, info: staffById[id] ?? { name: "Engineer" } }))
      .sort((a, b) =>
        a.info.name.localeCompare(b.info.name, undefined, { sensitivity: "base" }),
      );
  }, [slots, staffById]);

  const visibleSlots = useMemo(() => {
    if (!filterStaffId) return slots;
    return slots.filter((s) => {
      const list = s?.availableResources?.[0]?.resources ?? [];
      return list.some((r: any) => (r?._id ?? r?.id) === filterStaffId);
    });
  }, [slots, filterStaffId]);

  const slotsByDay = useMemo(() => {
    const groups = new Map<string, { date: Date; slots: Slot[] }>();
    for (const s of visibleSlots) {
      const iso = s?.localStartDate ?? s?.startDate;
      if (!iso) continue;
      const key = dayKey(iso);
      let bucket = groups.get(key);
      if (!bucket) {
        bucket = { date: new Date(iso), slots: [] };
        groups.set(key, bucket);
      }
      bucket.slots.push(s);
    }
    return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [visibleSlots]);

  useEffect(() => {
    const el = daysRef.current;
    if (!el) return;
    updateNavState();
    el.addEventListener("scroll", updateNavState, { passive: true });
    window.addEventListener("resize", updateNavState);
    return () => {
      el.removeEventListener("scroll", updateNavState);
      window.removeEventListener("resize", updateNavState);
    };
  }, [slotsByDay.length]);

  const reset = () => {
    setSelectedSlot(null);
    setName("");
    setEmail("");
    setDescription("");
    setError(null);
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
        }
      }
      setPhase("request-done");
    } catch (err: any) {
      setError(err?.message ?? "Couldn't send your request. Try again in a moment.");
      setPhase("request");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !service) return;
    setPhase("submitting");
    setError(null);
    try {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      const lastName = rest.join(" ") || undefined;
      const trimmedDescription = description.trim();

      const slot: SelectedSlot = {
        serviceType: "APPOINTMENT",
        serviceId: service._id,
        localStartDate: selectedSlot.localStartDate ?? selectedSlot.startDate,
        localEndDate: selectedSlot.localEndDate ?? selectedSlot.endDate,
        timezone: selectedSlot.timezone ?? service.schedule?.timezone,
        scheduleId: selectedSlot.scheduleId,
        locationId: selectedSlot.location?._id ?? selectedSlot.location?.id,
        locationType: selectedSlot.location?.locationType,
        ...(filterStaffId && {
          resource: { _id: filterStaffId, name: staffById[filterStaffId]?.name },
        }),
      };

      const result = await book({
        service,
        slot,
        timezone: slot.timezone,
        formSubmission: {
          first_name: firstName || "Guest",
          ...(lastName && { last_name: lastName }),
          email,
        },
      });

      if (result.type === BookResultType.CheckoutRequired) {
        await navigateToCheckout(result.cartId, window.location.href);
        return;
      }

      try {
        const allResources =
          (selectedSlot?.availableResources?.[0]?.resources ?? []) as any[];
        const otherNames =
          filterStaffId === null
            ? allResources
                .map((r) => staffById[r?._id ?? r?.id]?.name ?? r?.name)
                .filter(Boolean)
            : [];
        const lines: string[] = [];
        if (trimmedDescription) lines.push(`What I want to build:\n${trimmedDescription}`);
        if (otherNames.length > 0)
          lines.push(`"Any engineer" booking — staff free at this slot: ${otherNames.join(", ")}.`);
        if (lines.length > 0) {
          const contactRes: any = await submittedContact.appendOrCreateContact({
            info: {
              name: { first: firstName || "Guest", last: lastName },
              emails: { items: [{ email, tag: "MAIN" as any }] },
            },
          } as any);
          const contactId = contactRes?.contactId;
          if (contactId) {
            await notes.createNote({
              contactId,
              text: lines.join("\n\n"),
              type: "MEETING_SUMMARY",
            } as any);
          }
        }
      } catch {
      }

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
            rows={5}
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
        <span className="book-inline__done-cap">Request received</span>
        <h3 className="book-inline__done-title">We'll be in touch.</h3>
        <p className="book-inline__done-sub">
          Heading to <strong>{email}</strong> with times that work.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    const who = slotStaff(selectedSlot);
    return (
      <div className="book-inline__done">
        <span className="book-inline__done-cap">Confirmed</span>
        <h3 className="book-inline__done-title">
          {formatSlot(selectedSlot)}
          {who && <> · {who.info.name}</>}
        </h3>
        <p className="book-inline__done-sub">
          An invitation will be sent to <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  if (phase === "form" || phase === "submitting" || phase === "error") {
    const who = slotStaff(selectedSlot);
    return (
      <form className="book-inline book-inline--form" onSubmit={submit}>
        <p className="book-inline__lede">
          <span className="book-inline__lede-line">
            Booking <strong>{formatSlot(selectedSlot)}</strong>
          </span>
          {who && (
            <span className="book-inline__lede-line">
              With <strong>{who.info.name}</strong>
            </span>
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
            rows={5}
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

  return (
    <div className="book-inline">
      {slotsByDay.length === 0 ? (
        <p className="book-inline__empty">
          No upcoming slots for that engineer in the next two weeks.
        </p>
      ) : (
        <div className="book-days-wrap">
          <div className="book-days__top">
            {availableStaff.length > 1 && (
              <div className="book-filter" role="tablist" aria-label="Filter by engineer">
                <button
                  type="button"
                  className={`book-filter__chip ${filterStaffId === null ? "is-on" : ""}`}
                  onClick={() => pickFilter(null)}
                  role="tab"
                  aria-selected={filterStaffId === null}
                >
                  <span className="book-filter__chip-text">
                    <span className="book-filter__chip-name">Any Engineer</span>
                  </span>
                </button>
                {availableStaff.map(({ id, info }) => (
                  <button
                    key={id}
                    type="button"
                    className={`book-filter__chip ${filterStaffId === id ? "is-on" : ""}`}
                    onClick={() => pickFilter(id)}
                    role="tab"
                    aria-selected={filterStaffId === id}
                  >
                    <Avatar name={info.name} imageUrl={info.imageUrl} size={28} />
                    <span className="book-filter__chip-text">
                      <span className="book-filter__chip-name">{info.name}</span>
                      {info.description && (
                        <span className="book-filter__chip-role">{info.description}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="book-days__nav-row">
              <button
                type="button"
                className="book-days__nav"
                onClick={() => scrollPage(-1)}
                disabled={!canPrev}
                aria-label="Previous days"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 12L6 8L10 4" />
                </svg>
              </button>
              <button
                type="button"
                className="book-days__nav"
                onClick={() => scrollPage(1)}
                disabled={!canNext}
                aria-label="Next days"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 4L10 8L6 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="book-days" ref={daysRef}>
            {slotsByDay.map(({ date, slots: daySlots }) => (
            <div className="book-day" key={date.toISOString()}>
              <h3 className="book-day__header">{dateHeaderFmt(date)}</h3>
              <ul className="book-day__slots">
                {daySlots.slice(0, 3).map((slot, i) => {
                  const start = new Date(slot.localStartDate ?? slot.startDate);
                  const who = slotStaff(slot);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        className={`book-day__slot ${selectedSlot === slot ? "is-selected" : ""}`}
                        onClick={() => setSelectedSlot(slot)}
                        aria-pressed={selectedSlot === slot}
                        aria-label={who ? `${timeOnlyFmt(start)} with ${who.info.name}` : timeOnlyFmt(start)}
                      >
                        <span>{timeOnlyFmt(start)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          </div>
        </div>
      )}

      {slotsByDay.length > 0 && (
        <div className="book-inline__actions book-inline__actions--end">
          <button
            type="button"
            className="book-inline__submit"
            onClick={() => setPhase("form")}
            disabled={!selectedSlot}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
