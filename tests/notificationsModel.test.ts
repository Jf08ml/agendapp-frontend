import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanTitle, filterNotifications, relativeTime, pushState } from "../src/layouts/notificationsModel.ts";

test("filtro Todas / Sin leer, la más reciente primero", () => {
  const list = [
    { _id: "a", status: "read", createdAt: "2026-11-20T10:00:00Z" },
    { _id: "b", status: "unread", createdAt: "2026-11-22T10:00:00Z" },
    { _id: "c", status: "unread", createdAt: "2026-11-21T10:00:00Z" },
  ];
  assert.deepEqual(filterNotifications(list, "todas").map((n) => n._id), ["b", "c", "a"]);
  assert.deepEqual(filterNotifications(list, "sin_leer").map((n) => n._id), ["b", "c"]);
});

test("tiempo relativo", () => {
  const now = new Date(2026, 10, 23, 15, 0).getTime();
  assert.equal(relativeTime(now - 20_000, now), "Ahora");
  assert.equal(relativeTime(now - 5 * 60_000, now), "hace 5 min");
  assert.equal(relativeTime(now - 2 * 3_600_000, now), "hace 2 h");
  assert.equal(relativeTime(new Date(2026, 10, 22, 9, 0).getTime(), now), "Ayer");
  assert.equal(relativeTime(new Date(2026, 10, 20, 9, 0).getTime(), now), "hace 3 días");
  assert.equal(relativeTime(new Date(2026, 10, 12, 9, 0).getTime(), now), "12 nov");
});

test("los 4 estados de los avisos del dispositivo", () => {
  const base = { subscribed: false, permission: "default" as const, isIOS: false, standalone: false, hasPushManager: true };
  assert.equal(pushState(base), "off");
  assert.equal(pushState({ ...base, subscribed: true, permission: "granted" }), "on");
  assert.equal(pushState({ ...base, permission: "denied" }), "blocked");
  assert.equal(pushState({ ...base, isIOS: true }), "ios_install");
  assert.equal(pushState({ ...base, isIOS: true, standalone: true, subscribed: true, permission: "granted" }), "on");
  assert.equal(pushState({ ...base, hasPushManager: false }), "unsupported");
});

test("títulos sin emoji inicial", () => {
  assert.equal(cleanTitle("✅ Asistencia confirmada"), "Asistencia confirmada");
  assert.equal(cleanTitle("Nueva cita automática"), "Nueva cita automática");
});
