// Pruebas del aviso de comprobantes por validar en Caja.
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { aiVerdictText, pendingReceiptsSummary, waitingText } from "../src/components/cash/pendingReceipts.ts";

const now = new Date("2026-11-24T15:00:00Z").getTime();

test("tiempo de espera en palabras", () => {
  assert.equal(waitingText("2026-11-24T14:59:40Z", now), "hace un momento");
  assert.equal(waitingText("2026-11-24T14:55:00Z", now), "hace 5 min");
  assert.equal(waitingText("2026-11-24T12:00:00Z", now), "hace 3 h");
  assert.equal(waitingText("2026-11-23T10:00:00Z", now), "hace 1 día");
  assert.equal(waitingText("2026-11-20T10:00:00Z", now), "hace 4 días");
});

test("resumen de varios comprobantes", () => {
  assert.equal(pendingReceiptsSummary([], now), null);
  const s = pendingReceiptsSummary(
    [
      { amount: 20000, currency: "COP", createdAt: "2026-11-24T13:00:00Z", receipt: { aiVerdict: "match" } },
      { amount: 15000, currency: "COP", createdAt: "2026-11-24T10:00:00Z", receipt: { uploadedAt: "2026-11-24T11:00:00Z", aiVerdict: "mismatch" } },
      { amount: 5000, currency: "COP", createdAt: "2026-11-24T14:30:00Z", receipt: { aiVerdict: "match" } },
    ],
    now
  )!;
  assert.equal(s.count, 3);
  assert.equal(s.total, 40000);
  assert.equal(s.aiMatches, 2);
  assert.equal(s.oldestWaiting, "hace 4 h");
});

test("resultado de la IA en palabras", () => {
  assert.equal(aiVerdictText("match"), "La IA lo marcó como válido");
  assert.equal(aiVerdictText(undefined), "Sin revisión de la IA");
});
