import React, { useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BiCheckCircle, BiError, BiTime, BiRefresh } from "react-icons/bi";
import { IconSend, IconEye, IconEyeOff } from "@tabler/icons-react";
import {
  createMetaTemplate,
  syncMetaTemplates,
} from "../../services/organizationService";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MetaTemplateDraft {
  name: string;
  category: string;
  language: string;
  headerText: string;
  bodyText: string;
  footerText: string;
}

export interface MetaTemplateStatus {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: { type: string; text?: string }[];
}

// ─── Defaults por tipo de plantilla ──────────────────────────────────────────

// Variables Baileys → Meta nombradas:
// {{names}}→{{nombre_cliente}}, {{dateRange}}/{{date}}/{{date_range}}→{{fecha_cita}},
// {{organization}}→{{nombre_negocio}}, {{address}}→{{direccion}},
// {{service}}→{{servicio}}, {{servicesList}}/{{services_list}}→{{lista_servicios}},
// {{employee}}→{{profesional}}, {{cancellationLink}}→{{enlace_cancelacion}},
// {{manage_block}}→{{enlace_gestion}}, {{appointments_list}}/{{appointmentsList}}→{{lista_citas}},
// {{reward}}→{{premio}}, {{count}}→{{cantidad_citas}},
// {{cita_pal}}→{{cita_o_citas}}, {{agendada_pal}}→{{agendada_o_agendadas}},
// {{recommendations}}→{{recomendaciones}}

const META_TEMPLATE_DEFAULTS: Record<string, MetaTemplateDraft> = {
  scheduleAppointmentBatch: {
    name: "confirmacion_cita",
    category: "UTILITY",
    language: "es",
    headerText: "Citas confirmadas",
    bodyText:
      "📅 ¡Hola, {{nombre_cliente}}!\n\n¡Tus citas han sido agendadas exitosamente!\n\n🗓️ Fecha: {{fecha_cita}}\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n✨ Servicios:\n{{lista_servicios}}\n👩‍💼 Te atenderá: {{profesional}}\n\n❌ Si necesitas cancelar tus citas, puedes hacerlo desde este enlace:\n{{enlace_cancelacion}}\n\nSi necesitas ajustar horarios o cambiar algún servicio, *responde a este chat* y con gusto te ayudamos.\n\n¡Te esperamos!",
    footerText: "",
  },
  recurringAppointmentSeries: {
    name: "citas_recurrentes",
    category: "UTILITY",
    language: "es",
    headerText: "Citas recurrentes confirmadas",
    bodyText:
      "🔁 ¡Hola, {{nombre_cliente}}!\n\n¡Tu serie de citas recurrentes ha sido creada exitosamente!\n\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n👩‍💼 Te atenderá: {{profesional}}\n\n📅 *Tus citas programadas:*\n{{lista_citas}}\n\n❌ *Cancelación flexible:*\nPuedes cancelar todas tus citas o solo algunas desde este enlace:\n{{enlace_cancelacion}}\n\nSi necesitas ajustar horarios o cambiar algún servicio, *responde a este chat* y con gusto te ayudamos.\n\n¡Te esperamos en cada sesión!",
    footerText: "",
  },
  reminder: {
    name: "recordatorio_cita",
    category: "UTILITY",
    language: "es",
    headerText: "Recordatorio de cita",
    bodyText:
      "📅 ¡Hola, {{nombre_cliente}}!\n\nRecuerda que tienes {{cantidad_citas}} {{cita_o_citas}} {{agendada_o_agendadas}}.\n\n🗓️ Fecha: {{fecha_cita}}\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n\n✨ Servicios:\n{{lista_servicios}}\n\n👩‍💼 Te atenderá: {{profesional}}\n{{recomendaciones}}\nGestiona tu cita desde el siguiente enlace:\n{{enlace_gestion}}\n\nPor favor confirma tu asistencia o cancela tu cita desde el enlace.\nSi necesitas ayuda, puedes responder a este mensaje.\n\n💖 ¡Te esperamos!",
    footerText: "",
  },
  secondReminder: {
    name: "segundo_recordatorio",
    category: "UTILITY",
    language: "es",
    headerText: "Tu cita es hoy",
    bodyText:
      "⏰ ¡Hola, {{nombre_cliente}}!\n\nTu cita es *muy pronto*.\n\n🗓️ Fecha: {{fecha_cita}}\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n\n✨ Servicios:\n{{lista_servicios}}\n\n👩‍💼 Te atenderá: {{profesional}}\n{{recomendaciones}}\nSi no puedes asistir, cancela tu cita desde el siguiente enlace:\n{{enlace_gestion}}\n\n💖 ¡Te esperamos!",
    footerText: "",
  },
  statusReservationPending: {
    name: "reserva_pendiente",
    category: "UTILITY",
    language: "es",
    headerText: "Solicitud de reserva recibida",
    bodyText:
      "⏳ ¡Hola, {{nombre_cliente}}!\n\nHemos recibido tu solicitud de reserva en *{{nombre_negocio}}*.\n\n📅 Fecha solicitada: {{fecha_cita}}\n✨ Servicio(s): {{lista_servicios}}\n\nTu reserva está *pendiente de confirmación*. Te notificaremos en cuanto sea aprobada.\n\nSi tienes alguna pregunta, responde a este mensaje. ¡Gracias!",
    footerText: "",
  },
  statusReservationApproved: {
    name: "reserva_aprobada",
    category: "UTILITY",
    language: "es",
    headerText: "Reserva aprobada",
    bodyText:
      "¡Hola, {{nombre_cliente}}! 🎉\n\nTu reserva para el {{fecha_cita}} en {{nombre_negocio}} ha sido *aprobada*.\n\n📍 Dirección: {{direccion}}\n✨ Servicio: {{servicio}}\n\n❌ Si necesitas cancelar tu reserva, puedes hacerlo desde este enlace:\n{{enlace_cancelacion}}\n\nSi tienes dudas o necesitas reprogramar, *responde a este chat de WhatsApp*. ¡Estamos para ayudarte!\n\n¡Te esperamos!",
    footerText: "",
  },
  statusReservationRejected: {
    name: "reserva_no_disponible",
    category: "UTILITY",
    language: "es",
    headerText: "Reserva no disponible",
    bodyText:
      "¡Hola, {{nombre_cliente}}! 👋\n\nLamentamos informarte que tu reserva para el *{{fecha_cita}}* en *{{nombre_negocio}}* no pudo ser confirmada, ya que el horario seleccionado no está disponible.\n\nSi deseas reprogramar o tienes alguna pregunta, simplemente responde a este mensaje de WhatsApp y con gusto te ayudaremos.\n\nGracias por tu comprensión. ¡Esperamos atenderte pronto! 😊",
    footerText: "",
  },
  clientConfirmationAck: {
    name: "confirmacion_asistencia",
    category: "UTILITY",
    language: "es",
    headerText: "Asistencia confirmada",
    bodyText:
      "¡Hola, {{nombre_cliente}}! ✅\n\nGracias por confirmar tu asistencia.\n\nEstas son tus cita(s):\n{{lista_citas}}\n\nSi necesitas cambiar o cancelar, puedes usar el mismo enlace que recibiste o responder este mensaje. ¡Nos vemos pronto! 😊",
    footerText: "",
  },
  clientCancellationAck: {
    name: "aviso_cancelacion",
    category: "UTILITY",
    language: "es",
    headerText: "Cita(s) cancelada(s)",
    bodyText:
      "¡Hola, {{nombre_cliente}}! ❌\n\nHemos registrado la cancelación de tu(s) cita(s):\n{{lista_citas}}\n\nGracias por avisarnos. Si deseas reprogramar, responde a este mensaje y te ayudamos con un nuevo horario.",
    footerText: "",
  },
  clientNoShowAck: {
    name: "aviso_no_asistencia",
    category: "UTILITY",
    language: "es",
    headerText: "Te echamos de menos",
    bodyText:
      "¡Hola, {{nombre_cliente}}! 👋\n\nNotamos que no pudiste asistir a tu cita:\n• {{servicio}} - {{fecha_cita}}\n\n📍 {{nombre_negocio}}\n\nSi deseas reprogramar tu cita, responde a este mensaje y con gusto te ayudamos a encontrar un nuevo horario. ¡Te esperamos pronto!",
    footerText: "",
  },
  loyaltyServiceReward: {
    name: "premio_fidelidad",
    category: "MARKETING",
    language: "es",
    headerText: "Ganaste un premio",
    bodyText:
      "🎉 ¡Felicitaciones, {{nombre_cliente}}!\n\nHas completado tu meta de servicios en *{{nombre_negocio}}*.\n\n🏅 Tu recompensa: *{{premio}}*\n\nPreséntate en tu próxima visita y reclama tu beneficio. ¡Gracias por tu fidelidad!",
    footerText: "",
  },
  loyaltyReferralReward: {
    name: "premio_referidos",
    category: "MARKETING",
    language: "es",
    headerText: "Premio por referidos",
    bodyText:
      "🎉 ¡Felicitaciones, {{nombre_cliente}}!\n\nHas alcanzado tu meta de referidos en *{{nombre_negocio}}*.\n\n🎁 Tu recompensa: *{{premio}}*\n\nPreséntate en tu próxima visita y reclama tu beneficio. ¡Gracias por recomendar nuestros servicios!",
    footerText: "",
  },
  // 📚 Módulo de Clases
  classEnrollmentConfirmed: {
    name: "clase_confirmada",
    category: "UTILITY",
    language: "es",
    headerText: "Inscripción confirmada",
    bodyText:
      "✅ ¡Hola, {{nombre_cliente}}!\n\nTu inscripción a la clase ha sido confirmada.\n\n📚 Clase: {{nombre_clase}}\n🗓️ Fecha: {{fecha_clase}}\n⏰ Horario: {{hora_inicio}} - {{hora_fin}}\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n💰 Valor: {{precio}}\n\n❌ Si necesitas cancelar tu inscripción, hazlo aquí:\n{{enlace_cancelacion}}\n\n¡Te esperamos!",
    footerText: "",
  },
  classEnrollmentPending: {
    name: "clase_pendiente",
    category: "UTILITY",
    language: "es",
    headerText: "Solicitud recibida",
    bodyText:
      "⏳ ¡Hola, {{nombre_cliente}}!\n\nHemos recibido tu solicitud de inscripción.\n\n📚 Clase: {{nombre_clase}}\n🗓️ Fecha: {{fecha_clase}}\n⏰ Horario: {{hora_inicio}} - {{hora_fin}}\n📍 Lugar: {{nombre_negocio}}\n💰 Valor: {{precio}}\n\nTu inscripción está pendiente de aprobación. Te avisaremos en cuanto sea confirmada.",
    footerText: "",
  },
  classEnrollmentCancelled: {
    name: "clase_cancelada",
    category: "UTILITY",
    language: "es",
    headerText: "Inscripción cancelada",
    bodyText:
      "❌ ¡Hola, {{nombre_cliente}}!\n\nTu inscripción a la siguiente clase ha sido cancelada:\n\n📚 Clase: {{nombre_clase}}\n🗓️ Fecha: {{fecha_clase}}\n⏰ Horario: {{hora_inicio}} - {{hora_fin}}\n📍 {{nombre_negocio}}\n\nSi deseas inscribirte en otra sesión, responde a este mensaje y con gusto te ayudamos.",
    footerText: "",
  },
  classReminder: {
    name: "recordatorio_clase",
    category: "UTILITY",
    language: "es",
    headerText: "Recordatorio de clase",
    bodyText:
      "🔔 ¡Hola, {{nombre_cliente}}!\n\nTe recordamos tu próxima clase:\n\n📚 Clase: {{nombre_clase}}\n🗓️ Fecha: {{fecha_clase}}\n⏰ Horario: {{hora_inicio}} - {{hora_fin}}\n📍 Lugar: {{nombre_negocio}}\n📍 Dirección: {{direccion}}\n\n¡Te esperamos! Si no puedes asistir, responde a este mensaje.",
    footerText: "",
  },
  // 🎂 Cumpleaños
  birthdayGreeting: {
    name: "cumpleanos_cliente",
    category: "MARKETING",
    language: "es",
    headerText: "¡Feliz cumpleaños!",
    bodyText:
      "🎂 ¡Feliz cumpleaños, {{nombre_cliente}}! 🎉\n\nDe parte de todo el equipo de *{{nombre_negocio}}*, te deseamos un día lleno de alegría.\n\n🎁 Como regalo de cumpleaños: {{beneficio}}\n\n¡Gracias por ser parte de nuestra familia! Te esperamos pronto para celebrarlo. 💖",
    footerText: "",
  },
  // 🔁 Recordatorio de seguimiento entre servicios relacionados
  followUpReminder: {
    name: "recordatorio_seguimiento",
    category: "MARKETING",
    language: "es",
    headerText: "Es hora de tu seguimiento",
    bodyText:
      "✨ ¡Hola, {{nombre_cliente}}!\n\nYa pasaron {{dias}} días desde tu {{servicio_original}} en *{{nombre_negocio}}*.\n\nEs un buen momento para agendar tu {{servicio_seguimiento}} y mantener tu resultado al día.\n\nSi tienes alguna pregunta o quieres agendar, responde a este mensaje. ¡Te esperamos! 💖",
    footerText: "",
  },
  // 🛍️ Tienda pública
  paymentReceived: {
    name: "pago_recibido",
    category: "UTILITY",
    language: "es",
    headerText: "Pago recibido",
    bodyText:
      "✅ ¡Hola, {{nombre_cliente}}!\n\nHemos recibido tu pago en *{{nombre_negocio}}*. 🎉\n\n💰 Monto pagado: {{monto}}\n🛍️ Tu pedido: {{detalle_pedido}}\n\n¡Gracias por tu compra! Si tienes alguna pregunta, responde a este mensaje.",
    footerText: "",
  },
  // 🔔 Mensajes del sistema (avisos al admin de la org)
  adminPaymentAlert: {
    name: "aviso_pago_admin",
    category: "UTILITY",
    language: "es",
    headerText: "Aviso de pago recibido",
    bodyText:
      "💰 *Aviso de pago recibido*\n\n🧾 Tipo: {{tipo}}\n💵 Monto: {{monto}}\n📄 Detalle: {{detalle}}\n📌 Estado: {{estado}}\n\nRevisa los detalles en tu panel de AgenditApp.",
    footerText: "",
  },
  adminNewOrderAlert: {
    name: "aviso_pedido_admin",
    category: "UTILITY",
    language: "es",
    headerText: "Nuevo pedido en tu tienda",
    bodyText:
      "🛍️ *Nuevo pedido en tu tienda*\n\n👤 Cliente: {{cliente}}\n📦 Pedido: {{pedido}}\n🚚 Entrega: {{entrega}}\n💳 Pago: {{pago}}\n\nGestiona el pedido desde tu panel de AgenditApp, en la sección Pedidos.",
    footerText: "",
  },
};

// ─── Ejemplos de variables para revisión de Meta ─────────────────────────────
// Meta rechaza plantillas sin ejemplos — estos valores muestran el contenido real al revisor.

const VARIABLE_EXAMPLES: Record<string, string> = {
  nombre_cliente: "Maria Garcia",
  fecha_cita: "lunes 13 de enero a las 10:00 AM",
  nombre_negocio: "Mi Negocio",
  direccion: "Calle 19 #27-38",
  lista_servicios: "Pestañas pelo a pelo",
  profesional: "Nataly Martinez",
  enlace_cancelacion: "https://agenditapp.com/cancelar/abc123",
  enlace_gestion: "https://agenditapp.com/gestionar/abc123",
  lista_citas: "Pestañas - lunes 13/01 a las 10:00 AM",
  servicio: "Pestañas pelo a pelo",
  premio: "Servicio gratuito",
  recomendaciones: "Evita mojar las pestañas las primeras 24h.",
  cantidad_citas: "2",
  cita_o_citas: "citas",
  agendada_o_agendadas: "agendadas",
  // 📚 Módulo de Clases
  nombre_clase: "Yoga para principiantes",
  fecha_clase: "lunes 13 de enero de 2026",
  hora_inicio: "07:00 AM",
  hora_fin: "08:00 AM",
  precio: "$25.000",
  // 🎂 Cumpleaños
  beneficio: "20% de descuento en tu próximo servicio",
  // 🔁 Recordatorio de seguimiento entre servicios relacionados
  servicio_seguimiento: "Retoque de pestañas",
  servicio_original: "Montura de pestañas pelo a pelo",
  dias: "20",
  // 🛍️ Tienda pública
  monto: "$45.000",
  detalle_pedido: "2× Shampoo, 1× Cera",
  // 🔔 Mensajes del sistema (avisos al admin)
  tipo: "reserva",
  detalle: "De: Juan Perez · Ref: 123456",
  estado: "Validado automáticamente con IA",
  cliente: "Maria Garcia",
  pedido: "3 productos · $45.000",
  entrega: "Domicilio: Calle 19 #27-38",
  pago: "Pagado",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es_AR", label: "Español (Argentina)" },
  { value: "en_US", label: "Inglés (EE.UU.)" },
  { value: "pt_BR", label: "Portugués (Brasil)" },
];

const CATEGORIES = [
  { value: "UTILITY", label: "Utilidad" },
  { value: "MARKETING", label: "Marketing" },
];

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  APPROVED: { color: "green", icon: <BiCheckCircle size={13} />, label: "Aprobada" },
  PENDING: { color: "yellow", icon: <BiTime size={13} />, label: "Pendiente revisión" },
  REJECTED: { color: "red", icon: <BiError size={13} />, label: "Rechazada" },
  DISABLED: { color: "gray", icon: <BiError size={13} />, label: "Desactivada" },
};

/**
 * Convierte variables con nombre ({{nombre_cliente}}) a posicionales ({{1}}).
 * Devuelve el texto convertido y el mapeo posición → nombre.
 */
function convertNamedToPositional(text: string): {
  converted: string;
  mapping: { position: number; name: string }[];
} {
  const seen: string[] = [];
  const converted = text.replace(/\{\{([a-zA-Z_]+)\}\}/g, (_match, varName: string) => {
    let idx = seen.indexOf(varName);
    if (idx === -1) {
      seen.push(varName);
      idx = seen.length - 1;
    }
    return `{{${idx + 1}}}`;
  });
  return {
    converted,
    mapping: seen.map((name, idx) => ({ position: idx + 1, name })),
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  templateKey: string;
  organizationId: string;
  /** Lista de plantillas Meta ya cargada por el padre — undefined = cargando */
  metaTemplates?: MetaTemplateStatus[];
  onRefreshMetaTemplates?: () => void;
}

const MetaTemplateFormTab: React.FC<Props> = ({
  templateKey,
  organizationId,
  metaTemplates,
  onRefreshMetaTemplates,
}) => {
  const defaults = META_TEMPLATE_DEFAULTS[templateKey];

  const [form, setForm] = useState<MetaTemplateDraft>(
    defaults ?? {
      name: templateKey.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      category: "UTILITY",
      language: "es",
      headerText: "",
      bodyText: "",
      footerText: "",
    }
  );

  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Derivar el estado de la plantilla actual desde la lista del padre
  const existing = useMemo(
    () => metaTemplates?.find((t) => t.name === form.name) ?? null,
    [metaTemplates, form.name]
  );

  // Mapeo calculado en tiempo real a partir del bodyText actual
  const { mapping } = convertNamedToPositional(form.bodyText);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncMetaTemplates(organizationId);
      onRefreshMetaTemplates?.();
      notifications.show({ color: "teal", message: "Estado sincronizado con Meta." });
    } catch {
      notifications.show({ color: "red", message: "Error al sincronizar con Meta." });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSubmit() {
    if (!form.bodyText.trim()) {
      notifications.show({ color: "orange", message: "El cuerpo del mensaje es obligatorio." });
      return;
    }

    setSubmitting(true);
    try {
      const { converted: convertedBody, mapping: bodyMapping } = convertNamedToPositional(form.bodyText);
      const { converted: convertedHeader, mapping: headerMapping } = convertNamedToPositional(form.headerText);
      const { converted: convertedFooter } = convertNamedToPositional(form.footerText);

      const components: object[] = [];

      if (convertedHeader.trim()) {
        const headerComponent: Record<string, unknown> = { type: "HEADER", format: "TEXT", text: convertedHeader.trim() };
        if (headerMapping.length > 0) {
          headerComponent.example = { header_text: headerMapping.map(({ name }) => VARIABLE_EXAMPLES[name] ?? name) };
        }
        components.push(headerComponent);
      }

      const bodyExamples = bodyMapping.map(({ name }) => VARIABLE_EXAMPLES[name] ?? name);
      const bodyComponent: Record<string, unknown> = { type: "BODY", text: convertedBody.trim() };
      if (bodyExamples.length > 0) {
        bodyComponent.example = { body_text: [bodyExamples] };
      }
      components.push(bodyComponent);

      if (convertedFooter.trim()) {
        components.push({ type: "FOOTER", text: convertedFooter.trim() });
      }

      await createMetaTemplate(organizationId, {
        name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
        category: form.category,
        language: form.language,
        components,
      });

      notifications.show({
        color: "green",
        message: "Plantilla enviada a revisión de Meta. Puede tardar hasta 24h.",
      });
      onRefreshMetaTemplates?.();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const rateLimitMinutes = data?.data?.rateLimitMinutes;
        const msg: string = data?.message || "Error al enviar plantilla";
        if (rateLimitMinutes != null) {
          notifications.show({
            color: "orange",
            title: "Límite de llamadas alcanzado",
            message: `${msg} Espera aprox. ${rateLimitMinutes} minuto(s) e intenta de nuevo.`,
            autoClose: 10000,
          });
        } else {
          notifications.show({ color: "red", message: msg });
        }
      } else {
        const msg = err instanceof Error ? err.message : "Error al enviar plantilla";
        notifications.show({ color: "red", message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const statusCfg = existing
    ? (STATUS_CONFIG[existing.status] ?? { color: "gray", icon: null, label: existing.status })
    : null;

  // metaTemplates === undefined → padre aún cargando
  const loadingStatus = metaTemplates === undefined;

  // Preview: sustituir {{nombre_variable}} con ejemplos
  function renderPreviewText(text: string): string {
    return text.replace(/\{\{([a-zA-Z_]+)\}\}/g, (_, name: string) => {
      return VARIABLE_EXAMPLES[name] ?? `[${name}]`;
    });
  }
  const previewHeader = renderPreviewText(form.headerText);
  const previewBody = renderPreviewText(form.bodyText);
  const previewFooter = renderPreviewText(form.footerText);

  return (
    <Stack gap="md">
      {/* Estado actual en Meta */}
      <Card withBorder radius="md" p="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Text size="sm" fw={600}>Estado en Meta:</Text>
            {loadingStatus ? (
              <Loader size="xs" />
            ) : existing && statusCfg ? (
              <Badge color={statusCfg.color} size="sm" leftSection={statusCfg.icon}>
                {statusCfg.label}
              </Badge>
            ) : (
              <Badge color="gray" size="sm">No enviada</Badge>
            )}
            {existing && (
              <Text size="xs" c="dimmed" ff="monospace">{existing.name}</Text>
            )}
          </Group>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<BiRefresh size={13} />}
            loading={syncing}
            onClick={handleSync}
          >
            Sincronizar
          </Button>
        </Group>
        {existing?.status === "REJECTED" && (
          <Alert color="red" mt="xs" p="xs">
            <Text size="xs">
              Meta rechazó la plantilla. Revisa el contenido (evita URLs acortadas, promociones
              agresivas o texto que infrinja las políticas de Meta) y vuelve a enviarla.
            </Text>
          </Alert>
        )}
      </Card>

      <Alert color="blue" p="xs">
        <Text size="xs">
          Usa <strong>{"{{nombre_variable}}"}</strong> para insertar datos dinámicos. Al enviar a
          revisión se convierten automáticamente al formato posicional de Meta{" "}
          <strong>{"{{1}}"}</strong>, <strong>{"{{2}}"}</strong>…
        </Text>
      </Alert>

      {/* Formulario */}
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="Nombre de la plantilla"
            description="Fijo — el sistema lo usa para enviar mensajes automáticamente"
            value={form.name}
            readOnly
            styles={{ input: { cursor: "default", background: "var(--mantine-color-gray-0)", color: "var(--mantine-color-dimmed)", fontFamily: "monospace" } }}
          />
          <Select
            label="Categoría"
            data={CATEGORIES}
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v ?? "UTILITY" }))}
          />
          <Select
            label="Idioma"
            data={LANGUAGES}
            value={form.language}
            onChange={(v) => setForm((f) => ({ ...f, language: v ?? "es" }))}
          />
        </Group>

        <TextInput
          label="Encabezado (opcional)"
          description="Máx. 60 caracteres. Meta no permite emojis, asteriscos ni saltos de línea en el encabezado."
          maxLength={60}
          value={form.headerText}
          onChange={(e) => {
            const headerText = e.currentTarget.value;
            setForm((f) => ({ ...f, headerText }));
          }}
          error={/[*_\n]|[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]/u.test(form.headerText) ? "Elimina emojis, asteriscos o saltos de línea" : undefined}
        />

        <Textarea
          label="Cuerpo del mensaje"
          description='Obligatorio. Usa {{nombre_variable}} para datos dinámicos.'
          required
          minRows={6}
          autosize
          maxRows={14}
          value={form.bodyText}
          onChange={(e) => {
            const bodyText = e.currentTarget.value;
            setForm((f) => ({ ...f, bodyText }));
          }}
          styles={{ input: { fontFamily: "'Courier New', monospace", fontSize: 13 } }}
        />

        <TextInput
          label="Pie de página (opcional)"
          description="Máx. 60 caracteres — no puede tener variables"
          maxLength={60}
          value={form.footerText}
          onChange={(e) => {
            const footerText = e.currentTarget.value;
            setForm((f) => ({ ...f, footerText }));
          }}
        />
      </Stack>

      {/* Mapeo de variables */}
      {mapping.length > 0 && (
        <Box>
          <Divider mb="xs" label="Conversión de variables" labelPosition="left" />
          <Table striped withTableBorder withColumnBorders fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre en el editor</Table.Th>
                <Table.Th>Valor que envía Meta</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mapping.map(({ position, name }) => (
                <Table.Tr key={name}>
                  <Table.Td ff="monospace">{`{{${name}}}`}</Table.Td>
                  <Table.Td ff="monospace" c="blue">{`{{${position}}}`}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      )}

      {/* Vista previa del mensaje */}
      <Box>
        <Divider
          mb="xs"
          label={
            <Button
              size="xs"
              variant="subtle"
              leftSection={previewOpen ? <IconEyeOff size={13} /> : <IconEye size={13} />}
              onClick={() => setPreviewOpen((o) => !o)}
            >
              {previewOpen ? "Ocultar vista previa" : "Vista previa"}
            </Button>
          }
          labelPosition="left"
        />
        <Collapse in={previewOpen}>
          <Box
            style={{
              background: "#ECE5DD",
              borderRadius: 10,
              padding: "12px 16px",
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          >
            <Box
              style={{
                background: "white",
                borderRadius: "8px 8px 8px 2px",
                padding: "10px 14px",
                maxWidth: "85%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.13)",
                display: "inline-block",
                minWidth: 180,
              }}
            >
              {previewHeader.trim() && (
                <Text fw={700} size="sm" mb={4} style={{ lineHeight: 1.4 }}>
                  {previewHeader}
                </Text>
              )}
              <Text
                size="sm"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.55, color: "#303030" }}
              >
                {previewBody || <Text size="sm" c="dimmed" fs="italic">Sin contenido aún…</Text>}
              </Text>
              {previewFooter.trim() && (
                <Text size="xs" c="dimmed" mt={4} style={{ lineHeight: 1.3 }}>
                  {previewFooter}
                </Text>
              )}
              <Text size="xs" c="dimmed" ta="right" mt={6} style={{ fontSize: 11 }}>
                {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} ✓✓
              </Text>
            </Box>
          </Box>
          <Text size="xs" c="dimmed" mt="xs">
            Vista previa con datos de ejemplo. El aspecto real puede variar según el dispositivo del cliente.
          </Text>
        </Collapse>
      </Box>

      <Group justify="flex-end">
        <Button
          leftSection={<IconSend size={16} />}
          onClick={handleSubmit}
          loading={submitting}
          disabled={existing?.status === "PENDING"}
        >
          {existing?.status === "PENDING" ? "Pendiente de revisión…" : "Enviar a revisión"}
        </Button>
      </Group>
    </Stack>
  );
};

export default MetaTemplateFormTab;
