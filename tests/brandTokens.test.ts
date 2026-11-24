// Pruebas de la marca por negocio → tokens (design system, «Marca por negocio»).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_BRAND,
  buildBrandTokens,
  contrast,
  generateBrandScale,
  readableBrandText,
  resolveBrandColor,
} from "../src/theme/brandTokens.ts";

test("respaldo azul AgenditApp sin color, con color inválido o sin customBranding", () => {
  assert.equal(resolveBrandColor(undefined), DEFAULT_BRAND);
  assert.equal(resolveBrandColor("blue"), DEFAULT_BRAND);
  assert.equal(resolveBrandColor("#F4A6C6", false), DEFAULT_BRAND);
  assert.equal(resolveBrandColor("#F4A6C6"), "#f4a6c6");
  assert.equal(resolveBrandColor("#abc"), "#aabbcc");
});

test("la escala tiene 10 tonos distintos con la marca exacta en el índice 6", () => {
  const scale = generateBrandScale("#2f6f5e");
  assert.equal(scale.length, 10);
  assert.equal(scale[6], "#2f6f5e");
  assert.equal(new Set(scale).size, 10);
  // de claro a oscuro
  assert.ok(contrast(scale[0], "#ffffff") < contrast(scale[9], "#ffffff"));
});

test("brand-text llega a 4.5:1 sobre surface y no cambia una marca ya legible", () => {
  assert.equal(readableBrandText("#1c3461", "light"), "#1c3461");
  for (const hex of ["#f5c518", "#f4a6c6", "#ffffff"]) {
    assert.ok(contrast(readableBrandText(hex, "light"), "#ffffff") >= 4.5, hex);
  }
  assert.ok(contrast(readableBrandText("#1c3461", "dark"), "#0c0d10") >= 4.5);
});

test("on-brand: ink sobre marcas claras, blanco sobre oscuras", () => {
  assert.equal(buildBrandTokens("#f5c518", null, "light")["on-brand"], "#1a1b1e");
  assert.equal(buildBrandTokens("#f4a6c6", null, "light")["on-brand"], "#1a1b1e");
  assert.equal(buildBrandTokens("#000000", null, "light")["on-brand"], "#ffffff");
  assert.equal(buildBrandTokens("#1c3461", null, "light")["on-brand"], "#ffffff");
});

test("marca negra: brand-soft neutro y en oscuro el botón pasa a ink", () => {
  const light = buildBrandTokens("#000000", null, "light");
  assert.equal(light["brand-soft"], "#f1f3f5");
  const dark = buildBrandTokens("#000000", null, "dark");
  assert.equal(dark.brand, "#f1f3f5");
  assert.equal(dark["on-brand"], "#0c0d10");
});

test("brand-accent usa secondaryColor y, sin él, la marca", () => {
  assert.equal(buildBrandTokens("#000000", "#C9A96E", "light")["brand-accent"], "#c9a96e");
  assert.equal(buildBrandTokens("#2f6f5e", undefined, "light")["brand-accent"], "#2f6f5e");
});

test("textOn: texto legible sobre cualquier color", async () => {
  const { textOn } = await import("../src/theme/brandTokens.ts");
  assert.equal(textOn("#1c3461"), "#ffffff"); // azul oscuro → blanco
  assert.equal(textOn("#f5d90a"), "#1a1b1e"); // amarillo → ink
  assert.equal(textOn("var(--pro-1)"), "#ffffff"); // variable CSS → como antes
  assert.equal(textOn(null), "#ffffff");
});
