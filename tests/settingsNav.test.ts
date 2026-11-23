import { test } from "node:test";
import assert from "node:assert/strict";
import { SETTINGS_GROUPS, resolveSection, findPage, groupOf } from "../src/pages/admin/OrganizationInfo/settingsNav.ts";

test("5 grupos sin secciones repetidas", () => {
  assert.equal(SETTINGS_GROUPS.length, 5);
  const keys = SETTINGS_GROUPS.flatMap((g) => g.pages.map((p) => p.key));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes("fidelidad"));
});

test("resolveSection: ?seccion= y ?tab= viejo", () => {
  assert.equal(resolveSection("abonos", null), "abonos");
  assert.equal(resolveSection(null, "fidelity"), "fidelidad");
  assert.equal(resolveSection(null, "payments"), "metodos");
  assert.equal(resolveSection("nada", "branding"), "marca");
  assert.equal(resolveSection(null, null), null);
  assert.equal(resolveSection("nada", "nada"), null);
});

test("findPage y groupOf", () => {
  assert.equal(findPage("temporada").label, "Temporada");
  assert.equal(groupOf("temporada")?.label, "Marca y web");
  assert.equal(groupOf("fidelidad"), undefined);
});
