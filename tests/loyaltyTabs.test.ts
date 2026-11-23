import { test } from "node:test";
import assert from "node:assert/strict";
import { LOYALTY_TABS, resolveLoyaltyTab } from "../src/pages/admin/loyalty/loyaltyTabs.ts";

test("4 pestañas en orden: Clientes, Programa, Tarjeta, Mensajes", () => {
  assert.deepEqual(LOYALTY_TABS.map((t) => t.label), ["Clientes", "Programa", "Tarjeta", "Mensajes"]);
});

test("resolveLoyaltyTab respeta permisos", () => {
  const all = LOYALTY_TABS.map((t) => t.key);
  assert.equal(resolveLoyaltyTab("tarjeta", all), "tarjeta");
  assert.equal(resolveLoyaltyTab(null, all), "clientes");
  assert.equal(resolveLoyaltyTab("nada", all), "clientes");
  // sin permiso de configuración: la pestaña pedida cae en la primera permitida
  assert.equal(resolveLoyaltyTab("programa", ["clientes", "mensajes"]), "clientes");
  assert.equal(resolveLoyaltyTab("programa", []), null);
});
