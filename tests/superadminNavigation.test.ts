import { test } from "node:test";
import assert from "node:assert/strict";
import { SUPERADMIN_NAV, findSuperadminLocation, isSuperadminPanelPath } from "../src/layouts/superadminNavigation.ts";

test("seis secciones en dos grupos", () => {
  assert.deepEqual(
    SUPERADMIN_NAV.map((g) => g.sections.map((s) => s.label)),
    [
      ["Negocios", "Ventas", "Métricas"],
      ["Novedades", "WhatsApp", "Chatbots"],
    ]
  );
});

test("cada ruta actual cae en su sección y pestaña", () => {
  const cases: [string, string, string][] = [
    ["/superadmin", "negocios", "/superadmin"],
    ["/superadmin/orgs", "negocios", "/superadmin/orgs"],
    ["/superadmin/organizaciones/abc123", "negocios", "/superadmin/orgs"],
    ["/superadmin/planes", "ventas", "/superadmin/planes"],
    ["/superadmin/agentes", "ventas", "/superadmin/agentes"],
    ["/superadmin/impacto/", "metricas", "/superadmin/impacto"],
    ["/superadmin/solicitudes", "novedades", "/superadmin/solicitudes"],
    ["/superadmin/whatsapp", "whatsapp", "/superadmin/whatsapp"],
    ["/superadmin/chatbots", "chatbots", "/superadmin/chatbots"],
  ];
  for (const [path, section, tab] of cases) {
    const loc = findSuperadminLocation(path);
    assert.equal(loc?.section.key, section, path);
    assert.equal(loc?.tab, tab, path);
  }
});

test("el login y rutas ajenas no son del panel", () => {
  assert.equal(findSuperadminLocation("/superadmin-login"), null);
  assert.equal(isSuperadminPanelPath("/superadmin-login"), false);
  assert.equal(isSuperadminPanelPath("/superadmin"), true);
  assert.equal(isSuperadminPanelPath("/superadmin/orgs"), true);
  assert.equal(isSuperadminPanelPath("/gestionar-agenda"), false);
});
