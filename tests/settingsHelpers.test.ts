// Pruebas de las ayudas de Ajustes (Fase 2).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  brandContrastAdvice,
  clientPolicyLines,
  copyDayToOpenDays,
  daysChangedByCopy,
  socialError,
  socialHandle,
  socialUrl,
} from "../src/pages/admin/OrganizationInfo/settingsHelpers.ts";

const week = () => [
  { day: 0, isOpen: false, start: "08:00", end: "20:00", breaks: [] },
  { day: 1, isOpen: true, start: "09:00", end: "18:00", breaks: [{ start: "13:00", end: "14:00" }] },
  { day: 2, isOpen: true, start: "08:00", end: "20:00", breaks: [] },
  { day: 6, isOpen: true, start: "08:00", end: "14:00", breaks: [] },
];

test("copiar lunes: solo a días abiertos, con descansos independientes", () => {
  const src = week();
  assert.equal(daysChangedByCopy(src), 2);
  const out = copyDayToOpenDays(src);
  assert.deepEqual(out[0], src[0]); // domingo cerrado intacto
  assert.equal(out[2].start, "09:00");
  assert.equal(out[3].end, "18:00");
  assert.deepEqual(out[3].breaks, [{ start: "13:00", end: "14:00" }]);
  assert.notEqual(out[3].breaks, src[1].breaks);
  assert.equal(daysChangedByCopy(out), 0);
});

test("política como la lee el cliente", () => {
  assert.deepEqual(clientPolicyLines({}), [
    "Puedes cancelar tu cita en cualquier momento antes de que empiece.",
    "Para cambiar el día o la hora, escríbele al negocio.",
  ]);
  const l = clientPolicyLines({ cancelMinHours: 24, preventCancellingConfirmed: true, rescheduleEnabled: true, maxReschedules: 2, rescheduleMinHours: 3 });
  assert.equal(l[0], "Puedes cancelar tu cita hasta 1 día antes. Después, escríbele al negocio.");
  assert.match(l[1], /confirmaste/);
  assert.equal(l[2], "Puedes cambiar el día o la hora hasta 2 veces, hasta 3 horas antes de la cita.");
  assert.match(clientPolicyLines({ cancelMinHours: 48 })[0], /2 días/);
  assert.match(clientPolicyLines({ rescheduleEnabled: true, maxReschedules: 1 })[1], /una vez, hasta el último momento/);
});

test("contraste de marca en lenguaje claro", () => {
  assert.equal(brandContrastAdvice("#111111")?.tone, "success");
  assert.match(brandContrastAdvice("#111111")!.text, /texto blanco/);
  const yellow = brandContrastAdvice("#ffd43b")!;
  assert.equal(yellow.tone, "info");
  assert.match(yellow.text, /texto oscuro/);
  assert.ok(yellow.adjustedText && yellow.adjustedText !== "#ffd43b");
  assert.equal(brandContrastAdvice(""), null);
});

test("redes: usuario → enlace y de vuelta", () => {
  assert.equal(socialUrl("instagram", "@galaxia.glamour"), "https://instagram.com/galaxia.glamour");
  assert.equal(socialUrl("instagram", "https://www.instagram.com/galaxia.glamour/?hl=es"), "https://instagram.com/galaxia.glamour");
  assert.equal(socialUrl("tiktok", "galaxia"), "https://tiktok.com/@galaxia");
  assert.equal(socialUrl("facebook", "https://m.facebook.com/profile.php?id=123"), "https://facebook.com/profile.php?id=123");
  assert.equal(socialUrl("whatsapp", "+57 300 123 4567"), "https://wa.me/573001234567");
  assert.equal(socialUrl("whatsapp", "https://api.whatsapp.com/send?phone=573001234567"), "https://wa.me/573001234567");
  assert.equal(socialUrl("instagram", ""), "");
  assert.equal(socialHandle("tiktok", "https://www.tiktok.com/@galaxia?lang=es"), "galaxia");
  assert.equal(socialHandle("instagram", "https://facebook.com/x"), null);
});

test("redes: validación", () => {
  assert.equal(socialError("instagram", ""), null);
  assert.equal(socialError("instagram", "https://instagram.com/galaxia"), null);
  assert.match(socialError("instagram", "https://facebook.com/galaxia")!, /no es de Instagram/);
  assert.equal(socialUrl("instagram", "https://facebook.com/galaxia"), "https://facebook.com/galaxia");
  assert.match(socialError("whatsapp", "https://wa.me/300")!, /indicativo/);
  assert.match(socialError("instagram", "https://instagram.com/mi cuenta")!, /letras/);
});

test("redes: solo «@» o «+» no guarda un enlace vacío", () => {
  assert.equal(socialUrl("instagram", "@"), "");
  assert.equal(socialUrl("whatsapp", "+"), "");
});
