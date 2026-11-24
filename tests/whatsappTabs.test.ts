import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappTabs, activeWhatsappTab } from "../src/components/whatsapp/whatsappTabsModel.ts";

test("pestañas de WhatsApp según permisos y método", () => {
  assert.deepEqual(
    whatsappTabs({ whatsappRead: true, campaignsRead: true, isMeta: true }).map((t) => t.label),
    ["Conexión", "Mensajes automáticos", "Plantillas de Meta", "Campañas", "Asistentes IA"]
  );
  // Sin Meta no hay Plantillas de Meta; sin campañas en el plan, no hay Campañas
  assert.deepEqual(
    whatsappTabs({ whatsappRead: true, campaignsRead: false, isMeta: false }).map((t) => t.key),
    ["conexion", "mensajes", "asistentes"]
  );
});

test("pestaña activa por ruta", () => {
  assert.equal(activeWhatsappTab("/gestionar-whatsapp", ""), "conexion");
  assert.equal(activeWhatsappTab("/gestionar-whatsapp", "?tab=asistentes"), "asistentes");
  assert.equal(activeWhatsappTab("/mensajes-whatsapp", ""), "mensajes");
  assert.equal(activeWhatsappTab("/mensajes-whatsapp", "?vista=plantillas-meta"), "plantillas");
  assert.equal(activeWhatsappTab("/admin/campaigns/new", ""), "campanas");
  assert.equal(activeWhatsappTab("/gestionar-agenda", ""), null);
});
