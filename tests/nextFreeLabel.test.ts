// Pruebas del texto «Próximo horario libre».
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { nextFreeLabel } from "../src/utils/nextFreeLabel.ts";

const now = new Date("2026-11-24T15:00:00Z"); // martes 24, 10:00 a. m. en Bogotá

test("hoy, mañana y otro día en la zona del negocio", () => {
  assert.equal(nextFreeLabel("2026-11-24T21:00:00Z", "America/Bogota", "12h", now), "hoy 4:00 p. m.");
  assert.equal(nextFreeLabel("2026-11-25T14:30:00Z", "America/Bogota", "12h", now), "mañana 9:30 a. m.");
  assert.equal(nextFreeLabel("2026-11-26T15:00:00Z", "America/Bogota", "12h", now), "jueves 26, 10:00 a. m.");
  assert.equal(nextFreeLabel("2026-11-24T17:00:00Z", "America/Bogota", "12h", now), "hoy 12:00 p. m.");
});

test("24 h y cambio de día por zona", () => {
  assert.equal(nextFreeLabel("2026-11-24T21:00:00Z", "America/Bogota", "24h", now), "hoy 16:00");
  // 04:30 UTC del 25 sigue siendo el 24 en Bogotá (23:30)
  assert.equal(nextFreeLabel("2026-11-25T04:30:00Z", "America/Bogota", "24h", now), "hoy 23:30");
});
