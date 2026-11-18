// Pruebas del tema navideño (temporada y páginas donde se muestra).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isChristmasSeason,
  isClientFacingPath,
  resolveChristmasPreview,
  shouldShowChristmas,
} from "../src/utils/seasonalTheme.ts";

test("la vista previa ignora interruptor y temporada, pero no el panel admin", () => {
  const now = new Date("2026-11-18T15:00:00Z");
  assert.equal(shouldShowChristmas({ seasonalTheme: "none", pathname: "/", now, preview: true }), true);
  assert.equal(
    shouldShowChristmas({ seasonalTheme: "none", pathname: "/gestionar-agenda", now, preview: true }),
    false
  );
});

test("?preview=navidad se recuerda y ?preview=off la quita", () => {
  assert.deepEqual(resolveChristmasPreview("?preview=navidad", null), { preview: true, store: "set" });
  assert.deepEqual(resolveChristmasPreview("", "1"), { preview: true, store: null });
  assert.deepEqual(resolveChristmasPreview("?preview=off", "1"), { preview: false, store: "clear" });
  assert.deepEqual(resolveChristmasPreview("", null), { preview: false, store: null });
});

test("la temporada va del 1 de diciembre al 6 de enero en la zona del negocio", () => {
  const bogota = "America/Bogota";
  assert.equal(isChristmasSeason(new Date("2026-11-30T12:00:00Z"), bogota), false);
  assert.equal(isChristmasSeason(new Date("2026-12-01T12:00:00Z"), bogota), true);
  assert.equal(isChristmasSeason(new Date("2026-12-31T12:00:00Z"), bogota), true);
  assert.equal(isChristmasSeason(new Date("2027-01-06T12:00:00Z"), bogota), true);
  assert.equal(isChristmasSeason(new Date("2027-01-07T12:00:00Z"), bogota), false);
  // 1 dic 03:00 UTC sigue siendo 30 nov en Bogotá (UTC-5)
  assert.equal(isChristmasSeason(new Date("2026-12-01T03:00:00Z"), bogota), false);
});

test("una zona horaria inválida no rompe el cálculo", () => {
  assert.equal(typeof isChristmasSeason(new Date("2026-12-10T12:00:00Z"), "No/Existe"), "boolean");
});

test("solo las páginas de clientes llevan decoración", () => {
  for (const p of ["/", "/online-reservation", "/tienda", "/tienda/producto/abc", "/mi-tarjeta/xyz", "/servicio/1", "/mis-reservas/", "/mis-reservas/tok"]) {
    assert.equal(isClientFacingPath(p), true, p);
  }
  for (const p of ["/gestionar-agenda", "/informacion-negocio", "/login-admin", "/reserva/pago", "/pago/comprobante", "/cancel", "/superadmin", "/signup"]) {
    assert.equal(isClientFacingPath(p), false, p);
  }
});

test("requiere el interruptor encendido, página de clientes y temporada", () => {
  const now = new Date("2026-12-15T15:00:00Z");
  assert.equal(shouldShowChristmas({ seasonalTheme: "christmas", pathname: "/", now }), true);
  assert.equal(shouldShowChristmas({ seasonalTheme: "none", pathname: "/", now }), false);
  assert.equal(shouldShowChristmas({ seasonalTheme: undefined, pathname: "/", now }), false);
  assert.equal(shouldShowChristmas({ seasonalTheme: "christmas", pathname: "/gestionar-agenda", now }), false);
  assert.equal(
    shouldShowChristmas({ seasonalTheme: "christmas", pathname: "/", now: new Date("2026-11-18T15:00:00Z") }),
    false
  );
});
