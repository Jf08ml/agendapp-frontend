// ¿Cómo quieres pagar? (rediseño, ClasesPublico): dos opciones en tarjetas de
// radio: «Pagar una clase» y «Usar mi paquete».
import { IconCreditCard, IconTicket } from "@tabler/icons-react";

export type BookingMode = "single" | "package";

interface Props {
  onSelect: (mode: BookingMode) => void;
}

const OPTIONS: { value: BookingMode; title: string; desc: string; Icon: typeof IconTicket }[] = [
  { value: "single", title: "Pagar una clase", desc: "Reservas y pagas la sesión al precio de la clase.", Icon: IconCreditCard },
  { value: "package", title: "Usar mi paquete", desc: "Ya compraste un paquete de sesiones y usas uno de tus créditos.", Icon: IconTicket },
];

export default function StepBookingMode({ onSelect }: Props) {
  return (
    <div className="ag-stack" style={{ gap: 12 }}>
      <h2 className="ag-h" style={{ margin: 0 }}>¿Cómo quieres pagar?</h2>
      <div className="ag-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Cómo quieres pagar">
        {OPTIONS.map((o) => (
          <div
            key={o.value}
            className="ag-opt"
            role="radio"
            tabIndex={0}
            aria-checked={false}
            onClick={() => onSelect(o.value)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(o.value))}
            style={{ cursor: "pointer", padding: "14px 16px", alignItems: "center" }}
          >
            <o.Icon size={22} stroke={1.75} style={{ flex: "none" }} />
            <div>
              <b>{o.title}</b>
              <span className="d">{o.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
