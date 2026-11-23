// Paso «Reserva en línea» (rediseño, ConfiguracionInicial): las dos políticas en
// tarjetas de radio, sin emoji.
import { Button } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../admin/OrganizationInfo/schema";

interface Props {
  form: UseFormReturnType<FormValues>;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
}

const OPTIONS = [
  {
    value: "auto_if_available",
    title: "Confirmar sola si hay cupo",
    desc: "La reserva se confirma al instante y el cliente recibe el aviso. Si no hay cupo, queda pendiente para que decidas.",
    ideal: ["Tu horario está al día", "Quieres que reservar sea lo más fácil posible"],
  },
  {
    value: "manual",
    title: "Las apruebo yo",
    desc: "Cada reserva queda pendiente hasta que la apruebes o la rechaces desde Reservas online.",
    ideal: ["Quieres revisar cada solicitud", "Tu disponibilidad cambia a menudo"],
  },
] as const;

export default function StepOnlineBooking({ form, onNext, onBack, saving }: Props) {
  const policy = form.values.reservationPolicy ?? "manual";

  return (
    <div className="ag-stack" style={{ gap: 16 }}>
      <div className="ag-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Cómo se confirman las reservas">
        {OPTIONS.map((o) => {
          const choose = () => form.setFieldValue("reservationPolicy", o.value);
          return (
            <div
              key={o.value}
              className="ag-opt"
              role="radio"
              tabIndex={0}
              aria-checked={policy === o.value}
              onClick={choose}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose())}
              style={{ cursor: "pointer", padding: "14px 16px" }}
            >
              <span className="ag-radio" />
              <div>
                <b>{o.title}</b>
                <span className="d">{o.desc}</span>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {o.ideal.map((t) => (
                    <li key={t} className="ag-row" style={{ gap: 6, fontSize: 13, color: "var(--ink-muted)" }}>
                      <IconCheck size={14} color="var(--success)" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ag-subtle">La mayoría de negocios empieza con «Confirmar sola si hay cupo». Puedes cambiarlo cuando quieras en Reservas online.</div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        <Button variant="default" onClick={onBack}>
          Anterior
        </Button>
        <Button onClick={onNext} loading={saving}>
          Guardar y continuar
        </Button>
      </div>
    </div>
  );
}
