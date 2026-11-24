// Pruebas de la navegación del panel (rediseño: 5 grupos de AdminNav).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  allNavLinks,
  buildAdminNav,
  buildTabbar,
  buildUserMenuLinks,
  computeNavPermissions,
  findActiveLink,
  isAdminPath,
  type NavPermissions,
} from "../src/layouts/adminNavigation.ts";

const ALL: NavPermissions = {
  businessInfo: true, employeeInfo: true, clientsRead: true, servicesRead: true,
  employeesRead: true, apptsAll: true, apptsOwn: true, onlineRes: true, cashRead: true,
  inventoryRead: true, whatsappRead: true, analyticsRead: true, packagesRead: true,
  classesRead: true, campaignsRead: true,
};
const NONE = Object.fromEntries(Object.keys(ALL).map((k) => [k, false])) as unknown as NavPermissions;

// Todas las rutas de administración que tenía layouts/NavbarLinks.tsx antes del rediseño.
const OLD_ADMIN_ROUTES = [
  "/gestionar-agenda", "/gestionar-reservas-online", "/gestion-caja", "/inventario", "/pedidos",
  "/gestionar-pagos", "/gestionar-clientes", "/gestionar-servicios", "/gestionar-profesionales",
  "/gestionar-paquetes", "/gestionar-clases", "/gestionar-whatsapp", "/mensajes-whatsapp",
  "/admin/campaigns", "/analytics-dashboard", "/informacion-negocio", "/informacion-profesional",
  "/my-membership", "/historial-eliminaciones", "/novedades",
];

test("los cinco grupos de AdminNav, en orden", () => {
  assert.deepEqual(buildAdminNav(ALL).map((g) => g.title), ["Hoy", "Clientes", "Ventas", "Marketing", "Negocio"]);
});

test("ninguna ruta de administración anterior queda sin enlace", () => {
  const paths = allNavLinks(buildAdminNav(ALL), buildUserMenuLinks(ALL, false)).map((l) => l.to.split("?")[0]);
  for (const route of OLD_ADMIN_ROUTES) assert.ok(paths.includes(route), route);
  for (const route of OLD_ADMIN_ROUTES) assert.ok(isAdminPath(route), route);
});

test("paquetes va bajo Catálogo y pedidos bajo Tienda e inventario", () => {
  const items = buildAdminNav(ALL).flatMap((g) => g.items);
  const catalog = items.find((i) => i.key === "catalog")!;
  const store = items.find((i) => i.key === "store")!;
  assert.deepEqual(catalog.links.map((l) => l.to), ["/gestionar-servicios", "/gestionar-paquetes"]);
  assert.ok(store.links.some((l) => l.to === "/pedidos"));
});

test("sin permisos no se muestra nada; cada sección depende de sus permisos", () => {
  assert.deepEqual(buildAdminNav(NONE), []);
  assert.deepEqual(buildTabbar(NONE), []);
  assert.deepEqual(buildUserMenuLinks(NONE, true), []);

  const onlyPayments = buildAdminNav({ ...NONE, onlineRes: true }).flatMap((g) => g.items);
  const cash = onlyPayments.find((i) => i.key === "cash")!;
  assert.deepEqual(cash.links.map((l) => l.to), ["/gestionar-pagos"]);
});

test("los límites del plan ocultan WhatsApp, analíticas, paquetes, clases y campañas", () => {
  const can = computeNavPermissions(() => true, {
    whatsappIntegration: false, analyticsAdvanced: false, servicePackages: false,
    classesModule: false, campaignsWhatsapp: false,
  });
  assert.equal(can.whatsappRead, false);
  assert.equal(can.analyticsRead, false);
  assert.equal(can.packagesRead, false);
  assert.equal(can.classesRead, false);
  assert.equal(can.campaignsRead, false);
  assert.equal(can.clientsRead, true);
});

test("tabbar móvil: Agenda, Clientes, Caja, WhatsApp", () => {
  assert.deepEqual(buildTabbar(ALL).map((t) => t.label), ["Agenda", "Clientes", "Caja", "WhatsApp"]);
});

test("enlace activo: subrutas, fidelidad dentro de Clientes y Ajustes", () => {
  const links = allNavLinks(buildAdminNav(ALL));
  assert.equal(findActiveLink(links, "/admin/campaigns/new", ""), "/admin/campaigns");
  assert.equal(findActiveLink(links, "/gestionar-clientes", "?tab=programa"), "/gestionar-clientes");
  assert.equal(findActiveLink(links, "/informacion-negocio", ""), "/informacion-negocio");
  assert.equal(findActiveLink(links, "/servicios-precios", ""), null);
  assert.equal(findActiveLink(links, "/pedidos", "?desde=caja"), "/gestion-caja");
  assert.equal(findActiveLink(links, "/pedidos", ""), "/pedidos");
});

test("las páginas públicas no usan el shell del panel", () => {
  for (const p of ["/", "/servicios-precios", "/online-reservation", "/mis-reservas", "/tienda", "/login-admin", "/superadmin/orgs"]) {
    assert.equal(isAdminPath(p), false, p);
  }
});
