/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import {
  Text, Textarea, Button, Alert, Badge, Stack, Group, ActionIcon,
  Tooltip, Divider, Card, Loader, Box, rem, Modal, Switch, NavLink,
  ScrollArea, Paper, ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconDeviceFloppy, IconRestore, IconEye, IconCopy, IconInfoCircle,
  IconArrowLeft, IconDotsVertical, IconPhone, IconVideo,
  IconSettings, IconChevronLeft, IconBrandWhatsapp,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import whatsappTemplateService, {
  WhatsappTemplates,
  WhatsappTemplateSettings,
} from "../../../../services/whatsappTemplateService";
import { handleAxiosError } from "../../../../utils/handleAxiosError";
import MetaTemplateFormTab, { MetaTemplateStatus } from "../../MetaTemplateFormTab";
import { listMetaTemplates } from "../../../../services/organizationService";

// ─── Metadata de las plantillas de clase ────────────────────────────────────

const templateInfo = {
  classEnrollmentConfirmed: {
    title: "Inscripción confirmada",
    shortTitle: "Inscripción confirmada",
    description: "Se envía al asistente cuando su inscripción es confirmada (auto o al aprobar).",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión" },
      { name: "{{startTime}}", desc: "Hora de inicio" },
      { name: "{{endTime}}", desc: "Hora de fin" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{price}}", desc: "Precio del asistente" },
      { name: "{{discount}}", desc: "Texto de descuento (vacío si no aplica)" },
      { name: "{{cancelBlock}}", desc: "Bloque con enlace de cancelación" },
    ],
  },
  classEnrollmentPending: {
    title: "Inscripción pendiente",
    shortTitle: "Inscripción pendiente",
    description: "Acuse al asistente cuando su inscripción queda pendiente de aprobación.",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión" },
      { name: "{{startTime}}", desc: "Hora de inicio" },
      { name: "{{endTime}}", desc: "Hora de fin" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{price}}", desc: "Precio del asistente" },
      { name: "{{discount}}", desc: "Texto de descuento (vacío si no aplica)" },
    ],
  },
  classEnrollmentCancelled: {
    title: "Inscripción cancelada",
    shortTitle: "Inscripción cancelada",
    description: "Se envía al asistente cuando se cancela su inscripción.",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión" },
      { name: "{{startTime}}", desc: "Hora de inicio" },
      { name: "{{endTime}}", desc: "Hora de fin" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  classReminder: {
    title: "Recordatorio de clase",
    shortTitle: "Recordatorio de clase",
    description: "Recordatorio enviado antes de la clase (según las horas configuradas en recordatorios).",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión" },
      { name: "{{startTime}}", desc: "Hora de inicio" },
      { name: "{{endTime}}", desc: "Hora de fin" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{cancelBlock}}", desc: "Bloque con enlace de cancelación" },
    ],
  },
} as const;

type ClassKey = keyof typeof templateInfo;
const CLASS_KEYS = Object.keys(templateInfo) as ClassKey[];

// Nombre Meta por defecto (para mostrar estado en el sidebar)
const META_DEFAULT_NAMES: Record<ClassKey, string> = {
  classEnrollmentConfirmed: "clase_confirmada",
  classEnrollmentPending: "clase_pendiente",
  classEnrollmentCancelled: "clase_cancelada",
  classReminder: "recordatorio_clase",
};

const META_STATUS_DOT: Record<string, string> = {
  APPROVED: "var(--mantine-color-green-6)",
  PENDING: "var(--mantine-color-yellow-6)",
  REJECTED: "var(--mantine-color-red-6)",
  DISABLED: "var(--mantine-color-gray-5)",
};

const SETTINGS_LIST: { key: ClassKey; label: string; desc: string }[] = [
  { key: "classEnrollmentConfirmed", label: "Inscripción confirmada", desc: "Al confirmar/aprobar una inscripción" },
  { key: "classEnrollmentPending", label: "Inscripción pendiente", desc: "Cuando la inscripción requiere aprobación" },
  { key: "classEnrollmentCancelled", label: "Inscripción cancelada", desc: "Cuando se cancela una inscripción" },
  { key: "classReminder", label: "Recordatorio de clase", desc: "Antes de que comience la clase" },
];

// ─── Componente ─────────────────────────────────────────────────────────────

export default function ClassWhatsappTemplates() {
  const { organization } = useSelector((state: RootState) => state.organization);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [selectedKey, setSelectedKey] = useState<string>("classEnrollmentConfirmed");
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
    classEnrollmentConfirmed: true,
    classEnrollmentPending: true,
    classEnrollmentCancelled: true,
    classReminder: true,
  });

  const isMeta = organization?.waConnectionType === "meta";

  const loadTemplates = useCallback(async () => {
    if (!organization?._id) return;
    try {
      setLoading(true);
      const data = await whatsappTemplateService.getTemplates(organization._id);
      setTemplates(data.templates);
      setDefaultTemplates(data.defaultTemplates as Record<string, string>);
      const settings = await whatsappTemplateService.getTemplateSettings(organization._id);
      setTemplateSettings(settings);
      const edited: Record<string, string> = {};
      CLASS_KEYS.forEach((key) => {
        edited[key] = data.templates[key]?.content ?? "";
      });
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

  const handleTemplateChange = (key: string, value: string) =>
    setEditedTemplates((prev) => ({ ...prev, [key]: value }));

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
      const valid: WhatsappTemplateSettings = {
        classEnrollmentConfirmed: templateSettings.classEnrollmentConfirmed,
        classEnrollmentPending: templateSettings.classEnrollmentPending,
        classEnrollmentCancelled: templateSettings.classEnrollmentCancelled,
        classReminder: templateSettings.classReminder,
      };
      await whatsappTemplateService.updateTemplateSettings(organization._id, valid);
      setMessage({ type: "success", text: "Configuración de envíos actualizada correctamente" });
    } catch (error) {
      try { handleAxiosError(error, "Error al guardar configuración"); }
      catch (err) { setMessage({ type: "error", text: (err as Error).message }); }
    } finally { setSaving(false); }
  };

  const handleCopyDefault = (key: string) => {
    setEditedTemplates((prev) => ({ ...prev, [key]: defaultTemplates[key] ?? "" }));
    setMessage({ type: "success", text: "Plantilla por defecto copiada al editor" });
  };

  const handleSelectKey = (key: string) => {
    setSelectedKey(key);
    if (isMobile) setMobileView("editor");
  };

  function getMetaStatusDot(key: ClassKey): { color: string; title: string } | null {
    if (!metaTemplates) return null;
    const name = META_DEFAULT_NAMES[key];
    const found = metaTemplates.find((t) => t.name === name);
    if (!found) return { color: "var(--mantine-color-gray-4)", title: "No enviada" };
    const color = META_STATUS_DOT[found.status] ?? "var(--mantine-color-gray-5)";
    const titles: Record<string, string> = { APPROVED: "Aprobada", PENDING: "En revisión", REJECTED: "Rechazada", DISABLED: "Desactivada" };
    return { color, title: titles[found.status] ?? found.status };
  }

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader size="lg" />
      </Box>
    );
  }

  if (!templates) {
    return <Alert color="red" title="Error">Error al cargar las plantillas</Alert>;
  }

  const showSidebar = !isMobile || mobileView === "list";
  const showEditor = !isMobile || mobileView === "editor";
  const currentInfo = selectedKey !== "settings" ? templateInfo[selectedKey as ClassKey] : null;

  return (
    <>
      <Stack gap="md">
        {/* Cabecera */}
        <Group align="center" gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="green">
            <IconBrandWhatsapp size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={600} lh={1.2}>Mensajes de WhatsApp de clases</Text>
            <Text size="xs" c="dimmed">Personaliza los mensajes automáticos de inscripciones y recordatorios</Text>
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

        <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
          <Box style={{ display: "flex", minHeight: rem(540) }}>

            {/* Sidebar */}
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
                <Box px="md" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
                  <Group justify="space-between">
                    <Text size="sm" fw={600} c="dimmed">Plantillas</Text>
                    {isMeta && metaTemplates === undefined && <Loader size="xs" />}
                  </Group>
                </Box>

                <ScrollArea style={{ flex: 1 }}>
                  {CLASS_KEYS.map((key) => {
                    const dot = isMeta ? getMetaStatusDot(key) : null;
                    const isCustom = !isMeta && templates[key]?.isCustom;
                    return (
                      <NavLink
                        key={key}
                        label={<Text size="sm" lineClamp={1}>{templateInfo[key].shortTitle}</Text>}
                        active={selectedKey === key}
                        onClick={() => handleSelectKey(key)}
                        rightSection={
                          dot ? (
                            <Tooltip label={dot.title} position="right" withArrow>
                              <Box style={{ width: 8, height: 8, borderRadius: "50%", background: dot.color, flexShrink: 0 }} />
                            </Tooltip>
                          ) : isCustom ? (
                            <Tooltip label="Personalizada" position="right" withArrow>
                              <Box style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mantine-color-teal-6)", flexShrink: 0 }} />
                            </Tooltip>
                          ) : null
                        }
                        styles={{ root: { paddingInline: rem(12) } }}
                      />
                    );
                  })}

                  <Divider my="xs" />
                  <NavLink
                    label={<Text size="sm">Configuración de envíos</Text>}
                    leftSection={<IconSettings size={15} />}
                    active={selectedKey === "settings"}
                    onClick={() => handleSelectKey("settings")}
                    styles={{ root: { paddingInline: rem(12) } }}
                  />
                </ScrollArea>

                {isMeta && (
                  <Box px="md" py="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
                    <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: `${rem(4)} ${rem(8)}` }}>
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

            {/* Panel editor */}
            {showEditor && (
              <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <Box px="lg" py="sm" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)", background: "white" }}>
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

                <ScrollArea style={{ flex: 1 }}>
                  <Box p="lg">
                    {selectedKey === "settings" ? (
                      // Configuración
                      <Stack gap="md">
                        <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light" radius="md">
                          <Text size="sm">Habilita o deshabilita el envío automático de cada mensaje de clase.</Text>
                        </Alert>
                        <Stack gap="xs">
                          {SETTINGS_LIST.map(({ key, label, desc }) => (
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
                          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveSettings} loading={saving}>
                            Guardar configuración
                          </Button>
                        </Group>
                      </Stack>

                    ) : isMeta && organization?._id ? (
                      // Editor Meta
                      <MetaTemplateFormTab
                        key={selectedKey}
                        templateKey={selectedKey}
                        organizationId={organization._id}
                        metaTemplates={metaTemplates}
                        onRefreshMetaTemplates={loadMetaTemplates}
                      />

                    ) : (
                      // Editor Baileys
                      <Box
                        style={{ display: "grid", gridTemplateColumns: "1fr", gap: rem(20), alignItems: "start" }}
                        className="class-baileys-grid"
                      >
                        <style>{`
                          @media (min-width: 900px) {
                            .class-baileys-grid { grid-template-columns: 1fr 280px !important; }
                            .class-vars-panel { position: sticky; top: ${rem(20)}; }
                          }
                        `}</style>

                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Text fw={600}>Editor de mensaje</Text>
                              {templates[selectedKey as ClassKey]?.isCustom ? (
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
                            minRows={14}
                            autosize
                            maxRows={28}
                            styles={{ input: { fontFamily: "'Courier New', monospace", fontSize: rem(13), lineHeight: 1.6 } }}
                          />

                          <Group gap="xs">
                            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => handleSave(selectedKey)} loading={saving}>
                              Guardar
                            </Button>
                            {templates[selectedKey as ClassKey]?.isCustom && (
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

                        <Box className="class-vars-panel">
                          <Card withBorder radius="md" p="md">
                            <Text fw={600} mb="xs">Variables disponibles</Text>
                            <Text size="xs" c="dimmed" mb="md">Haz clic para copiar. Se reemplazan con datos reales al enviar.</Text>
                            <Divider mb="md" />
                            <Stack gap="xs">
                              {currentInfo?.variables.map((v) => (
                                <Box
                                  key={v.name}
                                  p="xs"
                                  style={{ borderRadius: rem(6), cursor: "pointer", transition: "background-color 0.15s" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-1)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(v.name);
                                    setMessage({ type: "success", text: `Copiado: ${v.name}` });
                                    setTimeout(() => setMessage(null), 2000);
                                  }}
                                >
                                  <Badge variant="light" color="blue" size="sm" fullWidth style={{ fontFamily: "monospace", cursor: "pointer" }}>
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

      {/* Modal preview Baileys */}
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
        <Box style={{ background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)", padding: rem(16), borderRadius: rem(12) }}>
          <Box style={{ background: "white", borderRadius: rem(32), overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>
            <Box style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: rem(120), height: rem(24), background: "black", borderRadius: `0 0 ${rem(16)} ${rem(16)}`, zIndex: 10 }} />
            <Box style={{ background: "#075E54", padding: `${rem(40)} ${rem(16)} ${rem(12)}`, color: "white" }}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ActionIcon variant="transparent" color="white" size="lg"><IconArrowLeft size={24} /></ActionIcon>
                  <Box style={{ width: rem(40), height: rem(40), borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: rem(18) }}>
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
            <Box style={{ background: "#ECE5DD", padding: rem(16), minHeight: rem(350), maxHeight: rem(450), overflowY: "auto" }}>
              <Box style={{ display: "flex", justifyContent: "flex-start", marginBottom: rem(8) }}>
                <Box style={{ background: "white", borderRadius: `${rem(8)} ${rem(8)} ${rem(8)} ${rem(2)}`, padding: rem(10), maxWidth: "82%", boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, color: "#303030" }}>{preview}</Text>
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
          </Box>
          <Button fullWidth mt="md" variant="light" onClick={() => setPreviewModalOpen(false)}>Cerrar</Button>
        </Box>
      </Modal>
    </>
  );
}
