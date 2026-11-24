// Pruebas de la comparación con el periodo anterior (Analíticas).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { changeVs, previousRange } from "../src/pages/admin/analyticsDashboard/periodCompare.ts";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("rango anterior de igual duración", () => {
  const [s, e] = previousRange(new Date(2026, 10, 1), new Date(2026, 10, 30)); // noviembre (30 días)
  assert.equal(ymd(s), "2026-10-02");
  assert.equal(ymd(e), "2026-10-31");
  const [s2, e2] = previousRange(new Date(2026, 10, 24, 15), new Date(2026, 10, 24, 18)); // un día
  assert.equal(ymd(s2), "2026-11-23");
  assert.equal(ymd(e2), "2026-11-23");
  const [s3, e3] = previousRange(new Date(2026, 0, 1), new Date(2026, 0, 7)); // cruza el año
  assert.equal(ymd(s3), "2025-12-25");
  assert.equal(ymd(e3), "2025-12-31");
});

test("variación en palabras", () => {
  assert.deepEqual(changeVs(112, 100), { pct: 12, tone: "success", text: "+12 % vs. periodo anterior" });
  assert.deepEqual(changeVs(80, 100), { pct: -20, tone: "danger", text: "−20 % vs. periodo anterior" });
  assert.equal(changeVs(100, 100).tone, "neutral");
  assert.equal(changeVs(5, 0).text, "Sin datos del periodo anterior");
  assert.equal(changeVs(0, 0).pct, 0);
});
