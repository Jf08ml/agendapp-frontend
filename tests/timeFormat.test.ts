// Formato de hora de la web pública: «2:00 p. m.» (design system).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { toSpanishMeridiem } from "../src/utils/timeFormatUtils.ts";

test("AM/PM pasan a «a. m.»/«p. m.» y el formato 24 h no cambia", () => {
  assert.equal(toSpanishMeridiem("2:00 PM"), "2:00 p. m.");
  assert.equal(toSpanishMeridiem("9:30 AM"), "9:30 a. m.");
  assert.equal(toSpanishMeridiem("14:00"), "14:00");
});
