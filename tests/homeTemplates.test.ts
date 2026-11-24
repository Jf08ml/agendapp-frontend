// Pruebas de las plantillas de inicio y la cuenta regresiva de temporada.
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { christmasCountdown, layoutFor, templateAllowed, templateOf } from "../src/components/homeTemplates.ts";

test("diseño guardado → plantilla", () => {
  assert.equal(templateOf("modern"), "essential");
  assert.equal(templateOf("cards"), "essential");
  assert.equal(templateOf(undefined), "essential");
  assert.equal(templateOf("landing"), "studio");
  assert.equal(templateOf("academy"), "academy");
});

test("plantilla → diseño a guardar; Esencial conserva el que había", () => {
  assert.equal(layoutFor("studio", "modern"), "landing");
  assert.equal(layoutFor("academy"), "academy");
  assert.equal(layoutFor("essential", "cards"), "cards");
  assert.equal(layoutFor("essential", "landing"), "minimal");
  assert.equal(layoutFor("essential"), "minimal");
});

test("Pro según professionalLanding", () => {
  assert.equal(templateAllowed("essential", false), true);
  assert.equal(templateAllowed("studio", false), false);
  assert.equal(templateAllowed("academy", undefined), true);
});

test("cuenta regresiva de temporada", () => {
  assert.deepEqual(christmasCountdown(2026, 11, 24), { active: false, days: 7, text: "Empieza en 7 días (1 de diciembre)." });
  assert.equal(christmasCountdown(2026, 11, 30).text, "Empieza mañana (1 de diciembre).");
  assert.deepEqual(christmasCountdown(2026, 12, 1).active, true);
  assert.equal(christmasCountdown(2026, 12, 31).days, 6);
  assert.equal(christmasCountdown(2027, 1, 6).text, "Hoy es el último día de la temporada.");
  assert.equal(christmasCountdown(2027, 1, 7).days, 328);
});
