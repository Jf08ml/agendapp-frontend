import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  NavLink,
  Paper,
  rem,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { Collapse } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BiCheckCircle, BiError, BiRefresh, BiTime, BiTrash } from "react-icons/bi";
import { IconEye, IconEyeOff, IconInfoCircle, IconPlus, IconSend } from "@tabler/icons-react";
import {
  createMetaTemplate,
  deleteMetaTemplate,
  listMetaTemplates,
  syncMetaTemplates,
} from "../../../services/organizationService";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: { type: string; text?: string; format?: string }[];
}

interface TemplateForm {
  name: string;
  category: string;
  language: string;
  headerText: string;
  bodyText: string;
  footerText: string;
  /** Ejemplos que el usuario provee para variables no conocidas en el diccionario */
  customExamples: Record<string, string>;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const EMPTY_FORM: TemplateForm = {
  name: "",
  category: "MARKETING",
  language: "es",
  headerText: "",
  bodyText: "",
  footerText: "",
  customExamples: {},
};

const CATEGORIES = [
  { value: "MARKETING", label: "Marketing (promociones, campañas)" },
  { value: "UTILITY", label: "Utilidad (recordatorios, confirmaciones)" },
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es_AR", label: "Español (Argentina)" },
  { value: "en_US", label: "Inglés (EE.UU.)" },
  { value: "pt_BR", label: "Portugués (Brasil)" },
];

const STATUS_LABEL: Record<string, { color: string; label: string }> = {
  APPROVED: { color: "green", label: "Aprobada" },
  PENDING:  { color: "yellow", label: "En revisión" },
  REJECTED: { color: "red", label: "Rechazada" },
  DISABLED: { color: "gray", label: "Desactivada" },
};

const STATUS_DOT: Record<string, string> = {
  APPROVED: "var(--mantine-color-green-6)",
  PENDING:  "var(--mantine-color-yellow-6)",
  REJECTED: "var(--mantine-color-red-6)",
  DISABLED: "var(--mantine-color-gray-5)",
};

/**
 * Diccionario de ejemplos para variables conocidas.
 * Incluye variables de sistema (nombre, fecha...) y variables comunes de campaña.
 */
const VARIABLE_EXAMPLES: Record<string, string> = {
  // Variables de sistema (compartidas con MetaTemplateFormTab)
  nombre_cliente: "Maria Garcia",
  nombre:         "Maria Garcia",
  cliente:        "Maria Garcia",
  fecha_cita:     "lunes 13 de enero a las 10:00 AM",
  fecha:          "13 de enero",
  nombre_negocio: "Mi Negocio",
  negocio:        "Mi Negocio",
  direccion:      "Calle 19 #27-38",
  servicio:       "Pestañas pelo a pelo",
  lista_servicios:"Pestañas pelo a pelo",
  profesional:    "Nataly Martinez",
  enlace_cancelacion: "https://agenditapp.com/cancelar/abc123",
  enlace_gestion: "https://agenditapp.com/gestionar/abc123",
  // Variables típicas de campañas
  descuento:      "30%",
  porcentaje:     "20%",
  promocion:      "20% de descuento en tu próxima cita",
  oferta:         "2x1 en servicios",
  precio:         "$50.000",
  beneficio:      "una sesión gratis",
  codigo:         "PROMO2026",
  link:           "https://agenditapp.com/reservar",
  url:            "https://agenditapp.com/reservar",
  url_reserva:    "https://agenditapp.com/reservar",
  enlace:         "https://agenditapp.com/reservar",
  mes:            "junio",
  temporada:      "temporada alta",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convierte variables con nombre ({{nombre_cliente}}) a posicionales ({{1}}).
 * Mismo algoritmo que MetaTemplateFormTab.
 */
function convertNamedToPositional(text: string): {
  converted: string;
  mapping: { position: number; name: string }[];
} {
  const seen: string[] = [];
  const converted = text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_match, varName: string) => {
    let idx = seen.indexOf(varName);
    if (idx === -1) { seen.push(varName); idx = seen.length - 1; }
    return `{{${idx + 1}}}`;
  });
  return { converted, mapping: seen.map((name, idx) => ({ position: idx + 1, name })) };
}

/** Reemplaza variables nombradas con ejemplos para la vista previa */
function renderPreviewText(
  text: string,
  customExamples: Record<string, string> = {}
): string {
  return text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, name: string) =>
    (VARIABLE_EXAMPLES[name] ?? customExamples[name]?.trim()) || `[${name}]`
  );
}

function getComponent(tpl: MetaTemplate, type: string): string {
  return tpl.components?.find((c) => c.type === type)?.text ?? "";
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function MetaTemplatesPanel({ organizationId }: { organizationId: string }) {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedTemplate = selectedKey && selectedKey !== "new"
    ? templates.find((t) => t.name === selectedKey) ?? null
    : null;
  const isNew = selectedKey === "new";

  // Conversión de variables en tiempo real (solo relevante al crear)
  const { mapping: bodyMapping } = useMemo(
    () => convertNamedToPositional(form.bodyText),
    [form.bodyText]
  );
  const { mapping: headerMapping } = useMemo(
    () => convertNamedToPositional(form.headerText),
    [form.headerText]
  );

  // Variables que no tienen ejemplo en el diccionario → el usuario debe proveerlos
  const unknownVars = useMemo(
    () => [...bodyMapping, ...headerMapping].filter(({ name }) => !VARIABLE_EXAMPLES[name]),
    [bodyMapping, headerMapping]
  );

  const previewHeader = renderPreviewText(form.headerText, form.customExamples);
  const previewBody   = renderPreviewText(form.bodyText, form.customExamples);

  // ── Datos ──────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates((await listMetaTemplates(organizationId)) || []);
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al cargar plantillas" });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      setTemplates((await syncMetaTemplates(organizationId)) || []);
      notifications.show({ color: "teal", message: "Plantillas sincronizadas con Meta." });
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al sincronizar" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectNew = () => {
    setSelectedKey("new");
    setForm(EMPTY_FORM);
    setPreviewOpen(false);
  };

  const handleSelectTemplate = (tpl: MetaTemplate) => {
    setSelectedKey(tpl.name);
    setForm({
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      headerText: getComponent(tpl, "HEADER"),
      bodyText: getComponent(tpl, "BODY"),
      footerText: getComponent(tpl, "FOOTER"),
      customExamples: {},
    });
    setPreviewOpen(false);
  };

  // ── Crear ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim() || !form.bodyText.trim()) {
      notifications.show({ color: "orange", message: "El nombre y el cuerpo son obligatorios." });
      return;
    }
    // Validar ejemplos de variables desconocidas
    const missing = unknownVars.filter(({ name }) => !form.customExamples[name]?.trim());
    if (missing.length > 0) {
      notifications.show({
        color: "orange",
        message: `Agrega ejemplos para: ${missing.map(v => `{{${v.name}}}`).join(", ")}`,
      });
      return;
    }

    setSaving(true);
    try {
      const { converted: convertedBody, mapping: bMap } = convertNamedToPositional(form.bodyText);
      const { converted: convertedHeader, mapping: hMap } = convertNamedToPositional(form.headerText);
      const { converted: convertedFooter } = convertNamedToPositional(form.footerText);

      const components: object[] = [];

      // HEADER
      if (convertedHeader.trim()) {
        const headerComp: Record<string, unknown> = { type: "HEADER", format: "TEXT", text: convertedHeader.trim() };
        if (hMap.length > 0) {
          headerComp.example = {
            header_text: hMap.map(({ name }) => VARIABLE_EXAMPLES[name] ?? form.customExamples[name]?.trim() ?? name),
          };
        }
        components.push(headerComp);
      }

      // BODY
      const bodyExamples = bMap.map(({ name }) =>
        VARIABLE_EXAMPLES[name] ?? form.customExamples[name]?.trim() ?? name
      );
      const bodyComp: Record<string, unknown> = { type: "BODY", text: convertedBody.trim() };
      if (bodyExamples.length > 0) bodyComp.example = { body_text: [bodyExamples] };
      components.push(bodyComp);

      // FOOTER
      if (convertedFooter.trim()) components.push({ type: "FOOTER", text: convertedFooter.trim() });

      await createMetaTemplate(organizationId, {
        name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
        category: form.category,
        language: form.language,
        components,
      });

      notifications.show({ color: "green", message: "Plantilla enviada a revisión. Meta la aprueba en hasta 24h." });
      const updated = await syncMetaTemplates(organizationId);
      setTemplates(updated || []);
      setSelectedKey(null);
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al crear plantilla" });
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    setDeleting(true);
    try {
      await deleteMetaTemplate(organizationId, selectedTemplate.name);
      notifications.show({ color: "teal", message: "Plantilla eliminada." });
      setTemplates((prev) => prev.filter((t) => t.name !== selectedTemplate.name));
      setSelectedKey(null);
    } catch (err: unknown) {
      notifications.show({ color: "red", message: err instanceof Error ? err.message : "Error al eliminar" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box style={{ display: "flex", minHeight: rem(420) }}>

      {/* ── Sidebar izquierdo: lista ──────────────────────────────── */}
      <Box
        style={{
          width: rem(192),
          flexShrink: 0,
          borderRight: "1px solid var(--mantine-color-gray-3)",
          display: "flex",
          flexDirection: "column",
          background: "var(--mantine-color-gray-0)",
        }}
      >
        <Box px="sm" py="xs" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: "0.05em" }}>
              Mis plantillas
            </Text>
            <Tooltip label="Sincronizar con Meta" withArrow>
              <ActionIcon size="xs" variant="subtle" color="gray" onClick={handleSync} loading={syncing}>
                <BiRefresh size={13} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>

        <NavLink
          label={<Group gap={4} wrap="nowrap"><IconPlus size={13} /><Text size="sm">Nueva plantilla</Text></Group>}
          active={selectedKey === "new"}
          onClick={handleSelectNew}
          styles={{ root: { paddingInline: rem(10) } }}
        />
        <Divider />

        <ScrollArea style={{ flex: 1 }}>
          {loading ? (
            <Group justify="center" py="lg"><Loader size="xs" /></Group>
          ) : templates.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="lg" px="sm">Sin plantillas</Text>
          ) : templates.map((tpl) => (
            <NavLink
              key={tpl.name}
              label={<Text size="sm" lineClamp={1}>{tpl.name}</Text>}
              rightSection={
                <Box style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: STATUS_DOT[tpl.status] ?? "var(--mantine-color-gray-5)",
                  flexShrink: 0,
                }} />
              }
              active={selectedKey === tpl.name}
              onClick={() => handleSelectTemplate(tpl)}
              styles={{ root: { paddingInline: rem(10) } }}
            />
          ))}
        </ScrollArea>

        <Box px="sm" py="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
          {[
            { color: STATUS_DOT.APPROVED, label: "Aprobada" },
            { color: STATUS_DOT.PENDING,  label: "En revisión" },
            { color: STATUS_DOT.REJECTED, label: "Rechazada" },
          ].map(({ color, label }) => (
            <Group key={label} gap={rem(4)} wrap="nowrap">
              <Box style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <Text size="xs" c="dimmed">{label}</Text>
            </Group>
          ))}
        </Box>
      </Box>

      {/* ── Panel editor ──────────────────────────────────────────── */}
      <Box style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {selectedKey === null ? (
          <Stack align="center" justify="center" style={{ height: "100%", minHeight: rem(300) }} gap="xs">
            <Text c="dimmed" ta="center">Selecciona una plantilla o crea una nueva</Text>
            <Text size="xs" c="dimmed" ta="center" maw={320}>
              Las plantillas deben ser aprobadas por Meta antes de usarse en campañas (hasta 24h).
            </Text>
          </Stack>
        ) : (
          <Stack gap="md" p="lg">

            {/* Badge de estado (solo plantillas existentes) */}
            {selectedTemplate && (() => {
              const sc = STATUS_LABEL[selectedTemplate.status] ?? { color: "gray", label: selectedTemplate.status };
              return (
                <Group gap="xs">
                  <Badge color={sc.color} size="sm"
                    leftSection={sc.color === "green" ? <BiCheckCircle size={11} /> : sc.color === "yellow" ? <BiTime size={11} /> : <BiError size={11} />}
                  >
                    {sc.label}
                  </Badge>
                  <Badge color="gray" variant="outline" size="sm">{selectedTemplate.category}</Badge>
                  <Badge color="gray" variant="outline" size="sm">{selectedTemplate.language}</Badge>
                </Group>
              );
            })()}

            {/* Hint de variables (solo al crear) */}
            {isNew && (
              <Alert color="blue" icon={<IconInfoCircle size={14} />} p="sm">
                <Text size="xs">
                  Usa <strong>{"{{nombre_variable}}"}</strong> para variables. Se convierten automáticamente al formato de Meta{" "}
                  <strong>{"{{1}}"}, {"{{2}}"}…</strong>
                  <br />
                  Para personalizar por cliente, incluye <strong>{"{{nombre_cliente}}"}</strong> como primera variable.
                  Las demás se completan al crear cada campaña.
                </Text>
              </Alert>
            )}

            {/* Nombre */}
            <TextInput
              label="Nombre de la plantilla"
              placeholder="promo_junio_2026"
              description={isNew ? "Solo minúsculas y guiones bajos. Los espacios se convierten automáticamente." : undefined}
              required={isNew}
              disabled={!isNew}
              value={form.name}
              onChange={(e) => {
                const name = e.currentTarget.value;
                setForm((f) => ({ ...f, name }));
              }}
            />

            {/* Categoría + Idioma (solo nueva) */}
            {isNew && (
              <Group grow>
                <Select label="Categoría" data={CATEGORIES} value={form.category}
                  onChange={(v) => setForm((f) => ({ ...f, category: v ?? "MARKETING" }))} />
                <Select label="Idioma" data={LANGUAGES} value={form.language}
                  onChange={(v) => setForm((f) => ({ ...f, language: v ?? "es" }))} />
              </Group>
            )}

            {/* Encabezado */}
            <TextInput
              label="Encabezado"
              placeholder="¡Oferta exclusiva para ti!"
              description="Opcional · máx. 60 caracteres"
              maxLength={60}
              disabled={!isNew}
              value={form.headerText}
              onChange={(e) => {
                const headerText = e.currentTarget.value;
                setForm((f) => ({ ...f, headerText }));
              }}
            />

            {/* Cuerpo */}
            <Textarea
              label="Cuerpo del mensaje"
              placeholder={"Hola {{nombre_cliente}} 💖\n\nEste mes tenemos {{promocion}}.\n\nReserva aquí: {{url_reserva}}\n\n¡Te esperamos!"}
              description={isNew ? "Obligatorio · usa {{nombre_variable}} para datos dinámicos" : undefined}
              required={isNew}
              minRows={5}
              autosize
              disabled={!isNew}
              value={form.bodyText}
              onChange={(e) => {
                const bodyText = e.currentTarget.value;
                setForm((f) => ({ ...f, bodyText }));
              }}
              styles={isNew ? { input: { fontFamily: "'Courier New', monospace", fontSize: 13 } } : undefined}
            />

            {/* Pie de página */}
            <TextInput
              label="Pie de página"
              placeholder="Responde STOP para no recibir más mensajes"
              description="Opcional · máx. 60 caracteres"
              maxLength={60}
              disabled={!isNew}
              value={form.footerText}
              onChange={(e) => {
                const footerText = e.currentTarget.value;
                setForm((f) => ({ ...f, footerText }));
              }}
            />

            {/* Tabla de conversión de variables (solo al crear, cuando hay variables) */}
            {isNew && bodyMapping.length > 0 && (
              <Box>
                <Divider mb="xs" label="Conversión de variables" labelPosition="left" />
                <Table striped withTableBorder withColumnBorders fz="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nombre en el editor</Table.Th>
                      <Table.Th>Formato Meta</Table.Th>
                      <Table.Th>Rol en campaña</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {bodyMapping.map(({ position, name }) => (
                      <Table.Tr key={name}>
                        <Table.Td ff="monospace">{`{{${name}}}`}</Table.Td>
                        <Table.Td ff="monospace" c="blue">{`{{${position}}}`}</Table.Td>
                        <Table.Td c="dimmed">
                          {position === 1
                            ? "Nombre del cliente (automático)"
                            : "Valor fijo — lo defines al crear la campaña"}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Box>
            )}

            {/* Ejemplos para variables desconocidas (las del diccionario son automáticas) */}
            {isNew && unknownVars.length > 0 && (
              <Box>
                <Divider mb="xs" label="Ejemplos para revisión de Meta" labelPosition="left" />
                <Text size="xs" c="dimmed" mb="xs">
                  Meta necesita ejemplos para estas variables. No se envían a los clientes — solo sirven para la revisión.
                </Text>
                <Stack gap="xs">
                  {unknownVars.map(({ name, position }) => (
                    <TextInput
                      key={name}
                      label={`Ejemplo para {{${name}}} → {{${position}}}`}
                      placeholder={`ej: valor real que aparecería en lugar de {{${name}}}`}
                      required
                      value={form.customExamples[name] || ""}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        setForm((f) => ({ ...f, customExamples: { ...f.customExamples, [name]: value } }));
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Vista previa */}
            <Box>
              <Divider
                mb="xs"
                label={
                  <Button size="xs" variant="subtle"
                    leftSection={previewOpen ? <IconEyeOff size={13} /> : <IconEye size={13} />}
                    onClick={() => setPreviewOpen((o) => !o)}
                  >
                    {previewOpen ? "Ocultar vista previa" : "Vista previa"}
                  </Button>
                }
                labelPosition="left"
              />
              <Collapse in={previewOpen}>
                <Paper p="md" style={{ backgroundColor: "#ECE5DD", borderRadius: 10 }}>
                  <Box style={{
                    background: "white", borderRadius: "8px 8px 8px 2px",
                    padding: "10px 14px", maxWidth: "85%",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.13)",
                    display: "inline-block", minWidth: 180,
                  }}>
                    {previewHeader.trim() && (
                      <Text fw={700} size="sm" mb={4} style={{ lineHeight: 1.4 }}>{previewHeader}</Text>
                    )}
                    {previewBody ? (
                      <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.55, color: "#303030" }}>
                        {previewBody}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">El mensaje aparecerá aquí…</Text>
                    )}
                    {form.footerText.trim() && (
                      <Text size="xs" c="dimmed" mt={4}>{form.footerText}</Text>
                    )}
                    <Text size="xs" c="dimmed" ta="right" mt={6} style={{ fontSize: 11 }}>
                      {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} ✓✓
                    </Text>
                  </Box>
                </Paper>
                <Text size="xs" c="dimmed" mt="xs">
                  Vista previa con datos de ejemplo. El aspecto real puede variar según el dispositivo.
                </Text>
              </Collapse>
            </Box>

            {/* Acciones */}
            <Group justify="space-between" mt="xs">
              {isNew ? (
                <Button leftSection={<IconSend size={15} />} onClick={handleCreate} loading={saving}>
                  Enviar a revisión de Meta
                </Button>
              ) : (
                <>
                  <Text size="xs" c="dimmed" style={{ maxWidth: 280 }}>
                    {selectedTemplate?.status === "APPROVED"
                      ? "Las plantillas aprobadas no se pueden editar en Meta."
                      : "Para editar, elimina la plantilla y créala de nuevo con los cambios."}
                  </Text>
                  <Button color="red" variant="light" leftSection={<BiTrash size={15} />}
                    loading={deleting} onClick={handleDelete}>
                    Eliminar
                  </Button>
                </>
              )}
            </Group>

          </Stack>
        )}
      </Box>
    </Box>
  );
}
