// Final de la configuración (rediseño, ConfiguracionInicial): «Tu negocio está
// listo», con lo configurado y lo que se saltó, e «Ir a mi agenda», donde sigue la
// lista Primeros pasos.
import { Button } from "@mantine/core";
import { IconCalendar, IconCheck, IconMinus } from "@tabler/icons-react";

interface Props {
  onFinish: () => void;
  saving: boolean;
  configured?: string[];
  skipped?: string[];
}

export default function StepFinish({ onFinish, saving, configured = [], skipped = [] }: Props) {
  return (
    <div className="ag-stack" style={{ gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            display: "inline-grid",
            placeItems: "center",
            background: "var(--success-soft)",
            color: "var(--success)",
          }}
        >
          <IconCheck size={30} />
        </span>
        <h2 className="ag-h" style={{ margin: "12px 0 4px", fontSize: 22 }}>Tu negocio está listo</h2>
        <div className="ag-muted" style={{ fontSize: 14, maxWidth: 460, margin: "0 auto" }}>
          Ya puedes recibir citas. En la agenda te espera la lista «Primeros pasos» con lo que sigue.
        </div>
      </div>

      {(configured.length > 0 || skipped.length > 0) && (
        <div className="ag-card" style={{ padding: 16 }}>
          {configured.length > 0 && (
            <>
              <b style={{ display: "block", fontSize: 14, marginBottom: 8 }}>Lo que configuraste</b>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
                {configured.map((c) => (
                  <li key={c} className="ag-row" style={{ gap: 6, fontSize: 14 }}>
                    <IconCheck size={15} color="var(--success)" /> {c}
                  </li>
                ))}
              </ul>
            </>
          )}
          {skipped.length > 0 && (
            <>
              <b style={{ display: "block", fontSize: 14, margin: "14px 0 8px" }}>Lo que saltaste</b>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {skipped.map((c) => (
                  <li key={c} className="ag-row" style={{ gap: 6, fontSize: 14, color: "var(--ink-muted)" }}>
                    <IconMinus size={15} /> {c} <span className="ag-subtle">· lo completas en Ajustes</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Button size="md" leftSection={<IconCalendar size={18} />} onClick={onFinish} loading={saving}>
          Ir a mi agenda
        </Button>
      </div>
    </div>
  );
}
