// Pruebas de validación de IDs de píxeles (Meta y TikTok).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { isMetaPixelId, isTikTokPixelId } from "../src/utils/orgPixels.ts";

test("ID de píxel de Meta: solo dígitos", () => {
  assert.equal(isMetaPixelId("1234567890123456"), true);
  assert.equal(isMetaPixelId(" 123456789012345 "), true);
  assert.equal(isMetaPixelId("12345"), false);
  assert.equal(isMetaPixelId("fb-123456789012345"), false);
  assert.equal(isMetaPixelId(""), false);
});

test("ID de píxel de TikTok: mayúsculas y números", () => {
  assert.equal(isTikTokPixelId("C4ABCD1234EFGH5678IJ"), true);
  assert.equal(isTikTokPixelId("c4abcd1234efgh5678ij"), false);
  assert.equal(isTikTokPixelId("C4ABC"), false);
  assert.equal(isTikTokPixelId(undefined), false);
});
