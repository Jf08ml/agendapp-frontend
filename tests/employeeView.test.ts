import { test } from "node:test";
import assert from "node:assert/strict";
import {
  onlineBookingMode,
  onlineBookingFields,
  commissionLabel,
  findDuplicateContact,
  initials,
} from "../src/pages/admin/manageEmployees/employeeView.ts";

test("onlineBookingMode lee los dos campos", () => {
  assert.equal(onlineBookingMode({}), "visible");
  assert.equal(onlineBookingMode({ onlineBookingEnabled: true }), "visible");
  assert.equal(onlineBookingMode({ onlineBookingBackup: true }), "backup");
  assert.equal(onlineBookingMode({ onlineBookingEnabled: false, onlineBookingBackup: true }), "hidden");
});

test("onlineBookingFields vuelve a los dos campos", () => {
  assert.deepEqual(onlineBookingFields("visible"), { onlineBookingEnabled: true, onlineBookingBackup: false });
  assert.deepEqual(onlineBookingFields("backup"), { onlineBookingEnabled: true, onlineBookingBackup: true });
  assert.deepEqual(onlineBookingFields("hidden"), { onlineBookingEnabled: false, onlineBookingBackup: false });
  for (const m of ["visible", "backup", "hidden"] as const) {
    assert.equal(onlineBookingMode(onlineBookingFields(m)), m);
  }
});

test("commissionLabel", () => {
  const money = (n: number) => `$${n}`;
  assert.equal(commissionLabel("percentage", 30, money), "30 %");
  assert.equal(commissionLabel("fixed", 15000, money), "$15000 por cita");
  assert.equal(commissionLabel("percentage", 0, money), "—");
  assert.equal(commissionLabel(undefined, undefined, money), "—");
});

test("findDuplicateContact ignora al mismo profesional", () => {
  const others = [
    { _id: "a", email: "Ana@Mail.com", phoneNumber: "+57 300 123 4567" },
    { _id: "b", email: "beto@mail.com", phoneNumber: "3109998877" },
  ];
  assert.deepEqual(findDuplicateContact({ email: "ana@mail.com ", phoneNumber: "3001234567" }, others), {
    email: true,
    phone: true,
  });
  assert.deepEqual(findDuplicateContact({ _id: "a", email: "ana@mail.com", phoneNumber: "3001234567" }, others), {
    email: false,
    phone: false,
  });
  assert.deepEqual(findDuplicateContact({ email: "", phoneNumber: "" }, others), { email: false, phone: false });
});

test("initials", () => {
  assert.equal(initials("nataly  gómez ruiz"), "NG");
  assert.equal(initials(""), "");
});
