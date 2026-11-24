import { test } from "node:test";
import assert from "node:assert/strict";
import { CAMPAIGN_CHIPS, campaignStatus, humanizeSendError, sendBlockedReason } from "../src/pages/admin/campaigns/campaignsModel.ts";

test("estados sin emoji y con «Simulación»", () => {
  assert.equal(campaignStatus("dry-run").label, "Simulación");
  assert.equal(campaignStatus("running").label, "Enviando");
  assert.equal(campaignStatus("otro").label, "Desconocido");
  assert.deepEqual(CAMPAIGN_CHIPS.map((c) => c.label), ["Todas", "Enviando", "Completadas", "Simulaciones", "Canceladas", "Fallidas"]);
  for (const c of CAMPAIGN_CHIPS) assert.doesNotMatch(c.label, /\p{Extended_Pictographic}/u);
});

test("errores de Meta en palabras", () => {
  assert.match(humanizeSendError("(#131026) Message Undeliverable"), /no tiene WhatsApp/);
  assert.match(humanizeSendError("131047: Re-engagement message"), /24 horas/);
  assert.equal(humanizeSendError("algo raro"), "algo raro");
  assert.equal(humanizeSendError(undefined), "");
});

test("por qué no se puede enviar todavía", () => {
  assert.match(sendBlockedReason({ reviewedRecipients: false, reviewedMessage: false })!, /dos casillas/);
  assert.match(sendBlockedReason({ reviewedRecipients: true, reviewedMessage: false })!, /mensaje/);
  assert.equal(sendBlockedReason({ reviewedRecipients: true, reviewedMessage: true }), null);
});
