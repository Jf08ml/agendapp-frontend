import { test } from "node:test";
import assert from "node:assert/strict";
import { dropMinutes, dropStart, snapToQuarter, zonedDayStart } from "../src/components/customCalendar/components/dropTarget.ts";

test("snapToQuarter", () => {
  assert.equal(snapToQuarter(7), 0);
  assert.equal(snapToQuarter(8), 15);
  assert.equal(snapToQuarter(52), 45);
});

test("dropMinutes con el punto donde se agarró la tarjeta", () => {
  // columna en y=100, hora de 80 px; se suelta en y=300 agarrando la tarjeta 20 px abajo de su borde
  assert.equal(dropMinutes(300, 100, 20, 80, 12 * 60), 135); // (180/80)*60 = 135
  // por encima de la grilla → 0
  assert.equal(dropMinutes(90, 100, 0, 80, 600), 0);
  // más allá del final → último cuarto de hora
  assert.equal(dropMinutes(5000, 100, 0, 80, 600), 585);
});

test("dropStart usa la zona del negocio, no la del navegador", () => {
  // 20 de nov 2026, 15:00 UTC = 10:00 en Bogotá (UTC-5)
  const day = new Date("2026-11-20T15:00:00Z");
  assert.equal(zonedDayStart(day, "America/Bogota").toISOString(), "2026-11-20T05:00:00.000Z");
  // grilla desde las 8, se suelta 2 h después → 10:00 en Bogotá = 15:00 UTC
  assert.equal(dropStart(day, "America/Bogota", 8, 120).toISOString(), "2026-11-20T15:00:00.000Z");
  // mismo instante visto en Madrid (UTC+1): 16:00 del 20 → día 20 en Madrid
  assert.equal(dropStart(day, "Europe/Madrid", 8, 120).toISOString(), "2026-11-20T09:00:00.000Z");
  // 2:00 UTC del 21 = 21:00 del 20 en Bogotá → el día es el 20
  assert.equal(zonedDayStart(new Date("2026-11-21T02:00:00Z"), "America/Bogota").toISOString(), "2026-11-20T05:00:00.000Z");
});

test("dropStart en un día con cambio de horario (Santiago, sept 2026)", () => {
  const day = new Date("2026-09-06T15:00:00Z"); // Chile adelanta la hora el 6 de sept
  const start = dropStart(day, "America/Santiago", 9, 0);
  const local = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
  assert.equal(local, "09:00");
});
