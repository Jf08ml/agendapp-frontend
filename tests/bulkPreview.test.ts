// Pruebas de la vista previa de la carga masiva de servicios.
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildPreview, parseServiceRows, uploadPayload } from "../src/pages/admin/manageServices/bulkPreview.ts";

test("lee la plantilla: salta la nota, el ID de ejemplo y filas vacías", () => {
  const rows = parseServiceRows([
    { ID: "(dejar vacío para crear nuevo)", "Nombre del Servicio": "Corte", Tipo: "Barbería", "Duración (minutos)": 30, Precio: 15000, Activo: "Sí", Destacado: "No" },
    {},
    { ID: "NOTA: Nombre, Precio y Duración son obligatorios." },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]._id, undefined);
  assert.equal(rows[0].excelRow, 2);
  assert.equal(rows[0].price, 15000);
  assert.equal(rows[0].featured, false);
  assert.equal(rows[0].isActive, true);
});

test("sin columna «Activo» no desactiva; números con formato", () => {
  const [r] = parseServiceRows([{ nombre: "Uñas", precio: "$ 25.000", duracion: "45 min" }]);
  assert.equal(r.isActive, undefined);
  assert.equal(r.price, 25000);
  assert.equal(r.duration, 45);
  assert.equal(parseServiceRows([{ nombre: "x", precio: "12,5", duracion: 30 }])[0].price, 12.5);
});

test("revisión: nuevos, actualizados, sin cambios y errores", () => {
  const existing = [
    { _id: "a1", name: "Corte", type: "Barbería", price: 15000, duration: 30, isActive: true },
    { _id: "b2", name: "Barba", price: 10000, duration: 20 },
  ];
  const rows = parseServiceRows([
    { ID: "a1", Nombre: "Corte", Tipo: "Barbería", Precio: 18000, Duración: 30 },
    { ID: "b2", Nombre: "Barba", Precio: 10000, Duración: 20 },
    { Nombre: "Cejas", Precio: 8000, Duración: 15 },
    { Nombre: "Corte", Precio: 9000, Duración: 15 },
    { Nombre: "", Precio: 1, Duración: 10 },
    { Nombre: "Tinte", Precio: 50000, Duración: 0 },
    { ID: "zzz", Nombre: "Ajeno", Precio: 1, Duración: 10 },
    { ID: "b2", Nombre: "Barba", Precio: 10000, Duración: 20, Activo: "No" },
  ]);
  const { rows: p, counts } = buildPreview(rows, existing, (n) => `$${n}`);
  assert.deepEqual(counts, { new: 2, update: 1, unchanged: 1, error: 4 });
  assert.deepEqual(p[0].changes, ["Precio: $15000 → $18000"]);
  assert.equal(p[1].kind, "unchanged");
  assert.match(p[3].message!, /Ya tienes un servicio con este nombre/);
  assert.match(p[4].message!, /nombre/);
  assert.match(p[5].message!, /duración/);
  assert.match(p[6].message!, /no es de uno de tus servicios/);
  assert.match(p[7].message!, /más arriba/);

  const payload = uploadPayload(p);
  assert.deepEqual(payload.excelRows, [2, 4, 5]);
  assert.equal("excelRow" in payload.rows[0], false);
  assert.equal(payload.rows[0]._id, "a1");
});

test("desactivar se nota como cambio", () => {
  const [row] = parseServiceRows([{ ID: "a1", Nombre: "Corte", Precio: 1, Duración: 10, Activo: "No" }]);
  const { rows } = buildPreview([row], [{ _id: "a1", name: "Corte", price: 1, duration: 10 }]);
  assert.deepEqual(rows[0].changes, ["Se desactiva"]);
});

test("columnas vacías o ausentes no cambian el servicio (como el servidor)", () => {
  const [row] = parseServiceRows([{ ID: "a1", Nombre: "Corte", Precio: 1, Duración: 10 }]);
  const existing = [{ _id: "a1", name: "Corte", price: 1, duration: 10, description: "Clásico", type: "Barbería", featured: true, hidePrice: true, isActive: false, maxConcurrentAppointments: 3 }];
  const { rows } = buildPreview([row], existing);
  assert.equal(rows[0].kind, "unchanged");
  assert.deepEqual(rows[0].changes, []);
});
