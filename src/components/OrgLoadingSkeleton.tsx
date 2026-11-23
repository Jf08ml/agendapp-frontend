// Mientras carga el negocio del dominio (rediseño, ErroresYAcceso): la forma
// del header y del hero en gris, en vez de «Cargando organización…».
export default function OrgLoadingSkeleton() {
  const bar = (w: number | string, h = 14, r = 6) => (
    <span className="ag-skeleton" style={{ display: "block", width: w, height: h, borderRadius: r }} />
  );
  return (
    <div aria-busy="true" aria-label="Cargando" style={{ minHeight: "100dvh", background: "var(--surface)" }}>
      <div style={{ height: 60, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {bar(32, 32, 999)}
          {bar(120, 16)}
        </div>
        {bar(96, 36, 8)}
      </div>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "56px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {bar(180, 16)}
        {bar("min(560px, 90%)", 40, 8)}
        {bar("min(420px, 70%)", 16)}
        {bar("min(380px, 60%)", 16)}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {bar(160, 44, 8)}
          {bar(120, 44, 8)}
        </div>
      </div>
    </div>
  );
}
