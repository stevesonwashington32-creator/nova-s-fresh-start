import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Clock } from "lucide-react";
import diningRoom from "@/assets/dining-room.jpg";
import {
  createReservation,
  findReservationsByPhone,
  cancelReservationByPhone,
} from "@/lib/reservations.functions";
import { placeReviews, type PlaceReview } from "@/data/reviews";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova Restaurant and Bar — Reserve a Table in Asaba" },
      { name: "description", content: "Reserve a table at Nova Restaurant and Bar on Okpanam Road, Asaba. Fine dining and drinks — open all day, book any time that suits you." },
      { name: "keywords", content: "Nova Restaurant and Bar, Asaba restaurant, Okpanam Road, Delta State dining, restaurant reservation Asaba" },
      { property: "og:title", content: "Nova Restaurant and Bar — Asaba" },
      { property: "og:description", content: "Fine dining and drinks on Okpanam Road, Asaba. Reserve any time of day." },
      { property: "og:image", content: diningRoom },
      { property: "og:url", content: "/" },
      { name: "twitter:image", content: diningRoom },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const TIME_GROUPS: { label: string; times: string[] }[] = [
  { label: "Morning", times: ["08:00", "09:00", "10:00", "11:00"] },
  { label: "Afternoon", times: ["12:00", "13:00", "14:00", "15:00", "16:00"] },
  { label: "Evening", times: ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"] },
];
const PARTY = ["1", "2", "3", "4", "5", "6+"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}


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
  const [time, setTime] = useState("13:00");
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
  const [confirmed, setConfirmed] = useState<null | {
    ref: string;
    guest_name: string;
    phone: string;
    occasion: string;
    party: string;
    reservation_date: string;
    reservation_time: string;
  }>(null);


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
      setConfirmed({
        ref: r.ref,
        guest_name: form.guest_name,
        phone: form.phone,
        occasion: form.occasion || "—",
        party,
        reservation_date: form.reservation_date,
        reservation_time: time,
      });
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
          <a href="#story" className="hover:text-sand transition-colors">Our Story</a>
          <a href="#reserve" className="hover:text-sand transition-colors">Reservations</a>
        </div>
      </nav>

      <main className="grid lg:grid-cols-2 min-h-screen">
        {/* Left: sticky reviews slider */}
        <div className="relative h-[60vh] lg:h-screen lg:sticky lg:top-0 overflow-hidden bg-night">
          <ReviewsSlider />
        </div>

        {/* Right: scrolling magazine column */}
        <div className="relative flex flex-col">
          <section className="px-8 lg:px-16 pt-32 pb-20 border-b animate-fade-in">
            <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold mb-6 block">Fine Dining · Est. 2022</span>
            <h1 className="text-[18vw] lg:text-[10rem] leading-[0.85] tracking-tight mb-8" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
              Nova
            </h1>
            <p className="max-w-[42ch] text-lg leading-relaxed text-ink/70 text-pretty">
              A calm room on Okpanam Road for lunch, drinks and long dinners.
              We welcome you to our table — <span className="italic" style={{ fontFamily: "var(--font-display)" }}>any time of day.</span>
            </p>
            <a href="#reserve" className="mt-10 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-ink border-b border-current pb-1 hover:text-sienna transition-colors">
              Reserve a Table
              <span aria-hidden>→</span>
            </a>
          </section>

          <section className="border-b">
            <div id="reserve" className="p-8 lg:p-12 bg-cream-soft">
              <div className="max-w-2xl mx-auto">
                <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold block mb-3">Reservation</span>
                <h3 className="text-4xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Reserve Your <span className="italic text-burnt">Table</span>
                </h3>
                <p className="text-sm text-ink/60 mb-10 leading-relaxed">Breakfast, lunch, drinks or dinner — book any time of day.</p>


                {confirmed ? (
                  <div className="border border-sienna/40 bg-sienna/5 p-8 space-y-5 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-sienna">Reservation Received</p>
                    <h4 className="text-3xl italic" style={{ fontFamily: "var(--font-display)" }}>Thank you, {confirmed.guest_name.split(" ")[0]}.</h4>
                    <p className="text-sm text-ink/70 leading-relaxed">
                      Your table is held. Our reception will call to confirm shortly.
                    </p>

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-sienna/20 pt-5">
                      <ConfRow k="Reference" v={<span className="text-sienna font-medium tracking-widest">{confirmed.ref}</span>} />
                      <ConfRow k="Name" v={confirmed.guest_name} />
                      <ConfRow k="Phone" v={confirmed.phone} />
                      <ConfRow k="Party" v={`${confirmed.party} ${confirmed.party === "1" ? "guest" : "guests"}`} />
                      <ConfRow k="Date" v={new Date(confirmed.reservation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} />
                      <ConfRow k="Time" v={formatTime(confirmed.reservation_time)} />
                      <div className="col-span-2">
                        <ConfRow k="Occasion" v={confirmed.occasion} />
                      </div>
                    </dl>

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
                    <Select value={time} onValueChange={setTime}>
                      <SelectTrigger className="w-full h-11 border-0 border-b border-ink/20 rounded-none bg-transparent px-0 shadow-none focus:border-sienna focus:ring-0">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-ink/50" />
                          <SelectValue placeholder="Choose a time" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {TIME_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel className="text-[10px] uppercase tracking-[0.25em] text-ink/40">
                              {group.label}
                            </SelectLabel>
                            {group.times.map((t) => {
                              const disabled = isToday && isPastTime(form.reservation_date, t);
                              return (
                                <SelectItem key={t} value={t} disabled={disabled}>
                                  {formatTime(t)}
                                </SelectItem>
                              );
                            })}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
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
              Nova opened its doors on Okpanam Road with a single idea &mdash; a warm,
              considered room where Asaba could gather from morning coffee to a late
              nightcap, without ever feeling rushed.
            </p>
            <p className="max-w-[55ch] text-base leading-relaxed text-ink/70">
              Our kitchen serves through the day; our bar keeps company into the night;
              our tables are yours for as long as you'd like them.
            </p>

          </section>

          <footer className="bg-night text-paper p-10 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-5">
                <h5 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>Visit</h5>
                <p className="text-sm text-paper/60 leading-relaxed">
                  84 Okpanam Road<br />
                  Opp. Legislative Quarters, GRA<br />
                  Asaba, Delta State, Nigeria<br />
                  Open daily · 08:00 – 23:00
                </p>

                <p className="text-sm text-paper/60">
                  <a href="tel:+2349039986098" className="hover:text-sand transition-colors">+234 903 998 6098</a>
                </p>
              </div>
              <div className="flex lg:items-end justify-end">
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

function ReviewsSlider() {
  const data = placeReviews;
  const reviews = data.reviews;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 40 });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || reviews.length <= 1) return;
    const id = setInterval(() => emblaApi.scrollNext(), 10000);
    return () => clearInterval(id);
  }, [emblaApi, reviews.length]);

  return (
    <>
      {/* Static background */}
      <img src={diningRoom} alt="Nova dining room" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-night/50 via-night/60 to-night/90" />

      <div className="absolute top-0 left-0 right-0 p-8 lg:p-10 flex items-center justify-between z-10">
        <span className="text-[10px] uppercase tracking-[0.4em] text-paper/70">Guest Reviews · Google</span>
        {reviews.length > 0 && (
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/60">
            ★ {data.rating.toFixed(1)} · {data.userRatingCount}
          </span>
        )}
      </div>

      {reviews.length > 0 ? (
        <>
          <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {reviews.map((r, i) => (
                <ReviewSlide key={i} review={r} />
              ))}
            </div>
          </div>

          {reviews.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={"h-[2px] transition-all " + (i === selected ? "w-8 bg-paper" : "w-4 bg-paper/30 hover:bg-paper/60")}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-10">
          <p className="text-[10px] uppercase tracking-[0.4em] text-paper/60 mb-4">Guest Reviews</p>
          <p className="text-paper/90 text-lg italic max-w-[32ch]" style={{ fontFamily: "var(--font-display)" }}>
            No reviews found yet — be the first to share your evening with us.
          </p>
        </div>
      )}
    </>
  );
}

function ReviewSlide({ review }: { review: PlaceReview }) {
  return (
    <div className="relative flex-[0_0_100%] min-w-0 h-full">
      <div className="relative h-full flex flex-col items-center justify-center px-8 lg:px-16 text-center">
        <div className="flex gap-1 mb-6 text-sienna text-sm tracking-widest">
          {"★".repeat(Math.max(1, Math.min(5, review.rating)))}
        </div>
        <blockquote
          className="text-paper text-xl lg:text-2xl italic leading-relaxed max-w-[38ch] text-balance line-clamp-[10]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          &ldquo;{review.text}&rdquo;
        </blockquote>
        <div className="mt-8 flex flex-col items-center gap-2">
          {review.authorPhoto && (
            <img
              src={review.authorPhoto}
              alt={review.author}
              className="w-10 h-10 rounded-full object-cover border border-paper/20"
              loading="lazy"
            />
          )}
          <p className="text-[11px] uppercase tracking-[0.35em] text-paper font-medium">{review.author}</p>
          {review.relativeTime && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-paper/50">{review.relativeTime}</p>
          )}
        </div>
      </div>
    </div>
  );
}

