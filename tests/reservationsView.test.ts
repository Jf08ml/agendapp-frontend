import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reservationsTabs,
  resolveReservationsTab,
  formatPendingCount,
  whenBucket,
  relativeWhen,
  originLabel,
  paymentMeta,
  STATUS_META,
} from "../src/pages/admin/manageReservation/reservationsView.ts";

test("pestañas según la política", () => {
  assert.deepEqual(reservationsTabs("manual", 0, 0), ["por_confirmar", "vencidas", "historial", "configuracion"]);
  assert.deepEqual(reservationsTabs("auto_if_available", 0, 0), ["historial", "configuracion"]);
  // automática con una pendiente por falta de cupo: aparece la bandeja
  assert.deepEqual(reservationsTabs("auto_if_available", 1, 0), ["por_confirmar", "historial", "configuracion"]);
  assert.deepEqual(reservationsTabs("auto_if_available", 0, 2), ["vencidas", "historial", "configuracion"]);
});

test("resolveReservationsTab", () => {
  const manual = reservationsTabs("manual", 0, 0);
  assert.equal(resolveReservationsTab(null, manual), "por_confirmar");
  assert.equal(resolveReservationsTab("historial", manual), "historial");
  const auto = reservationsTabs("auto_if_available", 0, 0);
  assert.equal(resolveReservationsTab("por_confirmar", auto), "historial");
});

test("contador del menú", () => {
  assert.equal(formatPendingCount(0), null);
  assert.equal(formatPendingCount(undefined), null);
  assert.equal(formatPendingCount(4), "4");
  assert.equal(formatPendingCount(99), "99");
  assert.equal(formatPendingCount(150), "99+");
});

test("Hoy / Esta semana / Más adelante", () => {
  assert.equal(whenBucket("2026-11-23", "2026-11-23"), "hoy");
  assert.equal(whenBucket("2026-11-24", "2026-11-23"), "semana");
  assert.equal(whenBucket("2026-11-30", "2026-11-23"), "semana");
  assert.equal(whenBucket("2026-12-01", "2026-11-23"), "despues");
});

test("tiempo relativo", () => {
  const now = Date.UTC(2026, 10, 23, 15, 0);
  assert.equal(relativeWhen(now + 40 * 60_000, now, 0), "en 40 min");
  assert.equal(relativeWhen(now + 2 * 3_600_000, now, 0), "en 2 h");
  assert.equal(relativeWhen(now + 20 * 3_600_000, now, 1), "mañana");
  assert.equal(relativeWhen(now + 3 * 86_400_000, now, 3), "en 3 días");
  assert.equal(relativeWhen(now - 30 * 60_000, now, 0), "hace 30 min");
  assert.equal(relativeWhen(now - 3 * 86_400_000, now, -3), "hace 3 días");
});

test("origen, abono y los 7 estados", () => {
  assert.equal(originLabel("ai_chatbot"), "Chat IA");
  assert.equal(originLabel("admin"), "Panel");
  assert.equal(originLabel(undefined), "Web");
  assert.equal(paymentMeta("in_review")?.tone, "warning");
  assert.equal(paymentMeta("refunded"), null);
  assert.equal(Object.keys(STATUS_META).length, 7);
  assert.equal(STATUS_META.auto_approved.label, "Confirmada sola");
});
