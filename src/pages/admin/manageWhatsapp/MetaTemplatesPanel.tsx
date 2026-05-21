import React, { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  BiCheckCircle,
  BiError,
  BiPlus,
  BiRefresh,
  BiTime,
  BiTrash,
} from "react-icons/bi";
import {
  createMetaTemplate,
  deleteMetaTemplate,
  listMetaTemplates,
  syncMetaTemplates,
} from "../../../services/organizationService";

interface Props {
  organizationId: string;
}

type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "DISABLED" | string;

interface MetaTemplate {
  id: string;
  name: string;
  status: TemplateStatus;
  category: string;
  language: string;
  components: { type: string; text?: string; format?: string }[];
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  APPROVED: { color: "green", icon: <BiCheckCircle size={14} />, label: "Aprobada" },
  PENDING: { color: "yellow", icon: <BiTime size={14} />, label: "Pendiente" },
  REJECTED: { color: "red", icon: <BiError size={14} />, label: "Rechazada" },
  DISABLED: { color: "gray", icon: <BiError size={14} />, label: "Desactivada" },
};

const CATEGORIES = [
  { value: "UTILITY", label: "Utilidad (recordatorios, confirmaciones)" },
  { value: "MARKETING", label: "Marketing (promociones, campañas)" },
  { value: "AUTHENTICATION", label: "Autenticación (códigos OTP)" },
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es_AR", label: "Español (Argentina)" },
  { value: "en_US", label: "Inglés (EE.UU.)" },
  { value: "pt_BR", label: "Portugués (Brasil)" },
];

const MetaTemplatesPanel: React.FC<Props> = ({ organizationId }) => {
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "UTILITY",
    language: "es",
    bodyText: "",
    headerText: "",
    footerText: "",
  });
  const [creating, setCreating] = useState(false);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const data = await listMetaTemplates(organizationId);
      setTemplates(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar plantillas";
      notifications.show({ color: "red", message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, [organizationId]);

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await syncMetaTemplates(organizationId);
      setTemplates(data || []);
      notifications.show({ color: "teal", message: "Plantillas sincronizadas con Meta." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al sincronizar";
      notifications.show({ color: "red", message: msg });
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.bodyText.trim()) {
      notifications.show({ color: "orange", message: "El nombre y el cuerpo del mensaje son obligatorios." });
      return;
    }
    setCreating(true);
    try {
      const components: object[] = [];
      if (form.headerText.trim()) {
        components.push({ type: "HEADER", format: "TEXT", text: form.headerText.trim() });
      }
      components.push({ type: "BODY", text: form.bodyText.trim() });
      if (form.footerText.trim()) {
        components.push({ type: "FOOTER", text: form.footerText.trim() });
      }

      await createMetaTemplate(organizationId, {
        name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
        category: form.category,
        language: form.language,
        components,
      });

      notifications.show({ color: "green", message: "Plantilla enviada a revisión de Meta. Puede tardar hasta 24h." });
      setCreateOpen(false);
      setForm({ name: "", category: "UTILITY", language: "es", bodyText: "", headerText: "", footerText: "" });
      await handleSync();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear plantilla";
      notifications.show({ color: "red", message: msg });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(templateName: string) {
    setDeleting(templateName);
    try {
      await deleteMetaTemplate(organizationId, templateName);
      notifications.show({ color: "teal", message: "Plantilla eliminada." });
      setTemplates((prev) => prev.filter((t) => t.name !== templateName));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      notifications.show({ color: "red", message: msg });
    } finally {
      setDeleting(null);
    }
  }

  function getBodyText(tpl: MetaTemplate): string {
    return tpl.components?.find((c) => c.type === "BODY")?.text ?? "";
  }

  const statusCfg = (status: string) =>
    STATUS_CONFIG[status] ?? { color: "gray", icon: null, label: status };

  return (
    <Box>
      <Group justify="space-between" align="center" mb="md">
        <Title order={5}>Plantillas Meta (Cloud API)</Title>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<BiRefresh size={14} />}
            onClick={handleSync}
            loading={syncing}
          >
            Sincronizar
          </Button>
          <Button
            size="xs"
            leftSection={<BiPlus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Nueva plantilla
          </Button>
        </Group>
      </Group>

      <Alert color="blue" mb="md">
        <Text size="xs">
          Las plantillas Meta deben ser aprobadas por Meta antes de poder usarlas (puede tardar hasta 24h).
          Usa <b>{"{{1}}"}</b>, <b>{"{{2}}"}</b>... para variables en el cuerpo del mensaje.
        </Text>
      </Alert>

      {loading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : templates.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="xl">
          No hay plantillas Meta. Crea una nueva o sincroniza con Meta.
        </Text>
      ) : (
        <Stack gap="sm">
          {templates.map((tpl) => {
            const sc = statusCfg(tpl.status);
            return (
              <Card key={tpl.id} withBorder radius="md" p="sm">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      <Text fw={600} size="sm" style={{ wordBreak: "break-all" }}>
                        {tpl.name}
                      </Text>
                      <Badge color={sc.color} size="xs" leftSection={sc.icon}>
                        {sc.label}
                      </Badge>
                      <Badge color="gray" variant="outline" size="xs">
                        {tpl.category}
                      </Badge>
                      <Badge color="gray" variant="outline" size="xs">
                        {tpl.language}
                      </Badge>
                    </Group>
                    {getBodyText(tpl) && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {getBodyText(tpl)}
                      </Text>
                    )}
                  </Box>
                  <Tooltip label="Eliminar plantilla">
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<BiTrash size={14} />}
                      loading={deleting === tpl.name}
                      onClick={() => handleDelete(tpl.name)}
                    >
                      Eliminar
                    </Button>
                  </Tooltip>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}

      <Divider mt="md" />

      {/* Create Template Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nueva Plantilla Meta"
        size="lg"
      >
        <Stack gap="md">
          <Alert color="yellow">
            <Text size="xs">
              El nombre solo puede contener letras minúsculas, números y guiones bajos.
              Los espacios se convierten automáticamente en guiones bajos.
            </Text>
          </Alert>

          <TextInput
            label="Nombre de la plantilla"
            placeholder="confirmacion_cita"
            description="Identificador único (solo minúsculas y guiones bajos)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
          />

          <Group grow>
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
            placeholder="Tu cita está confirmada"
            description="Texto de encabezado — máx. 60 caracteres"
            maxLength={60}
            value={form.headerText}
            onChange={(e) => setForm((f) => ({ ...f, headerText: e.currentTarget.value }))}
          />

          <Textarea
            label="Cuerpo del mensaje"
            placeholder={"Hola {{1}}, te recordamos tu cita el {{2}} con {{3}}."}
            description='Usa {{1}}, {{2}}, {{3}}... para variables. Obligatorio.'
            required
            minRows={4}
            value={form.bodyText}
            onChange={(e) => setForm((f) => ({ ...f, bodyText: e.currentTarget.value }))}
          />

          <TextInput
            label="Pie de página (opcional)"
            placeholder="Responde CANCELAR para anular tu cita"
            description="Texto secundario al final — máx. 60 caracteres"
            maxLength={60}
            value={form.footerText}
            onChange={(e) => setForm((f) => ({ ...f, footerText: e.currentTarget.value }))}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              Enviar a revisión
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default MetaTemplatesPanel;
