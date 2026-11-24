import { test } from "node:test";
import assert from "node:assert/strict";
import { graceInfo, statusNotice, STATUS_LABELS } from "../src/pages/admin/membershipModel.ts";

const DAY = 86_400_000;

test("los 7 estados tienen nombre", () => {
  for (const s of ["trial", "active", "pending", "past_due", "suspended", "cancelled", "expired"]) assert.ok(STATUS_LABELS[s], s);
});

test("aviso del estado con una sola acción", () => {
  assert.equal(statusNotice("active", 30, true), null);
  assert.deepEqual(statusNotice("active", 5, true)?.action, "renew");
  assert.match(statusNotice("active", 5, true)!.title, /5 días/);
  assert.equal(statusNotice("trial", 1, false)?.title, "Tu prueba termina en 1 día");
  assert.equal(statusNotice("trial", 1, false)?.action, "choose");
  assert.equal(statusNotice("past_due", -1, true)?.action, "renew");
  assert.equal(statusNotice("suspended", -5, false)?.tone, "danger");
  assert.equal(statusNotice("expired", -9, true)?.action, "choose");
});

test("periodo de gracia: quedan 2 de 3 días", () => {
  const end = Date.UTC(2026, 10, 20, 12);
  // pasó un día y un poco: quedan 1,99 días → «Quedan 2 de 3»
  const g = graceInfo(end, end + 1 * DAY + 1000);
  assert.equal(g.left, 2);
  assert.equal(g.total, 3);
  assert.equal(g.cutMs, end + 3 * DAY);
  assert.equal(graceInfo(end, end + 5 * DAY).left, 0);
});
