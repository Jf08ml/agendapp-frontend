// Pruebas de «Agregar a mi calendario» (.ics + Google Calendar).
// Ejecutar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildIcs,
  googleCalendarUrl,
  icsFileName,
  readPendingCalendar,
  savePendingCalendar,
  toInstant,
} from "../src/utils/addToCalendar.ts";

test("hora sin zona se interpreta en la zona del negocio", () => {
  assert.equal(toInstant("2026-11-25T14:00:00", "America/Bogota")?.toISOString(), "2026-11-25T19:00:00.000Z");
  assert.equal(toInstant("2026-11-25T14:00", "America/Mexico_City")?.toISOString(), "2026-11-25T20:00:00.000Z");
  // Madrid en verano (+2) e invierno (+1)
  assert.equal(toInstant("2026-07-01T10:00:00", "Europe/Madrid")?.toISOString(), "2026-07-01T08:00:00.000Z");
  assert.equal(toInstant("2026-12-01T10:00:00", "Europe/Madrid")?.toISOString(), "2026-12-01T09:00:00.000Z");
});

test("hora con zona o Date es un instante exacto", () => {
  assert.equal(toInstant("2026-11-25T14:00:00-05:00", "Europe/Madrid")?.toISOString(), "2026-11-25T19:00:00.000Z");
  assert.equal(toInstant("2026-11-25T19:00:00.000Z")?.toISOString(), "2026-11-25T19:00:00.000Z");
  const d = new Date("2026-11-25T19:00:00Z");
  assert.equal(toInstant(d), d);
  assert.equal(toInstant("mañana"), null);
  assert.equal(toInstant(""), null);
});

test(".ics con UTC, fin por duración, texto escapado y aviso", () => {
  const ics = buildIcs(
    [{ title: "Corte, barba; y cejas", start: "2026-11-25T14:00:00", durationMinutes: 45, timezone: "America/Bogota", location: "Calle 1 # 2-3", uid: "abc" }],
    new Date("2026-11-24T00:00:00Z")
  );
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20261125T190000Z\r\n/);
  assert.match(ics, /DTEND:20261125T194500Z\r\n/);
  assert.match(ics, /SUMMARY:Corte\\, barba\\; y cejas\r\n/);
  assert.match(ics, /UID:abc@agenditapp/);
  assert.match(ics, /TRIGGER:-PT1H/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test("varios eventos en un archivo; los inválidos se omiten", () => {
  const ics = buildIcs([
    { title: "Yoga", start: "2026-11-25T12:00:00Z", end: "2026-11-25T13:00:00Z" },
    { title: "Yoga", start: "2026-11-27T12:00:00Z", end: "2026-11-27T13:00:00Z" },
    { title: "Rota", start: "nada" },
  ]);
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
});

test("líneas largas se pliegan a 75 octetos", () => {
  const ics = buildIcs([{ title: "Ñ".repeat(80), start: "2026-11-25T12:00:00Z" }]);
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(ics.includes("\r\n Ñ"));
});

test("enlace de Google Calendar", () => {
  const url = googleCalendarUrl({ title: "Manicure", start: "2026-11-25T19:00:00Z", end: "2026-11-25T20:00:00Z", location: "Galaxia Glamour" });
  assert.ok(url?.startsWith("https://calendar.google.com/calendar/render?"));
  const p = new URL(url!).searchParams;
  assert.equal(p.get("action"), "TEMPLATE");
  assert.equal(p.get("text"), "Manicure");
  assert.equal(p.get("dates"), "20261125T190000Z/20261125T200000Z");
  assert.equal(p.get("location"), "Galaxia Glamour");
  assert.equal(googleCalendarUrl({ title: "x", start: "nada" }), null);
});

test("nombre de archivo legible", () => {
  assert.equal(icsFileName("Cita en Galaxia Glamour"), "cita-en-galaxia-glamour.ics");
  assert.equal(icsFileName("¡¡!!"), "cita.ics");
});

test("evento pendiente del pago: se guarda y caduca", () => {
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  savePendingCalendar("ref1", [{ title: "Uñas", start: new Date("2026-11-25T19:00:00Z") }], store);
  const back = readPendingCalendar("ref1", store);
  assert.equal(back.length, 1);
  assert.equal(back[0].start, "2026-11-25T19:00:00.000Z");
  assert.deepEqual(readPendingCalendar("otra", store), []);
  assert.deepEqual(readPendingCalendar("ref1", store, Date.now() + 3 * 86400000), []);
  assert.equal(mem.size, 0);
});
