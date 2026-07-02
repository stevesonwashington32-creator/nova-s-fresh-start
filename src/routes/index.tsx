import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import diningRoom from "@/assets/dining-room.jpg";
import {
  createReservation,
  findReservationsByPhone,
  cancelReservationByPhone,
} from "@/lib/reservations.functions";
import { getPlaceReviews, type PlaceReview } from "@/lib/reviews.functions";
import { ThemeToggle } from "@/components/theme-toggle";

const reviewsQuery = queryOptions({
  queryKey: ["place-reviews"],
  queryFn: () => getPlaceReviews(),
  staleTime: 1000 * 60 * 30,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — Reserve Your Evening | Fine Dining, København" },
      { name: "description", content: "Reserve a table at Nova, an intimate fine dining restaurant in København. Seven-course seasonal tasting menu in a candlelit room. Est. 2022." },
      { name: "keywords", content: "fine dining København, restaurant reservation, tasting menu, Nova restaurant, Nordic cuisine" },
      { property: "og:title", content: "Nova — Reserve Your Evening" },
      { property: "og:description", content: "Seasonal tasting menu, candlelit room, intentional luxury. Reserve your evening at Nova." },
      { property: "og:image", content: diningRoom },
      { property: "og:url", content: "/" },
      { name: "twitter:image", content: diningRoom },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(reviewsQuery);
  },
  component: Index,
});

const TIMES = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
const PARTY = ["1", "2", "3", "4", "5", "6+"];

const COURSES = [
  { tag: "I. Earth", name: "Charred Leeks & Hazelnut Emulsion", note: "Wild garlic, toasted hazelnuts, brown butter" },
  { tag: "II. Sea", name: "Hand-Dived Scallops in Copper", note: "Brown butter, sea buckthorn, coastal herbs" },
  { tag: "III. Fire", name: "Dry-Aged Venison", note: "Pine needle smoke, fermented roots, juniper" },
  { tag: "IV. Hearth", name: "Burnt Honey & Cultured Cream", note: "Birchwood, sourdough crumb, bee pollen" },
];

type FoundReservation = {
  id: string;
  ref: string;
  reservation_date: string;
  reservation_time: string;
  status: string;
  guest_name: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function isPastTime(date: string, time: string) {
  if (!date || !time) return false;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d <= new Date();
}

const normalizePhone = (v: string) => String(v || "").replace(/\D/g, "");

function Index() {
  const [time, setTime] = useState("19:30");
  const [party, setParty] = useState("2");
  const [form, setForm] = useState({
    guest_name: "",
    phone: "",
    reservation_date: todayStr(),
    occasion: "",
    special_requests: "",
  });
  const [agreeLate, setAgreeLate] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  // Find/cancel state
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupSuccess, setLookupSuccess] = useState("");
  const [found, setFound] = useState<FoundReservation[]>([]);

  const create = useServerFn(createReservation);
  const findFn = useServerFn(findReservationsByPhone);
  const cancelFn = useServerFn(cancelReservationByPhone);

  const mut = useMutation({
    mutationFn: () => create({
      data: {
        guest_name: form.guest_name,
        phone: form.phone,
        reservation_date: form.reservation_date,
        reservation_time: time,
        party_size: party,
        occasion: form.occasion || null,
        special_requests: form.special_requests || null,
      },
    }),
    onSuccess: (r) => {
      setConfirmed(r.ref);
      setFormError("");
    },
  });

  const findMut = useMutation({
    mutationFn: (phone: string) => findFn({ data: { phone } }),
    onSuccess: (r) => {
      setFound(r.reservations as FoundReservation[]);
      if (!r.reservations.length) setLookupError("No upcoming reservation for that phone number.");
    },
    onError: (e: Error) => setLookupError(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id, phone: lookupPhone } }),
    onSuccess: (_d, id) => {
      setFound((list) => list.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
      setLookupSuccess("Reservation cancelled.");
    },
    onError: (e: Error) => setLookupError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.guest_name.trim()) return setFormError("Please enter your name.");
    if (normalizePhone(form.phone).length < 7) return setFormError("Please enter a valid phone number.");
    if (!form.reservation_date) return setFormError("Please select a date.");
    if (!time) return setFormError("Please choose a preferred time.");
    if (!party) return setFormError("Please select your party size.");
    if (!agreeLate) return setFormError("Please acknowledge the late arrival policy.");
    if (form.reservation_date === todayStr() && isPastTime(form.reservation_date, time)) {
      return setFormError("Please choose a future time for today.");
    }
    mut.mutate();
  }

  function handleFind() {
    setLookupError("");
    setLookupSuccess("");
    setFound([]);
    if (!lookupPhone.trim()) return setLookupError("Enter the phone number used for the booking.");
    findMut.mutate(lookupPhone.trim());
  }

  const isToday = form.reservation_date === todayStr();


  return (
    <div className="min-h-screen bg-cream text-ink selection:bg-sienna/20" style={{ fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-6 flex justify-between items-center mix-blend-difference text-paper">
        <a href="#" className="text-xs uppercase tracking-[0.35em] font-medium">Nova &mdash; Est. 2022</a>
        <div className="hidden md:flex gap-10 text-[10px] uppercase tracking-[0.25em] font-medium items-center">
          <a href="#menu" className="hover:text-sand transition-colors">Menu</a>
          <a href="#story" className="hover:text-sand transition-colors">Our Story</a>
          <a href="#reserve" className="hover:text-sand transition-colors">Reservations</a>
          <Link to="/auth" className="hover:text-sand transition-colors">Staff</Link>
          <ThemeToggle />
        </div>
        <div className="md:hidden"><ThemeToggle /></div>
      </nav>

      <main className="grid lg:grid-cols-2 min-h-screen">
        {/* Left: sticky atmospheric pane (always dark) */}
        <div className="relative h-[60vh] lg:h-screen lg:sticky lg:top-0 overflow-hidden bg-night">
          <img
            src={diningRoom}
            alt="Candlelit dining room at Nova with copper pans hanging above"
            width={1080}
            height={1920}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-night/30 via-transparent to-night/80" />
          <div className="absolute top-0 left-0 right-0 p-10 hidden lg:block">
            <span className="text-[10px] uppercase tracking-[0.4em] text-paper/60">Strandgade 93 — København</span>
          </div>
          <div className="absolute bottom-10 left-8 right-8 lg:left-12 lg:right-12 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl italic text-paper leading-[1.1] text-balance" style={{ fontFamily: "var(--font-display)" }}>
              &ldquo;A quiet dialogue between the land and the table.&rdquo;
            </h2>
            <p className="mt-4 text-[10px] uppercase tracking-[0.35em] text-paper/60">— Chef's Note</p>
          </div>
        </div>

        {/* Right: scrolling magazine column */}
        <div className="relative flex flex-col">
          <section className="px-8 lg:px-16 pt-32 pb-20 border-b animate-fade-in">
            <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold mb-6 block">Fine Dining · Est. 2022</span>
            <h1 className="text-[18vw] lg:text-[10rem] leading-[0.85] tracking-tight mb-8" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
              Nova
            </h1>
            <p className="max-w-[42ch] text-lg leading-relaxed text-ink/70 text-pretty">
              An exploration of fire, flora and the fleeting seasons. We welcome you to our table
              for an evening crafted with intention &mdash; <span className="italic" style={{ fontFamily: "var(--font-display)" }}>nothing rushed, nothing wasted.</span>
            </p>
            <a href="#reserve" className="mt-10 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-ink border-b border-current pb-1 hover:text-sienna transition-colors">
              Reserve an Evening
              <span aria-hidden>→</span>
            </a>
          </section>

          <section className="grid lg:grid-cols-2 border-b">
            <div id="menu" className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r">
              <div className="flex items-baseline justify-between mb-12">
                <h3 className="text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>The Tasting Menu</h3>
                <span className="text-[10px] uppercase tracking-widest text-ink/40">Autumn</span>
              </div>
              <div className="space-y-9">
                {COURSES.map((c) => (
                  <div key={c.tag} className="group">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-sienna">{c.tag}</span>
                    <h4 className="text-xl mt-1.5 group-hover:italic transition-all" style={{ fontFamily: "var(--font-display)" }}>{c.name}</h4>
                    <p className="text-sm text-ink/60 mt-1.5 leading-relaxed">{c.note}</p>
                  </div>
                ))}
              </div>
              <p className="mt-12 text-[11px] uppercase tracking-[0.2em] text-ink/40">Seven courses · 1,250 DKK per guest</p>
              <div className="mt-12 overflow-hidden">
                <img
                  src={plateDetail}
                  alt="A minimalist plated course with herb oil"
                  width={800}
                  height={1066}
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            </div>

            <div id="reserve" className="p-8 lg:p-12 bg-cream-soft">
              <div className="lg:sticky lg:top-24">
                <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold block mb-3">Reservation</span>
                <h3 className="text-4xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Reserve Your <span className="italic text-burnt">Evening</span>
                </h3>
                <p className="text-sm text-ink/60 mb-10 leading-relaxed">An intimate experience crafted for you.</p>

                {confirmed ? (
                  <div className="border border-sienna/40 bg-sienna/5 p-8 space-y-4 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-sienna">Reservation Received</p>
                    <h4 className="text-3xl italic" style={{ fontFamily: "var(--font-display)" }}>Thank you.</h4>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Your evening is held under reference <span className="text-sienna font-medium">{confirmed}</span>.
                      Our reception will call to confirm shortly.
                    </p>
                    <button onClick={() => setConfirmed(null)} className="text-[10px] uppercase tracking-[0.3em] border-b border-ink pb-1 hover:text-sienna hover:border-sienna">
                      Make another reservation
                    </button>
                  </div>
                ) : (
                <form className="space-y-7" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Name">
                      <input type="text" required maxLength={120} value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="Full name" className="w-full bg-transparent border-b py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none transition-colors" />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" required maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+45 32 96 32 97" className="w-full bg-transparent border-b py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none transition-colors" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date">
                      <input type="date" required min={todayStr()} value={form.reservation_date} onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} style={{ colorScheme: "dark" }} className="w-full bg-transparent border-b py-2 pr-2 text-sm focus:border-sienna outline-none transition-colors" />
                    </Field>
                    <Field label="Occasion (optional)">
                      <select
                        value={form.occasion}
                        onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                        style={{ colorScheme: "dark" }}
                        className="w-full appearance-none bg-transparent border-b py-2 pr-8 text-sm focus:border-sienna outline-none transition-colors bg-no-repeat bg-[right_0.25rem_center] bg-[length:1rem] [&>option]:bg-night [&>option]:text-paper"
                        // chevron via inline SVG so it works in both themes
                        // eslint-disable-next-line react/no-unknown-property
                      >
                        <option value="">Select occasion</option>
                        <option>Birthday Celebration</option>
                        <option>Anniversary</option>
                        <option>Marriage Proposal</option>
                        <option>Business Dinner</option>
                        <option>Date Night</option>
                        <option>Family Gathering</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Label>Preferred Time</Label>
                    <div className="flex flex-wrap gap-2">
                      {TIMES.map((t) => {
                        const disabled = isToday && isPastTime(form.reservation_date, t);
                        return (
                          <button key={t} type="button" disabled={disabled}
                            onClick={() => !disabled && setTime(t)}
                            className={"px-4 py-2 text-xs uppercase tracking-wider transition-all border " +
                              (disabled
                                ? "opacity-30 cursor-not-allowed line-through"
                                : time === t ? "bg-sienna text-paper border-sienna" : "text-ink/70 hover:border-sienna hover:text-sienna")}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label>Party Size</Label>
                    <div className="flex flex-wrap gap-2">
                      {PARTY.map((p) => (
                        <button key={p} type="button" onClick={() => setParty(p)}
                          className={"min-w-12 px-4 py-2 text-xs transition-all border " +
                            (party === p ? "bg-ink text-cream border-ink" : "text-ink/70 hover:border-ink hover:text-ink")}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Special Requests (optional)">
                    <textarea
                      value={form.special_requests} onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                      placeholder="Dietary restrictions, seating preferences, accessibility needs…"
                      className="w-full bg-transparent border-b py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none resize-none transition-colors"
                      rows={3} maxLength={1000}
                    />
                  </Field>

                  <label className="flex gap-3 text-[11px] text-ink/60 leading-relaxed border-l-2 border-sand/60 pl-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeLate}
                      onChange={(e) => setAgreeLate(e.target.checked)}
                      className="mt-0.5 accent-sienna"
                    />
                    <span>I understand that if I am more than 45 minutes late, my reservation may be canceled and the table reassigned.</span>
                  </label>

                  {(formError || mut.error) && (
                    <p className="text-xs text-burnt bg-burnt/10 border border-burnt/30 px-3 py-2">
                      {formError || (mut.error as Error)?.message}
                    </p>
                  )}

                  <button
                    type="submit" disabled={mut.isPending}
                    className="w-full bg-ink text-cream py-4 text-[11px] uppercase tracking-[0.3em] font-medium hover:bg-burnt transition-colors disabled:opacity-60"
                  >
                    {mut.isPending ? "Securing your table…" : "Confirm Reservation"}
                  </button>

                  <div className="pt-6 border-t space-y-6 text-[11px]">
                    <div>
                      <p className="uppercase tracking-widest text-ink/40 mb-1">Running late?</p>
                      <a href="tel:+2349039986098" className="text-sienna hover:text-burnt transition-colors">+234 903 998 6098</a>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-ink/40 mb-2">Cancel a reservation</p>
                      <p className="text-ink/50 mb-3">Use the phone number from your booking to find and cancel.</p>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={lookupPhone}
                          onChange={(e) => { setLookupPhone(e.target.value); setLookupError(""); setLookupSuccess(""); }}
                          placeholder="Phone number"
                          className="flex-1 bg-transparent border-b py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleFind}
                          disabled={findMut.isPending}
                          className="px-4 text-[10px] uppercase tracking-widest border border-ink/30 hover:border-sienna hover:text-sienna disabled:opacity-50"
                        >
                          {findMut.isPending ? "…" : "Find"}
                        </button>
                      </div>
                      {lookupError && <p className="mt-2 text-burnt">{lookupError}</p>}
                      {lookupSuccess && <p className="mt-2 text-sienna">{lookupSuccess}</p>}
                      {found.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {found.map((r) => (
                            <div key={r.id} className="flex items-center justify-between border border-ink/10 px-3 py-2">
                              <div>
                                <p className="text-sienna font-medium">{r.ref}</p>
                                <p className="text-ink/60">
                                  {new Date(r.reservation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {r.reservation_time}
                                </p>
                                <p className="text-ink/40 text-[10px] uppercase tracking-widest">Status: {r.status}</p>
                              </div>
                              {r.status !== "cancelled" && (
                                <button
                                  type="button"
                                  onClick={() => { if (confirm("Cancel this reservation?")) cancelMut.mutate(r.id); }}
                                  disabled={cancelMut.isPending}
                                  className="text-[10px] uppercase tracking-widest text-burnt hover:underline disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
                )}
              </div>
            </div>
          </section>


          <section id="story" className="px-8 lg:px-16 py-24 border-b">
            <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold mb-6 block">Our Story</span>
            <h3 className="text-4xl lg:text-5xl leading-[1.05] mb-8 max-w-[20ch]" style={{ fontFamily: "var(--font-display)" }}>
              Born from the <span className="italic text-burnt">embers</span>.
            </h3>
            <p className="max-w-[55ch] text-base leading-relaxed text-ink/70 mb-6">
              Nova began as a single hearth in a quiet courtyard. Four years on, we remain
              devoted to that first idea &mdash; that fire, patiently tended, can render
              the simplest ingredient into memory.
            </p>
            <p className="max-w-[55ch] text-base leading-relaxed text-ink/70">
              Our menu shifts with the season; our room holds twenty-four guests; our copper
              pans hang from the same iron rack they did on opening night.
            </p>
          </section>

          <footer className="bg-night text-paper p-10 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-5">
                <h5 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>Visit</h5>
                <p className="text-sm text-paper/60 leading-relaxed">
                  Strandgade 93<br />
                  1401 København, Denmark<br />
                  Tue–Sat · 18:00 – 23:00
                </p>
                <p className="text-sm text-paper/60">
                  <a href="tel:+2349039986098" className="hover:text-sand transition-colors">+234 903 998 6098</a>
                </p>
              </div>
              <div className="flex flex-col lg:items-end justify-between gap-6">
                <div className="lg:text-right">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-paper/40 mb-3">Letters from Nova</p>
                  <div className="flex border-b border-paper/20 w-full lg:w-72">
                    <input type="email" placeholder="Email address" className="bg-transparent py-2 text-xs outline-none w-full placeholder:text-paper/30" />
                    <button className="text-[10px] uppercase tracking-widest font-medium hover:text-sand transition-colors">Join</button>
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-paper/30">© 2026 Nova</p>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-[0.25em] text-ink/50 block mb-3">{children}</label>;
}
