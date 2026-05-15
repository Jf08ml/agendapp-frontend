// Main app — orchestrates layout, theme tokens, and tweaks panel.
const { useState: useStateApp, useEffect: useEffectApp, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primary": "#0a0a0a",
  "dark": false,
  "font": "DM Sans",
  "radius": "md",
  "density": "comfy"
}/*EDITMODE-END*/;

// Curated brand palettes — each item: [primary, contrast]
const PALETTES = [
  ["#0a0a0a", "#ffffff"], // Galaxia black
  ["#7c2d4a", "#ffffff"], // Wine
  ["#1e3a8a", "#ffffff"], // Deep blue
  ["#0f766e", "#ffffff"], // Teal
  ["#b45309", "#ffffff"], // Amber rust
  ["#5b21b6", "#ffffff"], // Purple
  ["#dc2626", "#ffffff"], // Red
  ["#16a34a", "#ffffff"], // Green
];

const FONT_OPTIONS = ["DM Sans", "Inter", "Manrope", "Plus Jakarta Sans"];
const RADIUS_OPTIONS = [
  { value: "sharp", label: "Sharp", sizes: { sm: "2px", md: "4px", lg: "8px" } },
  { value: "md",    label: "Suave", sizes: { sm: "4px", md: "8px", lg: "16px" } },
  { value: "soft",  label: "Redondo", sizes: { sm: "8px", md: "14px", lg: "24px" } },
];

// Hex → contrast (black/white) helper
function contrastOf(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.55 ? "#0a0a0a" : "#ffffff";
}

function hexToRgba(hex, a) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Simple hash-based routing: '' → home, '#/reservar' → booking view.
  const [route, setRoute] = useStateApp(() =>
    window.location.hash.startsWith("#/reservar") ? "booking" : "home"
  );
  const [bookingService, setBookingService] = useStateApp(null);
  const [copy, setCopy] = useStateApp({
    title: business.welcomeTitle,
    body: business.welcomeBody,
  });

  useEffectApp(() => {
    const onHash = () => {
      setRoute(window.location.hash.startsWith("#/reservar") ? "booking" : "home");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Apply theme tokens
  useEffectApp(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-contrast", contrastOf(t.primary));
    root.style.setProperty("--primary-soft", hexToRgba(t.primary, t.dark ? 0.14 : 0.06));
    root.style.setProperty("--primary-soft-hover", hexToRgba(t.primary, t.dark ? 0.20 : 0.10));
    root.style.setProperty("--font-sans", `"${t.font}", -apple-system, BlinkMacSystemFont, sans-serif`);
    root.style.setProperty("--font-display", `"${t.font}", -apple-system, sans-serif`);

    const r = RADIUS_OPTIONS.find((o) => o.value === t.radius) || RADIUS_OPTIONS[1];
    root.style.setProperty("--radius-sm", r.sizes.sm);
    root.style.setProperty("--radius-md", r.sizes.md);
    root.style.setProperty("--radius-lg", r.sizes.lg);

    root.setAttribute("data-theme", t.dark ? "dark" : "light");
  }, [t.primary, t.dark, t.font, t.radius]);

  const goToBooking = (svc) => {
    setBookingService(svc || null);
    window.location.hash = "#/reservar";
    setRoute("booking");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const goHome = () => {
    setBookingService(null);
    window.location.hash = "";
    setRoute("home");
  };

  return (
    <>
      <Nav onBook={() => goToBooking()} onHome={goHome} />
      {route === "booking" ? (
        <BookingView initialService={bookingService} onExit={goHome} />
      ) : (
        <main>
          <Hero onBook={() => goToBooking()} copy={copy} setCopy={setCopy} />
          <Services onBookService={goToBooking} />
          <Professionals />
          <LoyaltyAndLocation />
          <div className="footer-spacer" />
        </main>
      )}
      <Footer />

      <TweaksPanel title="Tweaks · Tema del negocio">
        <TweakSection label="Color principal">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {PALETTES.map(([hex]) => (
              <button
                key={hex}
                onClick={() => setTweak("primary", hex)}
                style={{
                  height: 40,
                  borderRadius: 8,
                  border: t.primary === hex ? "2px solid var(--text)" : "1px solid var(--border)",
                  background: hex,
                  cursor: "pointer",
                  position: "relative",
                }}
                aria-label={`Color ${hex}`}
              >
                {t.primary === hex && (
                  <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: contrastOf(hex) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </TweakSection>

        <TweakSection label="Apariencia">
          <TweakToggle label="Modo oscuro" value={t.dark} onChange={(v) => setTweak("dark", v)} />
          <TweakRadio
            label="Radio de bordes"
            value={t.radius}
            options={RADIUS_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            onChange={(v) => setTweak("radius", v)}
          />
          <TweakSelect
            label="Tipografía"
            value={t.font}
            options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
            onChange={(v) => setTweak("font", v)}
          />
        </TweakSection>

        <TweakSection label="Demo">
          <TweakButton label="Abrir vista de reserva" onClick={() => goToBooking()} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
