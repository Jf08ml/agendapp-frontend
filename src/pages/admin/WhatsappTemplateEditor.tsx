/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Textarea,
  Button,
  Alert,
  Badge,
  Stack,
  Group,
  ActionIcon,
  Tooltip,
  Divider,
  Card,
  Loader,
  Box,
  rem,
  Modal,
  Switch,
  NavLink,
  ScrollArea,
  Paper,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconDeviceFloppy,
  IconRestore,
  IconEye,
  IconCopy,
  IconInfoCircle,
  IconArrowLeft,
  IconDotsVertical,
  IconPhone,
  IconVideo,
  IconAlertCircle,
  IconSettings,
  IconChevronLeft,
  IconMessage,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import whatsappTemplateService, {
  WhatsappTemplates,
  WhatsappTemplateSettings,
} from "../../services/whatsappTemplateService";
import { handleAxiosError } from "../../utils/handleAxiosError";
import MetaTemplateFormTab, { MetaTemplateStatus } from "./MetaTemplateFormTab";
import { listMetaTemplates } from "../../services/organizationService";

// ─── Metadata de plantillas ───────────────────────────────────────────────────

const templateInfo = {
  scheduleAppointment: {
    title: "Confirmación de Cita",
    shortTitle: "Confirmación (individual)",
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
    shortTitle: "Confirmación de citas",
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
    ],
  },
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SIDEBAR_GROUPS = [
  { label: "Citas", keys: ["scheduleAppointmentBatch", "recurringAppointmentSeries"] },
  { label: "Recordatorios", keys: ["reminder", "secondReminder"] },
  { label: "Reservas", keys: ["statusReservationApproved", "statusReservationRejected"] },
  { label: "Clientes", keys: ["clientConfirmationAck", "clientCancellationAck", "clientNoShowAck"] },
  { label: "Fidelidad", keys: ["loyaltyServiceReward", "loyaltyReferralReward"] },
] as const;

// Nombre Meta por defecto para mostrar estado en sidebar
const META_DEFAULT_NAMES: Record<string, string> = {
  scheduleAppointmentBatch: "confirmacion_cita",
  recurringAppointmentSeries: "citas_recurrentes",
  reminder: "recordatorio_cita",
  secondReminder: "segundo_recordatorio",
  statusReservationApproved: "reserva_aprobada",
  statusReservationRejected: "reserva_no_disponible",
  clientConfirmationAck: "confirmacion_asistencia",
  clientCancellationAck: "aviso_cancelacion",
  clientNoShowAck: "aviso_no_asistencia",
  loyaltyServiceReward: "premio_fidelidad",
  loyaltyReferralReward: "premio_referidos",
};

const META_STATUS_DOT: Record<string, string> = {
  APPROVED: "var(--mantine-color-green-6)",
  PENDING: "var(--mantine-color-yellow-6)",
  REJECTED: "var(--mantine-color-red-6)",
  DISABLED: "var(--mantine-color-gray-5)",
};

type TemplateType = keyof WhatsappTemplates;
const templateKeys = Object.keys(templateInfo) as TemplateType[];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function WhatsappTemplateEditor() {
  const { organization } = useSelector((state: RootState) => state.organization);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [selectedKey, setSelectedKey] = useState<string>("scheduleAppointmentBatch");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const [templates, setTemplates] = useState<WhatsappTemplates | null>(null);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplateStatus[] | undefined>(undefined);
  const [defaultTemplates, setDefaultTemplates] = useState<Record<string, string>>({});
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const [templateSettings, setTemplateSettings] = useState<WhatsappTemplateSettings>({
    scheduleAppointment: true,
    scheduleAppointmentBatch: true,
    recurringAppointmentSeries: true,
    reminder: true,
    secondReminder: true,
    statusReservationApproved: false,
    statusReservationRejected: false,
    clientConfirmationAck: true,
    clientCancellationAck: true,
    clientNoShowAck: true,
    loyaltyServiceReward: true,
    loyaltyReferralReward: true,
  });

  const loadTemplates = useCallback(async () => {
    if (!organization?._id) return;
    try {
      setLoading(true);
      const data = await whatsappTemplateService.getTemplates(organization._id);
      setTemplates(data.templates);
      setDefaultTemplates(data.defaultTemplates);
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
      const list = await listMetaTemplates(organization._id);
      setMetaTemplates(list);
    } catch {
      setMetaTemplates([]);
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

  const handlePreview = async (key: string) => {
    try {
      const text = await whatsappTemplateService.previewTemplate(key, editedTemplates[key]);
      setPreview(text);
      setPreviewModalOpen(true);
    } catch (error) {
      try { handleAxiosError(error, "Error al generar preview"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    }
  };

  const handleSaveSettings = async () => {
    if (!organization?._id) return;
    try {
      setSaving(true);
      const validSettings: WhatsappTemplateSettings = {
        scheduleAppointment: templateSettings.scheduleAppointment,
        scheduleAppointmentBatch: templateSettings.scheduleAppointmentBatch,
        recurringAppointmentSeries: templateSettings.recurringAppointmentSeries,
        reminder: templateSettings.reminder,
        secondReminder: templateSettings.secondReminder,
        statusReservationApproved: templateSettings.statusReservationApproved,
        statusReservationRejected: templateSettings.statusReservationRejected,
        clientConfirmationAck: templateSettings.clientConfirmationAck,
        clientCancellationAck: templateSettings.clientCancellationAck,
      };
      await whatsappTemplateService.updateTemplateSettings(organization._id, validSettings);
      setMessage({ type: "success", text: "Configuración de envíos actualizada correctamente" });
    } catch (error) {
      try { handleAxiosError(error, "Error al guardar configuración"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally { setSaving(false); }
  };

  const handleCopyDefault = (key: string) => {
    setEditedTemplates((prev) => ({ ...prev, [key]: defaultTemplates[key] }));
    setMessage({ type: "success", text: "Plantilla por defecto copiada al editor" });
  };

  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    if (isMobile) setMobileView("editor");
  };

  // ─── Helpers sidebar ─────────────────────────────────────────────────────────

  const isMeta = organization?.waConnectionType === "meta";

  function getMetaStatusDot(key: string): { color: string; title: string } | null {
    if (!metaTemplates) return null;
    const name = META_DEFAULT_NAMES[key];
    if (!name) return null;
    const found = metaTemplates.find((t) => t.name === name);
    if (!found) return { color: "var(--mantine-color-gray-4)", title: "No enviada" };
    const color = META_STATUS_DOT[found.status] ?? "var(--mantine-color-gray-5)";
    const titles: Record<string, string> = { APPROVED: "Aprobada", PENDING: "En revisión", REJECTED: "Rechazada", DISABLED: "Desactivada" };
    return { color, title: titles[found.status] ?? found.status };
  }

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
        <Alert color="red" title="Error">Error al cargar las plantillas</Alert>
      </Container>
    );
  }

  const showSidebar = !isMobile || mobileView === "list";
  const showEditor = !isMobile || mobileView === "editor";
  const currentInfo = selectedKey !== "settings" ? templateInfo[selectedKey as TemplateType] : null;

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <>
      <Container size="xl" py="md">
        <Stack gap="md">

          {/* ── Cabecera ─────────────────────────────────────────── */}
          <Group align="center" gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="green">
              <IconMessage size={18} />
            </ThemeIcon>
            <Box>
              <Title order={3} lh={1.2}>Mensajes de WhatsApp</Title>
              <Text size="xs" c="dimmed">Personaliza los mensajes que se envían automáticamente</Text>
            </Box>
            {isMeta ? (
              <Badge color="blue" size="sm" ml="auto">Meta Cloud API</Badge>
            ) : (
              <Badge color="green" size="sm" ml="auto">Baileys</Badge>
            )}
          </Group>

          {message && (
            <Alert
              color={message.type === "error" ? "red" : "green"}
              withCloseButton
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}

          {/* ── Layout principal ─────────────────────────────────── */}
          <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
            <Box style={{ display: "flex", minHeight: rem(580) }}>

              {/* ── Sidebar ──────────────────────────────────────── */}
              {showSidebar && (
                <Box
                  style={{
                    width: isMobile ? "100%" : rem(240),
                    flexShrink: 0,
                    borderRight: isMobile ? "none" : "1px solid var(--mantine-color-gray-3)",
                    display: "flex",
                    flexDirection: "column",
                    background: "var(--mantine-color-gray-0)",
                  }}
                >
                  {/* Título sidebar */}
                  <Box
                    px="md"
                    py="sm"
                    style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
                  >
                    <Group justify="space-between">
                      <Text size="sm" fw={600} c="dimmed">Plantillas</Text>
                      {isMeta && metaTemplates === undefined && <Loader size="xs" />}
                    </Group>
                  </Box>

                  <ScrollArea style={{ flex: 1 }}>
                    {SIDEBAR_GROUPS.map((group, gi) => (
                      <Box key={group.label}>
                        {gi > 0 && <Divider />}
                        <Text
                          size="xs"
                          fw={700}
                          tt="uppercase"
                          c="dimmed"
                          px="md"
                          pt="sm"
                          pb={rem(4)}
                          style={{ letterSpacing: "0.05em" }}
                        >
                          {group.label}
                        </Text>
                        {group.keys.map((key) => {
                          const dot = isMeta ? getMetaStatusDot(key) : null;
                          const isCustom = !isMeta && templates[key as TemplateType]?.isCustom;
                          return (
                            <NavLink
                              key={key}
                              label={
                                <Text size="sm" lineClamp={1}>
                                  {templateInfo[key as TemplateType].shortTitle}
                                </Text>
                              }
                              active={selectedKey === key}
                              onClick={() => handleSelectKey(key)}
                              rightSection={
                                dot ? (
                                  <Tooltip label={dot.title} position="right" withArrow>
                                    <Box
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: dot.color,
                                        flexShrink: 0,
                                      }}
                                    />
                                  </Tooltip>
                                ) : isCustom ? (
                                  <Tooltip label="Personalizada" position="right" withArrow>
                                    <Box
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "var(--mantine-color-teal-6)",
                                        flexShrink: 0,
                                      }}
                                    />
                                  </Tooltip>
                                ) : null
                              }
                              styles={{
                                root: { paddingInline: rem(12) },
                              }}
                            />
                          );
                        })}
                      </Box>
                    ))}

                    <Divider my="xs" />
                    <NavLink
                      label={<Text size="sm">Configuración de envíos</Text>}
                      leftSection={<IconSettings size={15} />}
                      active={selectedKey === "settings"}
                      onClick={() => handleSelectKey("settings")}
                      styles={{ root: { paddingInline: rem(12) } }}
                    />
                  </ScrollArea>

                  {/* Leyenda dots — solo Meta */}
                  {isMeta && (
                    <Box
                      px="md"
                      py="xs"
                      style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}
                    >
                      <Box
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: `${rem(4)} ${rem(8)}`,
                        }}
                      >
                        {[
                          { color: "var(--mantine-color-green-6)", label: "Aprobada" },
                          { color: "var(--mantine-color-yellow-6)", label: "En revisión" },
                          { color: "var(--mantine-color-red-6)", label: "Rechazada" },
                          { color: "var(--mantine-color-gray-4)", label: "No enviada" },
                        ].map(({ color, label }) => (
                          <Group key={label} gap={rem(4)} wrap="nowrap">
                            <Box style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                            <Text size="xs" c="dimmed" lineClamp={1}>{label}</Text>
                          </Group>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {/* ── Panel editor ─────────────────────────────────── */}
              {showEditor && (
                <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

                  {/* Header del editor */}
                  <Box
                    px="lg"
                    py="sm"
                    style={{ borderBottom: "1px solid var(--mantine-color-gray-3)", background: "white" }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        {isMobile && (
                          <ActionIcon variant="subtle" color="gray" onClick={() => setMobileView("list")}>
                            <IconChevronLeft size={18} />
                          </ActionIcon>
                        )}
                        <Box style={{ minWidth: 0 }}>
                          <Text fw={600} size="md" lineClamp={1}>
                            {selectedKey === "settings" ? "Configuración de envíos" : currentInfo?.title}
                          </Text>
                          {currentInfo && (
                            <Text size="xs" c="dimmed" lineClamp={1}>{currentInfo.description}</Text>
                          )}
                        </Box>
                      </Group>

                      {/* Botón preview Baileys */}
                      {!isMeta && selectedKey !== "settings" && (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconEye size={13} />}
                          onClick={() => handlePreview(selectedKey)}
                          style={{ flexShrink: 0 }}
                        >
                          Vista previa
                        </Button>
                      )}
                    </Group>
                  </Box>

                  {/* Cuerpo del editor */}
                  <ScrollArea style={{ flex: 1 }}>
                    <Box p="lg">
                      {selectedKey === "settings" ? (
                        // ── Panel configuración ───────────────────
                        <Stack gap="md">
                          <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light" radius="md">
                            <Text size="sm">
                              Habilita o deshabilita el envío automático de cada tipo de mensaje.
                            </Text>
                          </Alert>

                          <Stack gap="xs">
                            {[
                              { key: "scheduleAppointment", label: "Confirmación de cita individual", desc: "Al crear una cita individual" },
                              { key: "scheduleAppointmentBatch", label: "Confirmación de citas múltiples", desc: "Al crear varias citas juntas" },
                              { key: "recurringAppointmentSeries", label: "Confirmación de citas recurrentes", desc: "Al crear una serie de citas" },
                              { key: "clientConfirmationAck", label: "Agradecimiento por confirmación", desc: "Cuando el cliente confirma asistencia" },
                              { key: "clientCancellationAck", label: "Aviso de cancelación al cliente", desc: "Cuando el cliente cancela" },
                              { key: "clientNoShowAck", label: "Aviso de no asistencia", desc: "Cuando se marca como no asistió" },
                            ].map(({ key, label, desc }) => (
                              <Paper key={key} withBorder p="sm" radius="md">
                                <Group justify="space-between">
                                  <Box>
                                    <Text size="sm" fw={500}>{label}</Text>
                                    <Text size="xs" c="dimmed">{desc}</Text>
                                  </Box>
                                  <Switch
                                    checked={(templateSettings as Record<string, boolean>)[key] ?? true}
                                    onChange={(e) =>
                                      setTemplateSettings((prev) => ({ ...prev, [key]: e.currentTarget.checked }))
                                    }
                                  />
                                </Group>
                              </Paper>
                            ))}

                            <Alert icon={<IconAlertCircle size={18} />} color="green" radius="md">
                              <Group justify="space-between">
                                <Box>
                                  <Text size="sm" fw={500}>Recordatorios de citas</Text>
                                  <Text size="xs" c="dimmed">Se envían automáticamente 24h antes de cada cita</Text>
                                </Box>
                                <Badge color="green" variant="filled">Siempre activo</Badge>
                              </Group>
                            </Alert>

                            <Divider label="Plan de fidelidad" labelPosition="center" />

                            {[
                              { key: "loyaltyServiceReward", label: "Premio de fidelidad (servicios)", desc: "Al completar meta de servicios" },
                              { key: "loyaltyReferralReward", label: "Premio de referidos", desc: "Al completar meta de referidos" },
                            ].map(({ key, label, desc }) => (
                              <Paper key={key} withBorder p="sm" radius="md">
                                <Group justify="space-between">
                                  <Box>
                                    <Text size="sm" fw={500}>{label}</Text>
                                    <Text size="xs" c="dimmed">{desc}</Text>
                                  </Box>
                                  <Switch
                                    checked={(templateSettings as Record<string, boolean>)[key] ?? true}
                                    onChange={(e) =>
                                      setTemplateSettings((prev) => ({ ...prev, [key]: e.currentTarget.checked }))
                                    }
                                  />
                                </Group>
                              </Paper>
                            ))}
                          </Stack>

                          <Group justify="flex-end">
                            <Button
                              leftSection={<IconDeviceFloppy size={16} />}
                              onClick={handleSaveSettings}
                              loading={saving}
                            >
                              Guardar configuración
                            </Button>
                          </Group>
                        </Stack>

                      ) : isMeta && organization?._id ? (
                        // ── Editor Meta ───────────────────────────
                        <MetaTemplateFormTab
                          key={selectedKey}
                          templateKey={selectedKey}
                          organizationId={organization._id}
                          metaTemplates={metaTemplates}
                          onRefreshMetaTemplates={loadMetaTemplates}
                        />

                      ) : (
                        // ── Editor Baileys ────────────────────────
                        <Box
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: rem(20),
                            alignItems: "start",
                          }}
                          className="baileys-editor-grid"
                        >
                          <style>{`
                            @media (min-width: 900px) {
                              .baileys-editor-grid { grid-template-columns: 1fr 280px !important; }
                              .baileys-vars-panel { position: sticky; top: ${rem(20)}; }
                            }
                          `}</style>

                          {/* Textarea */}
                          <Stack gap="sm">
                            <Group justify="space-between">
                              <Group gap="xs">
                                <Text fw={600}>Editor de mensaje</Text>
                                {templates[selectedKey as TemplateType]?.isCustom ? (
                                  <Badge color="teal" variant="light" size="sm">Personalizado</Badge>
                                ) : (
                                  <Badge color="gray" variant="light" size="sm">Por defecto</Badge>
                                )}
                              </Group>
                              <Tooltip label="Copiar plantilla por defecto como punto de partida">
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  leftSection={<IconCopy size={14} />}
                                  onClick={() => handleCopyDefault(selectedKey)}
                                >
                                  Copiar original
                                </Button>
                              </Tooltip>
                            </Group>

                            <Textarea
                              value={editedTemplates[selectedKey] || ""}
                              onChange={(e) => handleTemplateChange(selectedKey, e.target.value)}
                              placeholder="Escribe tu mensaje aquí..."
                              minRows={16}
                              autosize
                              maxRows={30}
                              styles={{
                                input: {
                                  fontFamily: "'Courier New', monospace",
                                  fontSize: rem(13),
                                  lineHeight: 1.6,
                                },
                              }}
                            />

                            <Group gap="xs">
                              <Button
                                leftSection={<IconDeviceFloppy size={16} />}
                                onClick={() => handleSave(selectedKey)}
                                loading={saving}
                              >
                                Guardar
                              </Button>
                              {templates[selectedKey as TemplateType]?.isCustom && (
                                <Button
                                  variant="outline"
                                  color="orange"
                                  leftSection={<IconRestore size={16} />}
                                  onClick={() => handleRestore(selectedKey)}
                                  loading={saving}
                                >
                                  Restaurar original
                                </Button>
                              )}
                            </Group>
                          </Stack>

                          {/* Variables panel */}
                          <Box className="baileys-vars-panel">
                            <Card withBorder radius="md" p="md">
                              <Text fw={600} mb="xs">Variables disponibles</Text>
                              <Text size="xs" c="dimmed" mb="md">
                                Haz clic para copiar. Se reemplazan con datos reales al enviar.
                              </Text>
                              <Divider mb="md" />
                              <Stack gap="xs">
                                {currentInfo?.variables.map((v) => (
                                  <Box
                                    key={v.name}
                                    p="xs"
                                    style={{
                                      borderRadius: rem(6),
                                      cursor: "pointer",
                                      transition: "background-color 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-1)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(v.name);
                                      setMessage({ type: "success", text: `Copiado: ${v.name}` });
                                      setTimeout(() => setMessage(null), 2000);
                                    }}
                                  >
                                    <Badge
                                      variant="light"
                                      color="blue"
                                      size="sm"
                                      fullWidth
                                      style={{ fontFamily: "monospace", cursor: "pointer" }}
                                    >
                                      {v.name}
                                    </Badge>
                                    <Text size="xs" c="dimmed" mt={2} pl={4}>{v.desc}</Text>
                                  </Box>
                                ))}
                              </Stack>
                            </Card>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </ScrollArea>
                </Box>
              )}
            </Box>
          </Paper>
        </Stack>
      </Container>

      {/* ── Modal preview Baileys ─────────────────────────────────────── */}
      <Modal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        size="md"
        padding={0}
        radius="lg"
        centered
        withCloseButton={false}
        styles={{ body: { padding: 0 }, content: { overflow: "hidden" } }}
      >
        <Box
          style={{
            background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)",
            padding: rem(16),
            borderRadius: rem(12),
          }}
        >
          <Box
            style={{
              background: "white",
              borderRadius: rem(32),
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            {/* Notch */}
            <Box
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: rem(120),
                height: rem(24),
                background: "black",
                borderRadius: `0 0 ${rem(16)} ${rem(16)}`,
                zIndex: 10,
              }}
            />
            {/* Header WA */}
            <Box style={{ background: "#075E54", padding: `${rem(40)} ${rem(16)} ${rem(12)}`, color: "white" }}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ActionIcon variant="transparent" color="white" size="lg">
                    <IconArrowLeft size={24} />
                  </ActionIcon>
                  <Box
                    style={{
                      width: rem(40), height: rem(40), borderRadius: "50%",
                      background: "#25D366", display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: rem(18),
                    }}
                  >
                    {organization?.name?.charAt(0).toUpperCase() || "A"}
                  </Box>
                  <Box>
                    <Text fw={600} size="md" c="white">{organization?.name || "Mi Negocio"}</Text>
                    <Text size="xs" c="rgba(255,255,255,0.7)">en línea</Text>
                  </Box>
                </Group>
                <Group gap="md">
                  <ActionIcon variant="transparent" color="white"><IconVideo size={22} /></ActionIcon>
                  <ActionIcon variant="transparent" color="white"><IconPhone size={22} /></ActionIcon>
                  <ActionIcon variant="transparent" color="white"><IconDotsVertical size={22} /></ActionIcon>
                </Group>
              </Group>
            </Box>
            {/* Conversación */}
            <Box
              style={{
                background: "#ECE5DD",
                padding: rem(16),
                minHeight: rem(350),
                maxHeight: rem(450),
                overflowY: "auto",
              }}
            >
              <Box style={{ display: "flex", justifyContent: "flex-start", marginBottom: rem(8) }}>
                <Box
                  style={{
                    background: "white",
                    borderRadius: `${rem(8)} ${rem(8)} ${rem(8)} ${rem(2)}`,
                    padding: rem(10),
                    maxWidth: "82%",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                  }}
                >
                  <Text
                    size="sm"
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, color: "#303030" }}
                  >
                    {preview}
                  </Text>
                  <Text size="xs" c="dimmed" ta="right" mt={4} style={{ fontSize: rem(11) }}>
                    {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Box>
              </Box>
              <Box mt="xl" style={{ textAlign: "center" }}>
                <Paper p="xs" radius="md" bg="rgba(255,255,255,0.8)" style={{ display: "inline-block" }}>
                  <Text size="xs" c="dimmed">Vista previa con datos de ejemplo</Text>
                </Paper>
              </Box>
            </Box>
            {/* Barra input simulada */}
            <Box style={{ background: "#F0F0F0", padding: rem(8), borderTop: "1px solid #e0e0e0" }}>
              <Group gap="xs">
                <Box
                  style={{
                    flex: 1, background: "white", borderRadius: rem(20),
                    padding: `${rem(8)} ${rem(16)}`, border: "1px solid #ddd",
                  }}
                >
                  <Text size="sm" c="dimmed">Escribe un mensaje...</Text>
                </Box>
                <ActionIcon size="lg" radius="xl" variant="filled" style={{ background: "#25D366" }}>
                  <Text size="lg">🎤</Text>
                </ActionIcon>
              </Group>
            </Box>
          </Box>
          <Button fullWidth mt="md" variant="light" onClick={() => setPreviewModalOpen(false)}>
            Cerrar
          </Button>
        </Box>
      </Modal>
    </>
  );
}
