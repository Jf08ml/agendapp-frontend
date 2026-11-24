// Pruebas de segmentos de clientes, última visita y exportación.
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { exportRows, inSegment, lastVisitLabel } from "../src/pages/admin/manageClients/clientSegments.ts";

const now = new Date("2026-11-24T15:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
const stat = (visits: number, lastDays: number | null, activePackage = false) => ({
  visits,
  lastVisit: lastDays === null ? null : ago(lastDays),
  totalSpent: 0,
  activePackage,
});

test("segmentos", () => {
  const c = { _id: "c1", birthDate: "1990-11-03T00:00:00.000Z" };
  assert.equal(inSegment(c, stat(5, 3), "frecuentes", now), true);
  assert.equal(inSegment(c, stat(4, 3), "frecuentes", now), false);
  assert.equal(inSegment(c, stat(2, 61), "inactivos", now), true);
  assert.equal(inSegment(c, stat(2, 59), "inactivos", now), false);
  assert.equal(inSegment(c, stat(0, null), "inactivos", now), false); // nunca vino: no es «inactivo»
  assert.equal(inSegment(c, undefined, "cumpleanos", now), true);
  assert.equal(inSegment({ _id: "c2", birthDate: "1990-12-01T00:00:00.000Z" }, undefined, "cumpleanos", now), false);
  assert.equal(inSegment({ _id: "c3" }, undefined, "cumpleanos", now), false);
  assert.equal(inSegment(c, stat(1, 10, true), "paquete", now), true);
  assert.equal(inSegment(c, undefined, "paquete", now), false);
  assert.equal(inSegment(c, undefined, "todos", now), true);
});

test("última visita en palabras", () => {
  assert.equal(lastVisitLabel(null, now), "Sin visitas");
  assert.equal(lastVisitLabel(ago(0.2), now), "Hoy");
  assert.equal(lastVisitLabel(ago(1), now), "Ayer");
  assert.equal(lastVisitLabel(ago(5), now), "Hace 5 días");
  assert.equal(lastVisitLabel(ago(21), now), "Hace 3 semanas");
  assert.equal(lastVisitLabel(ago(95), now), "Hace 3 meses");
  assert.equal(lastVisitLabel(ago(400), now), "Hace 1 año");
});

test("filas para exportar", () => {
  const [row] = exportRows(
    [{ _id: "c1", name: "Valentina", phone_e164: "+573001234567", birthDate: "1990-11-03T00:00:00.000Z" }],
    { c1: { visits: 6, lastVisit: "2026-10-01T15:00:00.000Z", totalSpent: 420000, activePackage: true } }
  );
  assert.deepEqual(row, {
    Nombre: "Valentina",
    Teléfono: "+573001234567",
    Correo: "",
    Documento: "",
    Cumpleaños: "1990-11-03",
    "Última visita": "2026-10-01",
    Visitas: 6,
    "Total gastado": 420000,
    "Paquete activo": "Sí",
  });
});
