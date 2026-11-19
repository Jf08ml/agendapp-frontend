// Pruebas de la sugerencia de correo mal escrito del registro.
// Ejecutar: npm test  (node --test con TypeScript nativo de Node 24, sin navegador)
import { test } from "node:test";
import assert from "node:assert/strict";

import { suggestEmailFix } from "../src/utils/emailTypo.ts";

test("corrige los errores típicos de los proveedores comunes", () => {
  assert.equal(suggestEmailFix("pacheco@gamil.com"), "pacheco@gmail.com");
  assert.equal(suggestEmailFix("ana@gmial.com"), "ana@gmail.com");
  assert.equal(suggestEmailFix("ana@gmail.con"), "ana@gmail.com");
  assert.equal(suggestEmailFix("ana@gmail.co"), "ana@gmail.com");
  assert.equal(suggestEmailFix("ana@gmaill.com"), "ana@gmail.com");
  assert.equal(suggestEmailFix("ana@hotmial.com"), "ana@hotmail.com");
  assert.equal(suggestEmailFix("ana@hotmal.com"), "ana@hotmail.com");
  assert.equal(suggestEmailFix("ana@outlok.com"), "ana@outlook.com");
  assert.equal(suggestEmailFix("ana@yaho.com"), "ana@yahoo.com");
  assert.equal(suggestEmailFix("ana@gmal.co"), "ana@gmail.com");
  assert.equal(suggestEmailFix("ana@gmail"), "ana@gmail.com");
  assert.equal(suggestEmailFix(" Ana@Gmail.Con "), "ana@gmail.com");
});

test("no toca correos correctos ni dominios propios", () => {
  assert.equal(suggestEmailFix("ana@gmail.com"), null);
  assert.equal(suggestEmailFix("ana@hotmail.es"), null);
  assert.equal(suggestEmailFix("ana@gmx.com"), null);
  assert.equal(suggestEmailFix("ana@ymail.com"), null);
  assert.equal(suggestEmailFix("ana@mibarberia.co"), null);
  assert.equal(suggestEmailFix("ana@unal.edu.co"), null);
  assert.equal(suggestEmailFix("ana@spa.com"), null);
});

test("entradas incompletas no sugieren nada", () => {
  assert.equal(suggestEmailFix(""), null);
  assert.equal(suggestEmailFix("ana"), null);
  assert.equal(suggestEmailFix("ana@"), null);
  assert.equal(suggestEmailFix(undefined), null);
});
