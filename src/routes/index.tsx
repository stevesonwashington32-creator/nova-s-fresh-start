import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import diningRoom from "@/assets/dining-room.jpg";
import plateDetail from "@/assets/plate-detail.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova — Reserve Your Evening" },
      { name: "description", content: "Nova is an intimate fine dining restaurant. Reserve a table for an evening of seasonal tasting and quiet luxury." },
      { property: "og:title", content: "Nova — Fine Dining, Est. 2022" },
      { property: "og:description", content: "Reserve an evening at Nova. Seasonal tasting menu, candlelit room, intentional luxury." },
      { property: "og:image", content: diningRoom },
      { name: "twitter:image", content: diningRoom },
    ],
  }),
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

function Index() {
  const [time, setTime] = useState("19:30");
  const [party, setParty] = useState("2");

  return (
    <div className="min-h-screen bg-cream text-ink selection:bg-sienna/20" style={{ fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-10 py-6 flex justify-between items-center mix-blend-difference text-cream">
        <a href="#" className="text-xs uppercase tracking-[0.35em] font-medium">Nova &mdash; Est. 2022</a>
        <div className="hidden md:flex gap-10 text-[10px] uppercase tracking-[0.25em] font-medium">
          <a href="#menu" className="hover:text-sand transition-colors">Menu</a>
          <a href="#story" className="hover:text-sand transition-colors">Our Story</a>
          <a href="#reserve" className="hover:text-sand transition-colors">Reservations</a>
        </div>
      </nav>

      <main className="grid lg:grid-cols-2 min-h-screen">
        {/* Left: sticky atmospheric pane */}
        <div className="relative h-[60vh] lg:h-screen lg:sticky lg:top-0 overflow-hidden bg-ink">
          <img
            src={diningRoom}
            alt="Candlelit dining room at Nova with copper pans hanging above"
            width={1080}
            height={1920}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/80" />
          <div className="absolute top-0 left-0 right-0 p-10 hidden lg:block">
            <span className="text-[10px] uppercase tracking-[0.4em] text-cream/60">Strandgade 93 — København</span>
          </div>
          <div className="absolute bottom-10 left-8 right-8 lg:left-12 lg:right-12 animate-fade-in">
            <h2 className="text-3xl lg:text-4xl italic text-cream leading-[1.1] text-balance" style={{ fontFamily: "var(--font-display)" }}>
              &ldquo;A quiet dialogue between the land and the table.&rdquo;
            </h2>
            <p className="mt-4 text-[10px] uppercase tracking-[0.35em] text-cream/60">— Chef's Note</p>
          </div>
        </div>

        {/* Right: scrolling magazine column */}
        <div className="relative flex flex-col">
          {/* Brand identity */}
          <section className="px-8 lg:px-16 pt-32 pb-20 border-b border-ink/10 animate-fade-in">
            <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold mb-6 block">Fine Dining · Est. 2022</span>
            <h1 className="text-[18vw] lg:text-[10rem] leading-[0.85] tracking-tight mb-8" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>
              Nova
            </h1>
            <p className="max-w-[42ch] text-lg leading-relaxed text-ink/70 text-pretty">
              An exploration of fire, flora and the fleeting seasons. We welcome you to our table
              for an evening crafted with intention &mdash; <span className="italic" style={{ fontFamily: "var(--font-display)" }}>nothing rushed, nothing wasted.</span>
            </p>
            <a href="#reserve" className="mt-10 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-ink border-b border-ink pb-1 hover:text-sienna hover:border-sienna transition-colors">
              Reserve an Evening
              <span aria-hidden>→</span>
            </a>
          </section>

          {/* Menu + Reservation magazine split */}
          <section className="grid lg:grid-cols-2 border-b border-ink/10">
            {/* Menu */}
            <div id="menu" className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-ink/10">
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

            {/* Reservation */}
            <div id="reserve" className="p-8 lg:p-12 bg-cream-soft">
              <div className="lg:sticky lg:top-24">
                <span className="text-[10px] uppercase tracking-[0.4em] text-sienna font-semibold block mb-3">Reservation</span>
                <h3 className="text-4xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Reserve Your <span className="italic text-burnt">Evening</span>
                </h3>
                <p className="text-sm text-ink/60 mb-10 leading-relaxed">An intimate experience crafted for you.</p>

                <form className="space-y-7" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Name">
                      <input type="text" placeholder="Full name" className="w-full bg-transparent border-b border-ink/20 py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none transition-colors" />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" placeholder="+45 32 96 32 97" className="w-full bg-transparent border-b border-ink/20 py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none transition-colors" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date">
                      <input type="date" className="w-full bg-transparent border-b border-ink/20 py-2 text-sm focus:border-sienna outline-none transition-colors" />
                    </Field>
                    <Field label="Occasion (optional)">
                      <select className="w-full bg-transparent border-b border-ink/20 py-2 text-sm focus:border-sienna outline-none transition-colors">
                        <option>Select occasion</option>
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
                      {TIMES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className={
                            "px-4 py-2 text-xs uppercase tracking-wider transition-all " +
                            (time === t
                              ? "bg-sienna text-cream border border-sienna"
                              : "border border-ink/15 text-ink/70 hover:border-sienna hover:text-sienna")
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Party Size</Label>
                    <div className="flex flex-wrap gap-2">
                      {PARTY.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setParty(p)}
                          className={
                            "min-w-12 px-4 py-2 text-xs transition-all " +
                            (party === p
                              ? "bg-ink text-cream border border-ink"
                              : "border border-ink/15 text-ink/70 hover:border-ink hover:text-ink")
                          }
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="Special Requests (optional)">
                    <textarea
                      placeholder="Dietary restrictions, seating preferences, accessibility needs…"
                      className="w-full bg-transparent border-b border-ink/20 py-2 text-sm placeholder:text-ink/30 focus:border-sienna outline-none resize-none transition-colors"
                      rows={3}
                    />
                  </Field>

                  <p className="text-[11px] text-ink/50 leading-relaxed border-l-2 border-sand/60 pl-4">
                    I understand that if I am more than 45 minutes late, my reservation may be
                    canceled and the table reassigned.
                  </p>

                  <button
                    type="submit"
                    className="w-full bg-ink text-cream py-4 text-[11px] uppercase tracking-[0.3em] font-medium hover:bg-burnt transition-colors"
                  >
                    Confirm Reservation
                  </button>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-ink/10 text-[11px]">
                    <div>
                      <p className="uppercase tracking-widest text-ink/40 mb-1">Running late?</p>
                      <a href="tel:+2349039986098" className="text-sienna hover:text-burnt transition-colors">+234 903 998 6098</a>
                    </div>
                    <div>
                      <p className="uppercase tracking-widest text-ink/40 mb-1">Cancel a reservation</p>
                      <a href="#" className="text-sienna hover:text-burnt transition-colors">Find reservation →</a>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Story */}
          <section id="story" className="px-8 lg:px-16 py-24 border-b border-ink/10">
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

          {/* Footer */}
          <footer className="bg-ink text-cream p-10 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-5">
                <h5 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>Visit</h5>
                <p className="text-sm text-cream/60 leading-relaxed">
                  Strandgade 93<br />
                  1401 København, Denmark<br />
                  Tue–Sat · 18:00 – 23:00
                </p>
                <p className="text-sm text-cream/60">
                  <a href="tel:+2349039986098" className="hover:text-sand transition-colors">+234 903 998 6098</a>
                </p>
              </div>
              <div className="flex flex-col lg:items-end justify-between gap-6">
                <div className="lg:text-right">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-cream/40 mb-3">Letters from Nova</p>
                  <div className="flex border-b border-cream/20 w-full lg:w-72">
                    <input
                      type="email"
                      placeholder="Email address"
                      className="bg-transparent py-2 text-xs outline-none w-full placeholder:text-cream/30"
                    />
                    <button className="text-[10px] uppercase tracking-widest font-medium hover:text-sand transition-colors">
                      Join
                    </button>
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-cream/30">© 2026 Nova</p>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-[0.25em] text-ink/50 block mb-3">{children}</label>;
}
