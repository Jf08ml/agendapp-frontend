// Términos y condiciones del negocio (rediseño, ErroresYAcceso): con la marca
// del negocio. Las líneas que terminan en «:» o van en mayúsculas se muestran
// como títulos; el resto, como párrafos.
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

const isHeading = (line: string) => {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  return t.endsWith(":") || /^\d+[.)]\s/.test(t) || (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t));
};

const isUpperTitle = (line: string) => {
  const t = line.trim();
  return t.length > 0 && t.length <= 90 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t);
};

export default function TermsAndConditionsPage() {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const terms = organization?.termsAndConditions;
  const text = terms?.enabled ? terms?.text?.trim() : "";

  // Bloques separados por líneas en blanco.
  const blocks = (text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 64px" }}>
      <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 24 }}>
        {organization?.name && <div className="ag-muted" style={{ fontSize: 14 }}>{organization.name}</div>}
        <h1 style={{ margin: "4px 0 0", font: "600 28px/34px var(--mantine-font-family)", letterSpacing: "-0.02em" }}>Términos y condiciones</h1>
      </div>

      {blocks.length > 0 ? (
        <div className="ag-stack" style={{ gap: 16 }}>
          {blocks.map((block, i) => {
            const [first, ...rest] = block.split("\n");
            // Título: primera línea de un bloque con más texto, o una línea suelta en mayúsculas.
            if ((rest.length > 0 && isHeading(first)) || (rest.length === 0 && isUpperTitle(first))) {
              return (
                <section key={i}>
                  <h2 style={{ margin: "8px 0 6px", font: "600 17px/24px var(--mantine-font-family)" }}>{first.trim().replace(/:$/, "")}</h2>
                  {rest.length > 0 && <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "var(--ink-muted)", whiteSpace: "pre-wrap" }}>{rest.join("\n")}</p>}
                </section>
              );
            }
            return (
              <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "var(--ink-muted)", whiteSpace: "pre-wrap" }}>
                {block}
              </p>
            );
          })}
        </div>
      ) : (
        <div className="ag-card" style={{ padding: "32px 16px", textAlign: "center" }}>
          <b style={{ fontSize: 15 }}>Aún no hay términos publicados</b>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
            {organization?.name ?? "Este negocio"} todavía no ha publicado sus términos y condiciones.
          </div>
        </div>
      )}
    </div>
  );
}
