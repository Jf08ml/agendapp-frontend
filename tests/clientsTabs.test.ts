import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENTS_TABS, resolveClientsTab } from "../src/pages/admin/manageClients/clientsTabs.ts";

test("Clientes y fidelidad: 4 pestañas en orden", () => {
  assert.deepEqual(CLIENTS_TABS.map((t) => t.label), ["Clientes", "Seguimientos", "Programa de fidelidad", "Tarjeta"]);
});

test("resolveClientsTab respeta permisos y enlaces viejos", () => {
  const all = CLIENTS_TABS.map((t) => t.key);
  assert.equal(resolveClientsTab("programa", all), "programa");
  assert.equal(resolveClientsTab("tarjeta", all), "tarjeta");
  assert.equal(resolveClientsTab(null, all), "clientes");
  assert.equal(resolveClientsTab("nada", all), "clientes");
  // sin permiso de configuración del negocio: cae en Clientes
  assert.equal(resolveClientsTab("programa", ["clientes", "seguimientos"]), "clientes");
});
