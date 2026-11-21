// Pruebas de los enlaces del perfil de Google del negocio.
// Ejecutar: npm test  (node --test con TypeScript nativo de Node 24, sin navegador)
import { test } from "node:test";
import assert from "node:assert/strict";

import { googleMapsPlaceUrl, googleReviewUrl, isValidPlaceId } from "../src/utils/googleReviews.ts";

const PLACE = "ChIJN1t_tDeuEmsRUsoyG83frY4";

test("enlaces de reseña y de la ficha a partir del Place ID", () => {
  assert.equal(googleReviewUrl(PLACE), `https://search.google.com/local/writereview?placeid=${PLACE}`);
  assert.equal(googleMapsPlaceUrl(` ${PLACE} `), `https://www.google.com/maps/place/?q=place_id:${PLACE}`);
});

test("sin Place ID válido no hay enlace", () => {
  assert.equal(googleReviewUrl(null), null);
  assert.equal(googleReviewUrl("abc"), null);
  assert.equal(googleReviewUrl("ChIJ<script>"), null);
  assert.ok(!isValidPlaceId(undefined));
});
