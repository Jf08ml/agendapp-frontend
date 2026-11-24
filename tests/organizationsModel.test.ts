import { test } from "node:test";
import assert from "node:assert/strict";
import { activityDetail, activityStatus, daysSince } from "../src/pages/superadmin/organizationsModel.ts";

const now = Date.parse("2026-11-23T12:00:00Z");
const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();

test("estado de actividad", () => {
  assert.equal(activityStatus(false, { totalAppointments: 5, lastAppointmentAt: ago(1) }, now), "unconfigured");
  assert.equal(activityStatus(true, undefined, now), "no_appointments");
  assert.equal(activityStatus(true, { totalAppointments: 0 }, now), "no_appointments");
  assert.equal(activityStatus(true, { totalAppointments: 3, lastAppointmentAt: ago(30) }, now), "active");
  assert.equal(activityStatus(true, { totalAppointments: 3, lastAppointmentAt: ago(31) }, now), "inactive");
});

test("detalle de la última cita", () => {
  assert.equal(activityDetail("unconfigured", ago(3), now), null);
  assert.equal(activityDetail("no_appointments", null, now), "Nunca ha agendado");
  assert.equal(activityDetail("active", ago(0), now), "Última cita: hoy");
  assert.equal(activityDetail("active", ago(1), now), "Última cita: hace 1 día");
  assert.equal(activityDetail("inactive", ago(45), now), "Última cita: hace 45 días");
  assert.equal(daysSince(undefined, now), null);
});
