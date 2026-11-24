// Pruebas del precio por sesión de los paquetes.
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { packageSavings, perSession, tierSessions } from "../src/utils/packagePricing.ts";

test("sesiones y precio por sesión del nivel", () => {
  assert.equal(tierSessions({ price: 100, sessionsIncluded: 4, courtesySessions: 1 }), 5);
  assert.equal(perSession({ price: 100, sessionsIncluded: 4, courtesySessions: 1 }), 20);
  assert.equal(perSession({ price: 100 }), null);
});

test("«ahorra hasta» frente al nivel más caro por sesión", () => {
  const tiers = [
    { price: 60000, sessionsIncluded: 4 }, // 15.000
    { price: 100000, sessionsIncluded: 8 }, // 12.500
    { price: 180000, sessionsIncluded: 12, courtesySessions: 2 }, // ~12.857
  ];
  assert.deepEqual(packageSavings(tiers), { minPerSession: 12500, upTo: 17 });
  assert.deepEqual(packageSavings([{ price: 50, sessionsIncluded: 5 }]), { minPerSession: 10, upTo: 0 });
  assert.deepEqual(packageSavings([]), { minPerSession: null, upTo: 0 });
});
