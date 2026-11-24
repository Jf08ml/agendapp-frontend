import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gettingStartedSteps,
  progressOf,
  isGettingStartedHidden,
  isGettingStartedRelevant,
  tomorrowStart,
} from "../src/pages/admin/manageAgenda/components/gettingStartedModel.ts";

const base = {
  servicesCount: 0,
  employeesCount: 0,
  employeesWithServices: 0,
  scheduleSaved: false,
  hasAppointments: false,
  whatsappConnected: false,
  linkShared: false,
};

test("los 6 pasos en orden y el paso actual", () => {
  const steps = gettingStartedSteps(base);
  assert.deepEqual(steps.map((s) => s.key), ["service", "employee", "schedule", "appointment", "whatsapp", "share"]);
  assert.equal(progressOf(steps).current, "service");
  assert.equal(progressOf(steps).done, 0);
});

test("profesional sin servicios no cuenta; 3 de 6", () => {
  const p1 = progressOf(gettingStartedSteps({ ...base, servicesCount: 2, employeesCount: 1, employeesWithServices: 0 }));
  assert.equal(p1.done, 1);
  assert.equal(p1.current, "employee");
  const p2 = progressOf(gettingStartedSteps({ ...base, servicesCount: 2, employeesCount: 1, employeesWithServices: 1, scheduleSaved: true }));
  assert.equal(p2.done, 3);
  assert.equal(p2.current, "appointment");
});

test("solo para negocios nuevos o con lo básico pendiente", () => {
  const now = Date.UTC(2026, 10, 23);
  const basics = { ...base, servicesCount: 3, employeesCount: 2, employeesWithServices: 2, scheduleSaved: true, hasAppointments: true };
  const steps = gettingStartedSteps(basics); // falta WhatsApp y el enlace
  assert.equal(isGettingStartedRelevant(steps, "2025-01-10T00:00:00Z", now), false); // negocio de hace tiempo
  assert.equal(isGettingStartedRelevant(steps, null, now), false);
  assert.equal(isGettingStartedRelevant(steps, "2026-11-10T00:00:00Z", now), true); // configurado hace 13 días
  assert.equal(isGettingStartedRelevant(gettingStartedSteps({ ...basics, scheduleSaved: false }), "2025-01-10T00:00:00Z", now), true);
});

test("ocultar hasta mañana y no volver a mostrar", () => {
  const now = new Date(2026, 10, 23, 15, 0).getTime();
  const t = tomorrowStart(now);
  assert.equal(new Date(t).getDate(), 24);
  assert.equal(new Date(t).getHours(), 0);
  assert.equal(isGettingStartedHidden({ neverShow: false, hiddenUntilMs: t, nowMs: now }), true);
  assert.equal(isGettingStartedHidden({ neverShow: false, hiddenUntilMs: t, nowMs: t + 1 }), false);
  assert.equal(isGettingStartedHidden({ neverShow: true, hiddenUntilMs: null, nowMs: now }), true);
});
