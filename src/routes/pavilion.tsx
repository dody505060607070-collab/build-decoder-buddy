import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { View } from "@/lib/pavilion-scene";
import skyUrl from "@/assets/pavilion/sky.jpg";

export const Route = createFileRoute("/pavilion")({
  head: () => ({
    meta: [
      { title: "Mask Pavilion — Digitmask FZE" },
      { name: "description", content: "Walk through the Digitmask 3D pavilion: water courtyard, services gallery and contact lounge." },
      { property: "og:title", content: "Mask Pavilion — Digitmask FZE" },
      { property: "og:description", content: "A 3D pavilion for Digitmask's AI, software and digital marketing services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pavilion,
});

const SERVICES = [
  { title: "Webs & Apps", text: "Websites, web platforms and cross-platform mobile apps built for speed and growth." },
  { title: "Business Systems", text: "CRM, HRMS and custom business software that runs your operations." },
  { title: "AI & Automation", text: "AI meeting management, smart assistants and process automation." },
  { title: "Marketing & Media", text: "Digital marketing, SEO, analytics and media production." },
];

function Pavilion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ goTo: (v: View) => void; dispose: () => void } | null>(null);
  const [view, setView] = useState<View>("home");
  const [loaded, setLoaded] = useState(false);
  const [underwater, setUnderwater] = useState(false);
  const [service, setService] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    import("@/lib/pavilion-scene").then(({ createPavilion }) => {
      if (!alive || !canvasRef.current) return;
      api.current = createPavilion(canvasRef.current, {
        onLoaded: () => setLoaded(true),
        onUnderwater: setUnderwater,
        onService: setService,
      });
    });
    return () => { alive = false; api.current?.dispose(); };
  }, []);

  const go = (v: View) => { setView(v); setService(null); api.current?.goTo(v); };
  const nav = [["home", "Home"], ["services", "Services"], ["contact", "Contact"]] as const;

  return (
    <div className="dark fixed inset-0 overflow-hidden bg-background text-foreground">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${loaded ? "opacity-0" : "opacity-100"}`} style={{ backgroundImage: `url(${skyUrl})`, backgroundSize: "cover", backgroundPosition: "center 60%" }} />
      <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${underwater ? "opacity-100" : "opacity-0"}`} style={{ background: "radial-gradient(ellipse at 50% 0%, transparent 30%, color-mix(in oklab, #1e0a3c 75%, transparent) 100%)" }} />
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-6">
        <a href="/" className="text-sm tracking-[0.25em] uppercase">Digitmask FZE</a>
        <nav className="flex gap-6 text-sm">
          {nav.map(([v, label]) => (
            <button key={v} onClick={() => go(v)} className={view === v ? "underline underline-offset-4" : "opacity-70 hover:opacity-100"}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {view === "home" && (
        <div className="pointer-events-none absolute bottom-12 left-6 z-10 max-w-lg">
          <h1 className="text-5xl font-light leading-tight">Think smart,<br /><em>think Digitmask</em></h1>
          <p className="mt-3 text-sm opacity-80">AI, software & digital marketing studio in the UAE.</p>
        </div>
      )}
      {view === "services" && service === null && (
        <div className="absolute inset-x-0 bottom-10 z-10 flex flex-wrap justify-center gap-3 px-6">
          {SERVICES.map((s, i) => (
            <button key={s.title} onClick={() => setService(i)} className="rounded-full border border-border bg-background/40 px-5 py-2 text-sm backdrop-blur transition hover:bg-background/70">
              {s.title}
            </button>
          ))}
        </div>
      )}
      {service !== null && (
        <div role="dialog" aria-label={SERVICES[service]!.title} className="absolute bottom-12 left-6 z-10 max-w-sm rounded-lg border border-border bg-background/85 p-6 backdrop-blur">
          <h2 className="text-2xl font-light">{SERVICES[service]!.title}</h2>
          <p className="mt-2 text-sm opacity-80">{SERVICES[service]!.text}</p>
          <button onClick={() => setService(null)} className="mt-4 text-sm underline">Close</button>
        </div>
      )}
      {view === "contact" && (
        <div className="absolute bottom-12 left-6 z-10 max-w-sm rounded-lg border border-border bg-background/85 p-6 text-sm backdrop-blur">
          <h2 className="mb-3 text-2xl font-light">Contact</h2>
          <p><a href="mailto:info@digitmask.com" className="underline">info@digitmask.com</a></p>
          <p><a href="tel:+971589343678" className="underline">+971 58 934 3678</a></p>
          <p className="mt-2 opacity-80">2507 Burlington Tower, Business Bay, Dubai</p>
        </div>
      )}
    </div>
  );
}
