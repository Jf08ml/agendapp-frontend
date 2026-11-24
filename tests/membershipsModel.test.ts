import { test } from "node:test";
import assert from "node:assert/strict";
import { daysCell, daysLeft, filterCounts, isDueSoon, primaryAction } from "../src/pages/superadmin/membershipsModel.ts";

const now = Date.parse("2026-11-23T12:00:00Z");
const inDays = (d: number) => new Date(now + d * 86_400_000).toISOString();

test("días y su color", () => {
  assert.equal(daysLeft(inDays(10), now), 10);
  assert.deepEqual(daysCell(10), { text: "10 días", tone: "neutral" });
  assert.deepEqual(daysCell(7), { text: "7 días", tone: "warning" });
  assert.deepEqual(daysCell(3), { text: "3 días", tone: "danger" });
  assert.deepEqual(daysCell(1), { text: "1 día", tone: "danger" });
  assert.deepEqual(daysCell(0), { text: "Vence hoy", tone: "danger" });
  assert.deepEqual(daysCell(-2), { text: "Venció hace 2 días", tone: "danger" });
});

test("acción principal según el estado", () => {
  assert.equal(primaryAction("trial"), "activate");
  assert.equal(primaryAction("past_due"), "activate");
  assert.equal(primaryAction("expired"), "activate");
  assert.equal(primaryAction("suspended"), "reactivate");
  assert.equal(primaryAction("active"), "renew");
});

test("vencen pronto y conteos", () => {
  assert.equal(isDueSoon({ status: "active", currentPeriodEnd: inDays(5) }, now), true);
  assert.equal(isDueSoon({ status: "active", currentPeriodEnd: inDays(9) }, now), false);
  assert.equal(isDueSoon({ status: "suspended", currentPeriodEnd: inDays(2) }, now), false);
  const list = [
    { status: "active", currentPeriodEnd: inDays(5) },
    { status: "active", currentPeriodEnd: inDays(30) },
    { status: "trial", currentPeriodEnd: inDays(2) },
    { status: "suspended", currentPeriodEnd: inDays(-4) },
  ];
  assert.deepEqual(filterCounts(list, now), { all: 4, active: 2, trial: 1, past_due: 0, suspended: 1, due_soon: 2 });
});
