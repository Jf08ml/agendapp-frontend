import type { ReactNode } from "react";

interface StepHeadingProps {
  /** Instrucción principal, corta y directa (ej. "Elige el día") */
  title: string;
  /** Una línea opcional de apoyo */
  hint?: ReactNode;
}

// Encabezado de cada paso del wizard de reserva (title-2 del design system):
// una instrucción clara en lugar de párrafos explicativos.
export default function StepHeading({ title, hint }: StepHeadingProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <h2 className="ag-h-step">{title}</h2>
      {hint && (
        <span className="ag-muted" style={{ fontSize: 14, lineHeight: "20px" }}>
          {hint}
        </span>
      )}
    </div>
  );
}
