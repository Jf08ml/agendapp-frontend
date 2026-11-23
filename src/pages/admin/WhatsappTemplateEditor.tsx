/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Textarea,
  Button,
  Alert,
  Group,
  ActionIcon,
  Tooltip,
  Loader,
  Box,
  Switch,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  MESSAGE_GROUPS,
  fromReadable,
  isMessageOn,
  labelFor,
  messageToggle,
  previewText,
  toReadable,
} from "./whatsappMessages/messagesModel";
import {
  IconDeviceFloppy,
  IconRestore,
  IconInfoCircle,
  IconChevronLeft,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import whatsappTemplateService, {
  WhatsappTemplates,
  WhatsappTemplateSettings,
} from "../../services/whatsappTemplateService";
import { handleAxiosError } from "../../utils/handleAxiosError";
import MetaTemplateFormTab, { MetaTemplateStatus } from "./MetaTemplateFormTab";
import MetaTemplatesPanel from "./manageWhatsapp/MetaTemplatesPanel";
import WhatsappTabs from "../../components/whatsapp/WhatsappTabs";
import { useSearchParams } from "react-router-dom";
import { listMetaTemplates, MetaTemplateDraftSaved } from "../../services/organizationService";

// ─── Metadata de plantillas ───────────────────────────────────────────────────

const templateInfo = {
  scheduleAppointment: {
    title: "Confirmación de Cita",
    shortTitle: "Confirmación (una cita)",
    description: "Mensaje enviado cuando se agenda una cita individual",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha y hora de la cita" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar la cita" },
    ],
  },
  scheduleAppointmentBatch: {
    title: "Confirmación de Citas",
    shortTitle: "Confirmación (varias citas)",
    description: "Mensaje enviado cuando se agendan varias citas juntas",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{dateRange}}", desc: "Rango de fechas de las citas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{servicesList}}", desc: "Lista de servicios agendados" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar las citas" },
    ],
  },
  recurringAppointmentSeries: {
    title: "Citas Recurrentes",
    shortTitle: "Citas recurrentes",
    description: "Mensaje enviado cuando se crea una serie de citas recurrentes",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{appointmentsList}}", desc: "Lista completa de citas con fechas y horarios" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar todas o algunas citas" },
    ],
  },
  rescheduleAppointment: {
    title: "Cita Reprogramada",
    shortTitle: "Reprogramación (individual)",
    description: "Aviso al cliente cuando reprogramas su cita desde la agenda (si dejas marcada la casilla al guardar)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{previousDate}}", desc: "Fecha y hora anterior de la cita" },
      { name: "{{date}}", desc: "Nueva fecha y hora de la cita" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar la cita" },
    ],
  },
  rescheduleAppointmentSeries: {
    title: "Citas Reprogramadas",
    shortTitle: "Reprogramación (serie)",
    description: "Aviso al cliente cuando reprogramas varias citas de su serie (\"esta y las siguientes\")",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{appointmentsList}}", desc: "Lista de citas con sus nuevos horarios" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar todas o algunas citas" },
    ],
  },
  reminder: {
    title: "Primer Recordatorio",
    shortTitle: "Primer recordatorio",
    description: "Recordatorio enviado antes de la cita (ej: 24 horas antes)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{count}}", desc: "Número de citas" },
      { name: "{{cita_pal}}", desc: "'cita' o 'citas' (automático)" },
      { name: "{{agendada_pal}}", desc: "'agendada' o 'agendadas' (automático)" },
      { name: "{{date_range}}", desc: "Fecha o rango de fechas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{services_list}}", desc: "Lista de servicios" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{manage_block}}", desc: "Enlace para confirmar o cancelar" },
      { name: "{{recommendations}}", desc: "Recomendaciones del servicio" },
    ],
  },
  secondReminder: {
    title: "Segundo Recordatorio",
    shortTitle: "Segundo recordatorio",
    description: "Recordatorio enviado poco antes de la cita (ej: 2 horas antes)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{count}}", desc: "Número de citas" },
      { name: "{{cita_pal}}", desc: "'cita' o 'citas' (automático)" },
      { name: "{{agendada_pal}}", desc: "'agendada' o 'agendadas' (automático)" },
      { name: "{{date_range}}", desc: "Fecha o rango de fechas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{services_list}}", desc: "Lista de servicios" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{manage_block}}", desc: "Enlace para confirmar o cancelar" },
      { name: "{{recommendations}}", desc: "Recomendaciones del servicio" },
    ],
  },
  statusReservationPending: {
    title: "Reserva Recibida",
    shortTitle: "Reserva pendiente",
    description: "Mensaje al cliente cuando su solicitud de reserva está pendiente de aprobación",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha y hora solicitada" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{servicesList}}", desc: "Lista de servicios solicitados" },
    ],
  },
  statusReservationApproved: {
    title: "Reserva Aprobada",
    shortTitle: "Reserva aprobada",
    description: "Mensaje cuando una reserva es aprobada",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha de la reserva" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar" },
    ],
  },
  statusReservationRejected: {
    title: "Reserva Rechazada",
    shortTitle: "Reserva rechazada",
    description: "Mensaje cuando una reserva no puede ser confirmada",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha de la reserva" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  clientConfirmationAck: {
    title: "Confirmación de Asistencia",
    shortTitle: "Confirmar asistencia",
    description: "Mensaje enviado al cliente cuando confirma su asistencia",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{appointments_list}}", desc: "Lista de citas con fecha/hora" },
    ],
  },
  clientCancellationAck: {
    title: "Aviso de Cancelación",
    shortTitle: "Aviso cancelación",
    description: "Mensaje enviado al cliente cuando cancela su(s) cita(s)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{appointments_list}}", desc: "Lista de citas con fecha/hora" },
    ],
  },
  clientNoShowAck: {
    title: "Aviso de No Asistencia",
    shortTitle: "No asistencia",
    description: "Mensaje enviado al cliente cuando se marca que no asistió a su cita",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{date}}", desc: "Fecha y hora de la cita" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  loyaltyServiceReward: {
    title: "Premio de Fidelidad (Servicios)",
    shortTitle: "Premio fidelidad",
    description: "Mensaje cuando el cliente completa su meta de servicios",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{reward}}", desc: "Descripción de la recompensa ganada" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{cardUrl}}", desc: "Enlace a la tarjeta virtual de fidelidad del cliente" },
    ],
  },
  loyaltyReferralReward: {
    title: "Premio de Referidos",
    shortTitle: "Premio referidos",
    description: "Mensaje cuando el cliente completa su meta de referidos",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{reward}}", desc: "Descripción de la recompensa ganada" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{cardUrl}}", desc: "Enlace a la tarjeta virtual de fidelidad del cliente" },
    ],
  },
  loyaltyServiceProgress: {
    title: "Progreso de Fidelidad (Servicios)",
    shortTitle: "Progreso servicios",
    description: "Mensaje cuando se registra un servicio, sin completar la meta aún",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{cardUrl}}", desc: "Enlace a la tarjeta virtual de fidelidad del cliente" },
      { name: "{{currentCount}}", desc: "Servicios acumulados hasta ahora" },
      { name: "{{remaining}}", desc: "Cuántos faltan para el próximo premio" },
      { name: "{{nextReward}}", desc: "Descripción del próximo premio" },
    ],
  },
  loyaltyReferralProgress: {
    title: "Progreso de Referidos",
    shortTitle: "Progreso referidos",
    description: "Mensaje cuando se registra un referido, sin completar la meta aún",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{cardUrl}}", desc: "Enlace a la tarjeta virtual de fidelidad del cliente" },
      { name: "{{currentCount}}", desc: "Referidos acumulados hasta ahora" },
      { name: "{{remaining}}", desc: "Cuántos faltan para el próximo premio" },
      { name: "{{nextReward}}", desc: "Descripción del próximo premio" },
    ],
  },
  loyaltyCardLink: {
    title: "Enlace a la Tarjeta de Fidelidad",
    shortTitle: "Tarjeta fidelidad",
    description: "Mensaje enviado cuando el cliente pide su tarjeta virtual desde la página de fidelidad (siempre activo: solo se envía a petición del cliente)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{cardUrl}}", desc: "Enlace a la tarjeta virtual de fidelidad del cliente" },
    ],
  },
  myBookingsLink: {
    title: "Enlace a Mis Reservas",
    shortTitle: "Mis reservas",
    description: "Mensaje enviado cuando el cliente pide consultar sus citas y clases desde la página «Mis reservas» (siempre activo: solo se envía a petición del cliente)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{bookingsUrl}}", desc: "Enlace personal donde el cliente ve y cancela sus citas y clases" },
    ],
  },
  birthdayGreeting: {
    title: "Saludo de Cumpleaños",
    shortTitle: "Cumpleaños",
    description: "Mensaje enviado automáticamente el día del cumpleaños del cliente",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{beneficio}}", desc: "Beneficio de cumpleaños (configurable abajo)" },
    ],
  },
  followUpReminder: {
    title: "Recordatorio de Seguimiento",
    shortTitle: "Seguimiento",
    description: "Mensaje enviado cuando un cliente no ha vuelto por el servicio de seguimiento configurado (ej: retoque)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{service}}", desc: "Servicio de seguimiento a agendar (ej: Retoque)" },
      { name: "{{originalService}}", desc: "Servicio original realizado (ej: Montura de pestañas)" },
      { name: "{{days}}", desc: "Días transcurridos desde el servicio original" },
    ],
  },
  googleReviewRequest: {
    title: "Pedido de reseña en Google",
    shortTitle: "Reseña en Google",
    description: "Mensaje enviado unas horas después de una cita atendida, con el enlace para dejar una reseña en tu perfil de Google",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{reviewUrl}}", desc: "Enlace para dejar la reseña en Google (se arma con tu perfil de Google de Mi negocio → Ubicación)" },
    ],
  },
  paymentReceived: {
    title: "Pago Recibido (Tienda)",
    shortTitle: "Pago recibido",
    description: "Mensaje enviado al comprador cuando se confirma el pago de su pedido de la tienda",
    variables: [
      { name: "{{names}}", desc: "Nombre del comprador" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{monto}}", desc: "Monto pagado (con la moneda del negocio)" },
      { name: "{{detalle}}", desc: "Detalle del pedido (ej: 2× Shampoo, 1× Cera)" },
    ],
  },
  // 🔔 Mensajes del sistema (avisos al admin de la org)
  adminPaymentAlert: {
    title: "Aviso de Pago Recibido",
    shortTitle: "Aviso de pago",
    description: "Aviso enviado a tu WhatsApp cuando llega o se valida un comprobante de pago",
    variables: [
      { name: "{{tipo}}", desc: "Tipo de pago (reserva, paquete, clase o pedido de tienda)" },
      { name: "{{monto}}", desc: "Monto del pago" },
      { name: "{{detalle}}", desc: "Remitente y referencia del comprobante (o —)" },
      { name: "{{estado}}", desc: "Estado (validado con IA o requiere revisión)" },
    ],
  },
  adminNewOrderAlert: {
    title: "Nuevo Pedido en la Tienda",
    shortTitle: "Nuevo pedido",
    description: "Aviso enviado a tu WhatsApp cuando un cliente hace un pedido en tu tienda",
    variables: [
      { name: "{{cliente}}", desc: "Nombre del cliente" },
      { name: "{{pedido}}", desc: "Resumen del pedido (ej: 3 productos · $45.000)" },
      { name: "{{entrega}}", desc: "Modo de entrega (domicilio o retiro en el local)" },
      { name: "{{pago}}", desc: "Estado del pago (pagado o contraentrega)" },
    ],
  },
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink-subtle)",
};

// Nombre Meta por defecto para mostrar estado en sidebar
const META_DEFAULT_NAMES: Record<string, string> = {
  scheduleAppointment: "confirmacion_cita",
  scheduleAppointmentBatch: "confirmacion_cita",
  recurringAppointmentSeries: "citas_recurrentes",
  rescheduleAppointment: "cita_reprogramada",
  rescheduleAppointmentSeries: "citas_reprogramadas",
  reminder: "recordatorio_cita",
  secondReminder: "segundo_recordatorio",
  statusReservationPending: "reserva_pendiente",
  statusReservationApproved: "reserva_aprobada",
  statusReservationRejected: "reserva_no_disponible",
  clientConfirmationAck: "confirmacion_asistencia",
  clientCancellationAck: "aviso_cancelacion",
  clientNoShowAck: "aviso_no_asistencia",
  loyaltyServiceReward: "premio_fidelidad",
  loyaltyReferralReward: "premio_referidos",
  loyaltyServiceProgress: "progreso_fidelidad",
  loyaltyReferralProgress: "progreso_referidos",
  loyaltyCardLink: "tarjeta_fidelidad",
  myBookingsLink: "mis_reservas",
  birthdayGreeting: "cumpleanos_cliente",
  followUpReminder: "recordatorio_seguimiento",
  googleReviewRequest: "solicitud_resena",
  paymentReceived: "pago_recibido",
  adminPaymentAlert: "aviso_pago_admin",
  adminNewOrderAlert: "aviso_pedido_admin",
};


type TemplateType = keyof typeof templateInfo;
const templateKeys = Object.keys(templateInfo) as TemplateType[];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function WhatsappTemplateEditor() {
  // «Plantillas de Meta» es su propia pestaña de WhatsApp (?vista=plantillas-meta)
  const [searchParams] = useSearchParams();
  const metaTemplatesView = searchParams.get("vista") === "plantillas-meta";
  const { organization } = useSelector((state: RootState) => state.organization);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isWide = useMediaQuery("(min-width: 1280px)");

  const [selectedKey, setSelectedKey] = useState<string>("scheduleAppointment");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const [templates, setTemplates] = useState<WhatsappTemplates | null>(null);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateStatus[] | undefined>(undefined);
  const [metaDrafts, setMetaDrafts] = useState<Record<string, MetaTemplateDraftSaved>>({});
  const [, setDefaultTemplates] = useState<Record<string, string>>({});
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [templateSettings, setTemplateSettings] = useState<WhatsappTemplateSettings>({
    scheduleAppointment: true,
    scheduleAppointmentBatch: true,
    recurringAppointmentSeries: true,
    rescheduleAppointment: true,
    rescheduleAppointmentSeries: true,
    reminder: true,
    secondReminder: true,
    statusReservationPending: true,
    statusReservationApproved: false,
    statusReservationRejected: false,
    clientConfirmationAck: true,
    clientCancellationAck: true,
    clientNoShowAck: true,
    loyaltyServiceReward: true,
    loyaltyReferralReward: true,
    loyaltyServiceProgress: false,
    loyaltyReferralProgress: false,
    birthdayGreeting: false,
    followUpReminder: false,
    googleReviewRequest: false,
    paymentReceived: true,
    adminPaymentAlert: true,
    adminNewOrderAlert: true,
  });

  // 🎂 Beneficio de cumpleaños (texto inyectado en {{beneficio}})
  const [birthdayBenefit, setBirthdayBenefit] = useState<string>("");

  const loadTemplates = useCallback(async () => {
    if (!organization?._id) return;
    try {
      setLoading(true);
      const data = await whatsappTemplateService.getTemplates(organization._id);
      setTemplates(data.templates);
      setDefaultTemplates(data.defaultTemplates);
      setBirthdayBenefit(data.birthdayBenefit || "");
      const settings = await whatsappTemplateService.getTemplateSettings(organization._id);
      setTemplateSettings(settings);
      const edited: Record<string, string> = {};
      templateKeys.forEach((key) => { edited[key] = data.templates[key].content; });
      setEditedTemplates(edited);
    } catch (error) {
      try { handleAxiosError(error, "Error al cargar plantillas"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally {
      setLoading(false);
    }
  }, [organization?._id]);

  useEffect(() => { if (organization?._id) loadTemplates(); }, [loadTemplates]);

  const loadMetaTemplates = useCallback(async () => {
    if (!organization?._id || organization.waConnectionType !== "meta") return;
    try {
      const { templates, drafts } = await listMetaTemplates(organization._id);
      setMetaTemplates(templates as MetaTemplateStatus[]);
      setMetaDrafts(drafts);
    } catch {
      setMetaTemplates([]);
      setMetaDrafts({});
    }
  }, [organization?._id, organization?.waConnectionType]);

  useEffect(() => { loadMetaTemplates(); }, [loadMetaTemplates]);

  const handleTemplateChange = (key: string, value: string) => {
    setEditedTemplates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    if (!organization?._id) return;
    try {
      setSaving(true);
      await whatsappTemplateService.updateTemplate(organization._id, key, editedTemplates[key]);
      setMessage({ type: "success", text: "Plantilla guardada correctamente" });
      await loadTemplates();
    } catch (error) {
      try { handleAxiosError(error, "Error al guardar plantilla"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally { setSaving(false); }
  };

  const handleRestore = async (key: string) => {
    if (!organization?._id) return;
    try {
      setSaving(true);
      await whatsappTemplateService.resetTemplate(organization._id, key);
      setMessage({ type: "success", text: "Plantilla restaurada a versión por defecto" });
      await loadTemplates();
    } catch (error) {
      try { handleAxiosError(error, "Error al restaurar plantilla"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally { setSaving(false); }
  };

  // ─── Interruptores (se guardan al instante) ──────────────────────────────────
  // El backend REEMPLAZA enabledTypes completo: el payload siempre lleva todas las claves.
  const buildSettingsPayload = (s: WhatsappTemplateSettings): WhatsappTemplateSettings => ({
    scheduleAppointment: s.scheduleAppointment,
    scheduleAppointmentBatch: s.scheduleAppointmentBatch,
    recurringAppointmentSeries: s.recurringAppointmentSeries,
    rescheduleAppointment: s.rescheduleAppointment ?? true,
    rescheduleAppointmentSeries: s.rescheduleAppointmentSeries ?? true,
    reminder: s.reminder,
    secondReminder: s.secondReminder,
    statusReservationPending: s.statusReservationPending,
    statusReservationApproved: s.statusReservationApproved,
    statusReservationRejected: s.statusReservationRejected,
    clientConfirmationAck: s.clientConfirmationAck,
    clientCancellationAck: s.clientCancellationAck,
    clientNoShowAck: s.clientNoShowAck,
    loyaltyServiceReward: s.loyaltyServiceReward,
    loyaltyReferralReward: s.loyaltyReferralReward,
    loyaltyServiceProgress: s.loyaltyServiceProgress ?? false,
    loyaltyReferralProgress: s.loyaltyReferralProgress ?? false,
    birthdayGreeting: s.birthdayGreeting,
    followUpReminder: s.followUpReminder,
    googleReviewRequest: s.googleReviewRequest ?? false,
    paymentReceived: s.paymentReceived ?? true,
    adminPaymentAlert: s.adminPaymentAlert ?? true,
    adminNewOrderAlert: s.adminNewOrderAlert ?? true,
  });

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const toggleMessage = async (key: string, on: boolean) => {
    const t = messageToggle(key);
    if (t.kind !== "switch" || !organization?._id) return;
    const prev = templateSettings;
    const next = { ...prev } as Record<string, boolean>;
    t.settings.forEach((k) => (next[k] = on));
    setTemplateSettings(next as unknown as WhatsappTemplateSettings);
    setTogglingKey(key);
    try {
      await whatsappTemplateService.updateTemplateSettings(organization._id, buildSettingsPayload(next as unknown as WhatsappTemplateSettings));
      notifications.show({ color: "green", message: on ? "Mensaje encendido: se enviará automáticamente." : "Mensaje apagado: ya no se envía." });
    } catch (error) {
      setTemplateSettings(prev);
      try { handleAxiosError(error, "No se pudo cambiar el mensaje"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally {
      setTogglingKey(null);
    }
  };

  const [savingBenefit, setSavingBenefit] = useState(false);
  const saveBirthdayBenefit = async () => {
    if (!organization?._id) return;
    setSavingBenefit(true);
    try {
      await whatsappTemplateService.updateBirthdayBenefit(organization._id, birthdayBenefit);
      notifications.show({ color: "green", message: "Beneficio de cumpleaños guardado." });
    } catch (error) {
      try { handleAxiosError(error, "No se pudo guardar el beneficio"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally {
      setSavingBenefit(false);
    }
  };

  // En móvil la lista y el editor son pantallas distintas: cada cambio empieza arriba
  // (el scroll lo lleva el <main> del panel).
  const scrollPanelTop = () => document.querySelector("main")?.scrollTo({ top: 0 });
  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    if (isMobile) {
      setMobileView("editor");
      scrollPanelTop();
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isMeta = organization?.waConnectionType === "meta";

  function getMetaStatus(key: string): { tone: string; title: string } | null {
    if (!metaTemplates) return null;
    const name = META_DEFAULT_NAMES[key];
    if (!name) return null;
    const found = metaTemplates.find((t) => t.name === name);
    if (!found) return { tone: "", title: "No enviada a Meta" };
    const map: Record<string, { tone: string; title: string }> = {
      APPROVED: { tone: "success", title: "Aprobada por Meta" },
      PENDING: { tone: "warning", title: "En revisión" },
      REJECTED: { tone: "danger", title: "Rechazada por Meta" },
      DISABLED: { tone: "", title: "Desactivada" },
    };
    return map[found.status] ?? { tone: "", title: found.status };
  }

  // «Confirmación de Cita» → «Confirmación de cita» (respeta Google)
  const sentenceCase = (s: string) =>
    s
      .split(" ")
      .map((w, i) => (i === 0 || w === "Google" ? w : w.charAt(0).toLowerCase() + w.slice(1)))
      .join(" ");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <Loader size="lg" />
        </Box>
      </Container>
    );
  }

  if (!templates) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="No se pudieron cargar los mensajes">
          <Button size="xs" variant="outline" mt="xs" onClick={loadTemplates}>Reintentar</Button>
        </Alert>
      </Container>
    );
  }

  const showList = !isMobile || mobileView === "list";
  const showEditor = !isMobile || mobileView === "editor";
  const key = selectedKey as TemplateType;
  const currentInfo = templateInfo[key];
  const varNames = currentInfo?.variables.map((v) => v.name) ?? [];
  const internal = editedTemplates[key] ?? "";
  const readable = toReadable(internal, varNames);
  const savedContent = templates[key]?.content ?? "";
  const isDirty = internal !== savedContent;
  const isCustom = !!templates[key]?.isCustom;
  const toggle = messageToggle(key);
  const on = isMessageOn(key, templateSettings as unknown as Record<string, boolean>);

  const insertVariable = (label: string) => {
    const el = textareaRef.current;
    const token = `[${label}]`;
    const start = el?.selectionStart ?? readable.length;
    const end = el?.selectionEnd ?? readable.length;
    const nextReadable = readable.slice(0, start) + token + readable.slice(end);
    handleTemplateChange(key, fromReadable(nextReadable, varNames));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const renderToggle = (k: string) => {
    const t = messageToggle(k);
    if (t.kind === "always") return <span className="ag-badge">{t.label}</span>;
    if (t.kind === "soon") return <span className="ag-badge">Próximamente</span>;
    const needsGoogle = k === "googleReviewRequest" && !organization?.googleBusiness?.placeId;
    const checked = isMessageOn(k, templateSettings as unknown as Record<string, boolean>);
    return (
      <Switch
        aria-label={checked ? "Apagar mensaje" : "Encender mensaje"}
        checked={checked}
        disabled={togglingKey === k || (needsGoogle && !checked)}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => toggleMessage(k, e.currentTarget.checked)}
      />
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  const list = (
    <div className="ag-card" style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
      {MESSAGE_GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ padding: "10px 16px", background: "var(--surface-muted)", borderBottom: "1px solid var(--line)" }}>
            <span style={eyebrowStyle}>{group.label}</span>
          </div>
          {group.keys.map((k) => {
            const info = templateInfo[k as TemplateType];
            if (!info) return null;
            const soon = messageToggle(k).kind === "soon";
            const selected = !soon && selectedKey === k;
            const metaStatus = isMeta ? getMetaStatus(k) : null;
            return (
              <div
                key={k}
                className="ag-list-row"
                role={soon ? undefined : "button"}
                tabIndex={soon ? -1 : 0}
                aria-current={selected ? "true" : undefined}
                onClick={soon ? undefined : () => handleSelectKey(k)}
                onKeyDown={(e) => !soon && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handleSelectKey(k))}
                style={{
                  padding: "10px 16px",
                  gap: 12,
                  cursor: soon ? "default" : "pointer",
                  background: selected ? "var(--brand-soft)" : undefined,
                  opacity: soon ? 0.6 : 1,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 14 }}>{info.shortTitle}</b>
                    {!isMeta && templates[k as TemplateType]?.isCustom && <span className="ag-badge ag-badge--brand" style={{ height: 20, fontSize: 11 }}>Personalizado</span>}
                    {metaStatus && (
                      <span className={`ag-badge${metaStatus.tone ? ` ag-badge--${metaStatus.tone}` : ""}`} style={{ height: 20, fontSize: 11 }}>
                        {metaStatus.title}
                      </span>
                    )}
                  </div>
                </div>
                {renderToggle(k)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const editorHeader = (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
      <div className="ag-row" style={{ gap: 8, alignItems: "flex-start" }}>
        {isMobile && (
          <ActionIcon variant="subtle" color="gray" onClick={() => { setMobileView("list"); scrollPanelTop(); }} aria-label="Volver a la lista">
            <IconChevronLeft size={18} />
          </ActionIcon>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ag-row" style={{ gap: 8, flexWrap: "wrap" }}>
            <h2 className="ag-h" style={{ margin: 0 }}>{sentenceCase(currentInfo.title)}</h2>
            {toggle.kind === "switch" && (
              <span className={`ag-badge${on ? " ag-badge--success" : ""}`}>{on ? "Encendido" : "Apagado"}</span>
            )}
            {toggle.kind === "always" && <span className="ag-badge">{toggle.label}</span>}
          </div>
          <div className="ag-muted" style={{ fontSize: 14, marginTop: 2 }}>{currentInfo.description}</div>
        </div>
        {isMobile && renderToggle(key)}
      </div>
    </div>
  );

  const editorNotes = (
    <>
      {toggle.kind === "switch" && !on && (
        <div className="ag-alert ag-alert--warning">
          <IconInfoCircle size={20} />
          <div>Este mensaje está apagado: no se envía. Puedes editarlo igual y encenderlo cuando quieras.</div>
        </div>
      )}
      {(key === "adminPaymentAlert" || key === "adminNewOrderAlert") && (
        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div>
            Este aviso llega a tu WhatsApp (el del negocio), enviado desde tu propio número. Si no tienes WhatsApp conectado, sale desde el número de
            AgenditApp con un formato estándar.
          </div>
        </div>
      )}
      {key === "googleReviewRequest" && (
        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div>
            Unas 2 horas después de que la cita queda como «Asistió» (entre 9:00 a. m. y 8:00 p. m.). Máximo un mensaje por cliente cada 6 meses, y
            a todos por igual: Google no permite pedir reseñas solo a quienes quedaron contentos.
            {!organization?.googleBusiness?.placeId && (
              <b style={{ display: "block", marginTop: 4 }}>Para encenderlo, busca tu negocio en Ajustes › Ubicación › «Tu perfil de Google».</b>
            )}
          </div>
        </div>
      )}
      {key === "birthdayGreeting" && (
        <div className="ag-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <Textarea
            label="Beneficio de cumpleaños"
            description="Lo que reemplaza [Beneficio de cumpleaños] en el mensaje. Solo a clientes con fecha de nacimiento registrada."
            placeholder="Ej: 20% de descuento en tu próximo servicio"
            autosize
            minRows={2}
            value={birthdayBenefit}
            onChange={(e) => setBirthdayBenefit(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button size="xs" variant="outline" onClick={saveBirthdayBenefit} loading={savingBenefit}>
              Guardar beneficio
            </Button>
          </Group>
        </div>
      )}
      {key === "followUpReminder" && (
        <div className="ag-alert ag-alert--info">
          <IconInfoCircle size={20} />
          <div>Se envía cuando un cliente no ha vuelto por el servicio de seguimiento que configuras en cada servicio (ej: retoque).</div>
        </div>
      )}
    </>
  );

  const bubble = (
    <div style={{ background: "#ECE5DD", borderRadius: "var(--radius-md)", padding: 16 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "8px 8px 8px 2px",
          padding: "8px 10px",
          maxWidth: "92%",
          boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
          color: "#303030",
          fontSize: 14,
          lineHeight: "20px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {previewText(internal, organization?.name || "Tu negocio") || <span style={{ color: "#999" }}>El mensaje está vacío.</span>}
        <div style={{ textAlign: "right", fontSize: 11, color: "#999", marginTop: 4 }}>10:00</div>
      </div>
    </div>
  );

  const baileysEditor = (
    <div className="ag-stack" style={{ gap: 14, padding: 20 }}>
      {editorNotes}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isWide ? "minmax(0, 1fr) 300px" : "minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div className="ag-stack" style={{ gap: 10, minWidth: 0 }}>
          <div className="ag-row" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Mensaje</b>
            <span className={`ag-badge${isCustom ? " ag-badge--brand" : ""}`}>{isCustom ? "Personalizado" : "Mensaje original"}</span>
          </div>
          <Textarea
            ref={textareaRef}
            value={readable}
            onChange={(e) => handleTemplateChange(key, fromReadable(e.currentTarget.value, varNames))}
            placeholder="Escribe tu mensaje aquí..."
            minRows={10}
            autosize
            maxRows={24}
            aria-label="Texto del mensaje"
          />
          <div>
            <div className="ag-subtle" style={{ marginBottom: 6 }}>Insertar dato (se reemplaza al enviar):</div>
            <div className="ag-row" style={{ gap: 6, flexWrap: "wrap" }}>
              {currentInfo.variables.map((v) => {
                const label = labelFor(v.name.replace(/[{}]/g, ""));
                return (
                  <Tooltip key={v.name} label={v.desc} withArrow openDelay={300}>
                    <button
                      type="button"
                      className="ag-badge ag-badge--outline"
                      style={{ cursor: "pointer", font: "500 12px/16px var(--font-sans)" }}
                      onClick={() => insertVariable(label)}
                    >
                      + {label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
          <Group gap="xs" mt={4}>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => handleSave(key)} loading={saving} disabled={!isDirty}>
              Guardar mensaje
            </Button>
            {isDirty && (
              <Button variant="default" onClick={() => handleTemplateChange(key, savedContent)} disabled={saving}>
                Descartar cambios
              </Button>
            )}
            {isCustom && !isDirty && (
              <Button variant="subtle" color="gray" leftSection={<IconRestore size={16} />} onClick={() => handleRestore(key)} loading={saving}>
                Volver al mensaje original
              </Button>
            )}
          </Group>
        </div>
        <div className="ag-stack" style={{ gap: 8, position: isWide ? "sticky" : undefined, top: 16 }}>
          <b style={{ fontSize: 14 }}>Vista previa</b>
          {bubble}
          <div className="ag-subtle">Con datos de ejemplo.</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Box p={{ base: "sm", md: "lg" }}>
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          <WhatsappTabs
            subtitle={
              metaTemplatesView
                ? "Plantillas aprobadas por Meta para usar en tus campañas."
                : "Lo que reciben tus clientes en cada momento. Enciende, apaga o personaliza cada mensaje."
            }
          />

          {message && (
            <Alert color={message.type === "error" ? "red" : "green"} withCloseButton onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          {metaTemplatesView && organization?._id ? (
            <div className="ag-card" style={{ padding: 20 }}>
              <MetaTemplatesPanel organizationId={organization._id} />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "320px minmax(0, 1fr)",
                gap: "var(--space-4)",
                alignItems: "start",
              }}
            >
              {showList && list}
              {showEditor && currentInfo && (
                <div className="ag-card" style={{ padding: 0, minWidth: 0 }}>
                  {editorHeader}
                  {isMeta && organization?._id ? (
                    <div style={{ padding: 20 }}>
                      {key === "scheduleAppointment" && (
                        <div className="ag-alert ag-alert--info" style={{ marginBottom: 14 }}>
                          <IconInfoCircle size={20} />
                          <div>Con la API de Meta, la confirmación de una cita y la de varias usan la misma plantilla aprobada («confirmacion_cita»).</div>
                        </div>
                      )}
                      <MetaTemplateFormTab
                        key={selectedKey}
                        templateKey={key === "scheduleAppointment" ? "scheduleAppointmentBatch" : selectedKey}
                        organizationId={organization._id}
                        metaTemplates={metaTemplates}
                        metaTemplateDrafts={metaTemplates === undefined ? undefined : metaDrafts}
                        onRefreshMetaTemplates={loadMetaTemplates}
                      />
                    </div>
                  ) : (
                    baileysEditor
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Box>
    </>
  );
}
