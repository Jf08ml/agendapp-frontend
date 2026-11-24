// Sección de una página de Ajustes (rediseño, SettingsLayout): tarjeta ag-card
// con título, ayuda y contenido. `icon` / `iconColor` se aceptan por
// compatibilidad, pero el título va sin ícono de color (diseño neutro).
import React from "react";

export default function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="ag-card" style={{ padding: "var(--space-5)" }}>
      <div style={{ marginBottom: "var(--space-4)" }}>
        <h2 style={{ margin: 0, font: "600 17px/24px var(--mantine-font-family)" }}>{title}</h2>
        {description && (
          <div className="ag-muted" style={{ fontSize: 14, lineHeight: "20px", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
