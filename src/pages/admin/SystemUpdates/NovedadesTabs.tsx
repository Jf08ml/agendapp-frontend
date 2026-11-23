// Novedades · Mis solicitudes (rediseño, NovedadesHistorial). La pestaña va en la
// URL (?tab=solicitudes) para poder enlazarla.
import { Box } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import SystemUpdates from "./index";
import FeatureRequests from "./FeatureRequests";

const TABS = [
  { key: "novedades", label: "Novedades" },
  { key: "solicitudes", label: "Mis solicitudes" },
] as const;

export default function NovedadesTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "solicitudes" ? "solicitudes" : "novedades";
  const setTab = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "novedades") next.delete("tab");
    else next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  return (
    <Box p={{ base: "sm", md: "lg" }} maw={800}>
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Novedades</h1>
        <nav className="ag-subtabs" aria-label="Novedades">
          {TABS.map((t) => (
            <a
              key={t.key}
              href={t.key === "novedades" ? "?" : `?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setTab(t.key);
              }}
            >
              {t.label}
            </a>
          ))}
        </nav>
        {tab === "novedades" ? <SystemUpdates /> : <FeatureRequests />}
      </div>
    </Box>
  );
}
