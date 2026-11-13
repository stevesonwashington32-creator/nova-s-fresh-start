import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from "lucide-react";
import { menuItems, type MenuCategory } from "@/data/menu";

const categories: MenuCategory[] = ["Rice & local favorites", "From the grill"];

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Food Menu — Restaurant Name" },
      {
        name: "description",
        content:
          "Explore the restaurant’s menu, including local favorites and selections from the grill.",
      },
      { property: "og:title", content: "Food Menu — Restaurant Name" },
      {
        property: "og:description",
        content: "Explore local favorites and selections from the grill.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://nova-asaba.lovable.app/menu" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://nova-asaba.lovable.app/menu" }],
  }),
  component: MenuPage,
});

function MenuPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-5 lg:px-12">
        <Link to="/" className="text-[10px] font-medium uppercase tracking-[0.3em]">
          Restaurant Name
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink/65 transition-colors hover:text-sienna"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to reservations
        </Link>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-14 lg:px-12 lg:pb-24 lg:pt-20">
        <div className="mb-14 grid gap-8 border-b border-ink/10 pb-12 lg:grid-cols-[1fr_21rem] lg:items-end">
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.35em] text-sienna">
              Restaurant Menu
            </p>
            <h1 className="max-w-3xl text-6xl leading-[0.9] sm:text-7xl lg:text-8xl" style={{ fontFamily: "var(--font-display)" }}>
              From our <span className="italic text-burnt">kitchen.</span>
            </h1>
          </div>
          <div className="lg:justify-self-end lg:text-right">
            <p className="max-w-sm text-sm leading-relaxed text-ink/65 lg:ml-auto">
              Explore a selection of dishes. Ask the restaurant about today’s full menu.
            </p>
            <a
              href="/"
              className="mt-5 inline-flex items-center gap-2 border-b border-sienna pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sienna"
            >
              Ask about today’s menu <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <nav aria-label="Menu sections" className="mb-14 flex flex-wrap gap-x-8 gap-y-3 border-b border-ink/10 pb-5">
          {categories.map((category, index) => (
            <a
              key={category}
              href={`#${index === 0 ? "local-favorites" : "from-the-grill"}`}
              className="text-[10px] uppercase tracking-[0.2em] text-ink/55 transition-colors hover:text-sienna"
            >
              {category}
            </a>
          ))}
        </nav>

        {categories.map((category, sectionIndex) => {
          const items = menuItems.filter((item) => item.category === category);
          return (
            <section
              key={category}
              id={sectionIndex === 0 ? "local-favorites" : "from-the-grill"}
              className="mb-16 scroll-mt-8 last:mb-0"
            >
              <div className="mb-7 flex items-end justify-between border-b border-ink/10 pb-4">
                <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
                  {category}
                </h2>
                <span className="pb-1 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                  {String(items.length).padStart(2, "0")} selections
                </span>
              </div>
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <article key={item.name} className="group min-w-0">
                    <div className="relative aspect-[4/3] overflow-hidden bg-cream-soft">
                      <img
                        src={item.image}
                        alt={item.imageAlt}
                        width={1280}
                        height={960}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                      <span className="absolute bottom-3 left-3 bg-cream px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink">
                        {item.note}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b border-ink/10 py-4">
                      <div>
                        <h3 className="text-2xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                          {item.name}
                        </h3>
                        <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-ink/60">
                          {item.description}
                        </p>
                      </div>
                      <ArrowDownRight className="mt-1 h-4 w-4 shrink-0 text-sienna" aria-hidden="true" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <aside className="mt-14 flex flex-col gap-5 border-t border-ink/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-ink/55">
            Menu availability and preparation may vary. Contact the restaurant for current selections and pricing.
          </p>
          <Link to="/" className="inline-flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-sienna transition-colors hover:text-burnt">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Make a reservation
          </Link>
        </aside>
      </section>
    </main>
  );
}