import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionState,
  enrollmentState,
  paymentState,
  badgeClass,
  resolveClassTab,
  toggleAllVisible,
  toggleOne,
  occupancy,
} from "../src/pages/admin/classes/classesView.ts";

test("estados con palabra y tono", () => {
  assert.equal(sessionState("full").label, "Llena");
  assert.equal(sessionState("cancelled").tone, "neutral");
  assert.equal(enrollmentState("no_show").label, "No asistió");
  assert.equal(enrollmentState("raro").label, "raro");
  assert.equal(paymentState("partial").label, "Abono");
  assert.equal(paymentState(undefined).label, "Sin pagar");
  assert.equal(badgeClass("neutral"), "ag-badge");
  assert.equal(badgeClass("success"), "ag-badge ag-badge--success");
});

test("resolveClassTab", () => {
  assert.equal(resolveClassTab(null), "sesiones");
  assert.equal(resolveClassTab("salones"), "salones");
  assert.equal(resolveClassTab("otra"), "sesiones");
});

test("selección múltiple", () => {
  const s = new Set(["a"]);
  assert.deepEqual([...toggleAllVisible(s, ["a", "b"])].sort(), ["a", "b"]);
  assert.deepEqual([...toggleAllVisible(new Set(["a", "b", "z"]), ["a", "b"])], ["z"]);
  assert.deepEqual([...toggleAllVisible(new Set(), [])], []);
  assert.deepEqual([...toggleOne(s, "a")], []);
  assert.deepEqual([...toggleOne(s, "b")].sort(), ["a", "b"]);
  assert.equal(s.size, 1);
});

test("occupancy", () => {
  assert.equal(occupancy(6, 12), 50);
  assert.equal(occupancy(14, 12), 100);
  assert.equal(occupancy(3, 0), 0);
});
