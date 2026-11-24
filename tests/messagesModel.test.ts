import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_GROUPS,
  messageToggle,
  isMessageOn,
  toReadable,
  fromReadable,
  previewText,
} from "../src/pages/admin/whatsappMessages/messagesModel.ts";

test("grupos del diseño, sin mensajes repetidos", () => {
  assert.deepEqual(MESSAGE_GROUPS.map((g) => g.label), ["Citas", "Recordatorios", "Reservas online", "Clientes", "Fidelidad", "Tienda", "Avisos para ti"]);
  const all = MESSAGE_GROUPS.flatMap((g) => g.keys);
  assert.equal(new Set(all).size, all.length);
});

test("interruptores: cada confirmación con el suyo; recordatorios siempre", () => {
  assert.deepEqual(messageToggle("scheduleAppointment"), { kind: "switch", settings: ["scheduleAppointment"] });
  assert.deepEqual(messageToggle("scheduleAppointmentBatch"), { kind: "switch", settings: ["scheduleAppointmentBatch"] });
  assert.equal(messageToggle("reminder").kind, "always");
  assert.equal(messageToggle("myBookingsLink").kind, "always");
  assert.equal(messageToggle("statusReservationApproved").kind, "soon");
  assert.equal(isMessageOn("birthdayGreeting", { birthdayGreeting: false }), false);
  assert.equal(isMessageOn("clientNoShowAck", {}), true);
  assert.equal(isMessageOn("scheduleAppointmentBatch", { scheduleAppointmentBatch: false, scheduleAppointment: true }), false);
});

test("variables legibles: ida y vuelta sin perder nada", () => {
  const vars = ["{{names}}", "{{date}}", "{{organization}}", "{{cancellationLink}}"];
  const original = "Hola {{names}}, tu cita en {{organization}} es el {{date}}.\nCancela: {{cancellationLink}} [nota] {{otra}}";
  const readable = toReadable(original, vars);
  assert.equal(
    readable,
    "Hola [Nombre del cliente], tu cita en [Nombre del negocio] es el [Fecha y hora].\nCancela: [Enlace para cancelar] [nota] {{otra}}"
  );
  assert.equal(fromReadable(readable, vars), original);
});

test("vista previa con datos de ejemplo", () => {
  assert.equal(previewText("Hola {{names}}, te esperamos en {{organization}}", "Galaxia"), "Hola Laura, te esperamos en Galaxia");
});
