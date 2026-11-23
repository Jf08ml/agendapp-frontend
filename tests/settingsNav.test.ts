import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SETTINGS_GROUPS,
  resolveSection,
  findPage,
  groupOf,
  loyaltyRedirect,
} from "../src/pages/admin/OrganizationInfo/settingsNav.ts";

test("5 grupos sin secciones repetidas y sin fidelidad", () => {
  assert.equal(SETTINGS_GROUPS.length, 5);
  const keys: string[] = SETTINGS_GROUPS.flatMap((g) => g.pages.map((p) => p.key));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes("fidelidad"));
  assert.ok(!keys.includes("tarjeta"));
});

test("resolveSection: ?seccion= y ?tab= viejo", () => {
  assert.equal(resolveSection("abonos", null), "abonos");
  assert.equal(resolveSection(null, "payments"), "metodos");
  assert.equal(resolveSection("nada", "branding"), "marca");
  assert.equal(resolveSection(null, "fidelity"), null);
  assert.equal(resolveSection(null, null), null);
  assert.equal(resolveSection("nada", "nada"), null);
});

test("loyaltyRedirect: enlaces viejos de fidelidad van a Clientes › Fidelidad", () => {
  assert.equal(loyaltyRedirect(null, "fidelity"), "/fidelidad?tab=programa");
  assert.equal(loyaltyRedirect("fidelidad", null), "/fidelidad?tab=programa");
  assert.equal(loyaltyRedirect("tarjeta", null), "/fidelidad?tab=tarjeta");
  assert.equal(loyaltyRedirect("marca", null), null);
  assert.equal(loyaltyRedirect(null, "branding"), null);
});

test("findPage y groupOf", () => {
  assert.equal(findPage("temporada").label, "Temporada");
  assert.equal(groupOf("temporada")?.label, "Marca y web");
});
