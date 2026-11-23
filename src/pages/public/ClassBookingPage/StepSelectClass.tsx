// Paso 1 · Clase (rediseño, ClasesPublico): filas como el selector de servicios.
// Con paquete solo se ven las clases que cubre.
import { Skeleton } from "@mantine/core";
import { IconCheck, IconClock, IconPhoto } from "@tabler/icons-react";
import { ClassType } from "../../../services/classService";
import { formatCurrency } from "../../../utils/formatCurrency";

interface Props {
  classes: ClassType[];
  loading: boolean;
  selected: ClassType | null;
  onSelect: (c: ClassType) => void;
  currency?: string;
  /** Modo paquete: solo se listan las clases que cubre. */
  packageOnly?: boolean;
}

export default function StepSelectClass({ classes, loading, selected, onSelect, currency = "COP", packageOnly = false }: Props) {
  if (loading) {
    return (
      <div className="ag-stack" style={{ gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={80} radius="md" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="ag-card" style={{ padding: "32px 16px", textAlign: "center" }}>
        <div className="ag-muted" style={{ fontSize: 14 }}>No hay clases disponibles por ahora.</div>
      </div>
    );
  }

  return (
    <div className="ag-stack" style={{ gap: 10 }}>
      <div>
        <h2 className="ag-h" style={{ margin: 0 }}>Elige la clase</h2>
        {packageOnly && <div className="ag-subtle">Solo ves las clases que cubre tu paquete.</div>}
      </div>
      <div role="radiogroup" aria-label="Clase">
        {classes.map((c) => {
          const isSelected = selected?._id === c._id;
          const img = c.images?.[0];
          const discount = c.groupDiscount?.enabled ? c.groupDiscount : null;
          return (
            <div
              key={c._id}
              className="ag-pick"
              role="radio"
              tabIndex={0}
              aria-checked={isSelected}
              onClick={() => onSelect(c)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(c))}
            >
              <div className="ag-pick__thumb" style={{ display: "grid", placeItems: "center", overflow: "hidden" }}>
                {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <IconPhoto size={20} color="var(--ink-subtle)" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="ag-pick__name">{c.name}</div>
                <div className="ag-row" style={{ gap: 10, fontSize: 13, color: "var(--ink-muted)", flexWrap: "wrap" }}>
                  {!c.hidePrice && (
                    <span className="ag-num" style={{ color: "var(--ink)", fontWeight: 600 }}>
                      {c.pricePerPerson === 0 ? "Gratis" : `${formatCurrency(c.pricePerPerson, currency)} / persona`}
                    </span>
                  )}
                  <span className="ag-row" style={{ gap: 4 }}>
                    <IconClock size={13} /> {c.duration} min
                  </span>
                  <span>Hasta {c.defaultCapacity} {c.defaultCapacity === 1 ? "persona" : "personas"}</span>
                </div>
                {discount && (
                  <div className="ag-subtle" style={{ marginTop: 2 }}>
                    {discount.discountPercent} % de descuento desde {discount.minPeople} personas
                  </div>
                )}
              </div>
              <span className="ag-pick__check">{isSelected && <IconCheck size={14} />}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
