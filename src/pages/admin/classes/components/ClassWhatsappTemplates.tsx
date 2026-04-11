import React, { useEffect, useState } from "react";
import {
  Stack, Text, Textarea, Button, Group, Badge, Switch,
  Card, Divider, Alert, Skeleton, Accordion, Code, CopyButton,
  ActionIcon, Tooltip, ThemeIcon,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconDeviceFloppy, IconRestore, IconCopy, IconCheck,
  IconBrandWhatsapp, IconInfoCircle,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";
import whatsappTemplateService from "../../../../services/whatsappTemplateService";

// Variables disponibles por template
const TEMPLATE_INFO = {
  classEnrollmentConfirmed: {
    title: "Inscripción confirmada",
    description: "Enviado al cliente cuando el admin aprueba su inscripción (o en aprobación automática).",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión (ej: lunes 15 de julio de 2026)" },
      { name: "{{startTime}}", desc: "Hora de inicio (ej: 07:00 AM)" },
      { name: "{{endTime}}", desc: "Hora de fin" },
      { name: "{{price}}", desc: "Precio total del asistente" },
      { name: "{{discount}}", desc: "Texto de descuento aplicado (vacío si no aplica)" },
    ],
  },
  classEnrollmentCancelled: {
    title: "Inscripción cancelada",
    description: "Enviado al cliente cuando se cancela su inscripción.",
    variables: [
      { name: "{{names}}", desc: "Nombre del asistente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{className}}", desc: "Nombre de la clase" },
      { name: "{{date}}", desc: "Fecha de la sesión" },
      { name: "{{startTime}}", desc: "Hora de inicio" },
      { name: "{{endTime}}", desc: "Hora de fin" },
    ],
  },
};

type TemplateKey = keyof typeof TEMPLATE_INFO;

interface TemplateState {
  content: string;
  isCustom: boolean;
  enabled: boolean;
  dirty: boolean;
}

export default function ClassWhatsappTemplates() {
  const organizationId = useSelector((s: RootState) => s.auth.organizationId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TemplateKey | null>(null);
  const [defaultTemplates, setDefaultTemplates] = useState<Record<TemplateKey, string>>({
    classEnrollmentConfirmed: "",
    classEnrollmentCancelled: "",
  });
  const [templates, setTemplates] = useState<Record<TemplateKey, TemplateState>>({
    classEnrollmentConfirmed: { content: "", isCustom: false, enabled: true, dirty: false },
    classEnrollmentCancelled: { content: "", isCustom: false, enabled: true, dirty: false },
  });

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await whatsappTemplateService.getTemplates(organizationId);
      const settings = await whatsappTemplateService.getTemplateSettings(organizationId);

      const keys: TemplateKey[] = ["classEnrollmentConfirmed", "classEnrollmentCancelled"];
      const newDefaults = { ...defaultTemplates };
      const newTemplates = { ...templates };

      for (const key of keys) {
        const t = (data.templates as any)[key];
        const def = (data.defaultTemplates as any)[key] ?? "";
        newDefaults[key] = def;
        newTemplates[key] = {
          content: t?.content ?? def,
          isCustom: t?.isCustom ?? false,
          enabled: (settings as any)[key] !== false,
          dirty: false,
        };
      }

      setDefaultTemplates(newDefaults);
      setTemplates(newTemplates);
    } catch (err) {
      showNotification({ message: "Error al cargar los templates", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [organizationId]);

  const handleContentChange = (key: TemplateKey, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], content: value, dirty: true },
    }));
  };

  const handleSave = async (key: TemplateKey) => {
    if (!organizationId) return;
    setSaving(key);
    try {
      await whatsappTemplateService.updateTemplate(organizationId, key, templates[key].content);
      setTemplates((prev) => ({
        ...prev,
        [key]: { ...prev[key], isCustom: true, dirty: false },
      }));
      showNotification({ message: "Template guardado", color: "green" });
    } catch (err) {
      showNotification({ message: "Error al guardar el template", color: "red" });
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (key: TemplateKey) => {
    if (!organizationId) return;
    setSaving(key);
    try {
      await whatsappTemplateService.resetTemplate(organizationId, key);
      setTemplates((prev) => ({
        ...prev,
        [key]: { ...prev[key], content: defaultTemplates[key], isCustom: false, dirty: false },
      }));
      showNotification({ message: "Template restaurado al predeterminado", color: "blue" });
    } catch (err) {
      showNotification({ message: "Error al restaurar el template", color: "red" });
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (key: TemplateKey, enabled: boolean) => {
    if (!organizationId) return;
    try {
      await whatsappTemplateService.updateTemplateSettings(organizationId, { [key]: enabled });
      setTemplates((prev) => ({ ...prev, [key]: { ...prev[key], enabled } }));
      showNotification({
        message: enabled ? "Mensaje activado" : "Mensaje desactivado",
        color: enabled ? "green" : "gray",
      });
    } catch (err) {
      showNotification({ message: "Error al actualizar la configuración", color: "red" });
    }
  };

  if (loading) {
    return (
      <Stack gap="md">
        <Skeleton h={200} radius="md" />
        <Skeleton h={200} radius="md" />
      </Stack>
    );
  }

  const keys: TemplateKey[] = ["classEnrollmentConfirmed", "classEnrollmentCancelled"];

  return (
    <Stack gap="lg">
      <Alert icon={<IconBrandWhatsapp size={16} />} color="green" variant="light">
        <Text size="sm">
          Estos mensajes se envían automáticamente por WhatsApp a los asistentes. Puedes personalizar el
          texto o restaurar el predeterminado del sistema. Usa las variables disponibles para incluir
          información dinámica.
        </Text>
      </Alert>

      {keys.map((key) => {
        const info = TEMPLATE_INFO[key];
        const state = templates[key];
        const isSaving = saving === key;

        return (
          <Card key={key} withBorder radius="md" p="md">
            <Group justify="space-between" mb="sm">
              <Group gap="sm">
                <ThemeIcon size="sm" color="green" variant="light" radius="xl">
                  <IconBrandWhatsapp size={14} />
                </ThemeIcon>
                <div>
                  <Text fw={600} size="sm">{info.title}</Text>
                  <Text size="xs" c="dimmed">{info.description}</Text>
                </div>
              </Group>
              <Group gap="xs">
                {state.isCustom && (
                  <Badge size="xs" color="blue" variant="light">Personalizado</Badge>
                )}
                <Switch
                  size="sm"
                  checked={state.enabled}
                  onChange={(e) => handleToggle(key, e.currentTarget.checked)}
                  label={state.enabled ? "Activo" : "Inactivo"}
                />
              </Group>
            </Group>

            <Divider mb="sm" />

            {/* Variables disponibles */}
            <Accordion variant="contained" mb="sm">
              <Accordion.Item value="vars">
                <Accordion.Control icon={<IconInfoCircle size={14} />}>
                  <Text size="xs">Variables disponibles</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap={4}>
                    {info.variables.map((v) => (
                      <Group key={v.name} gap="xs" justify="space-between">
                        <Group gap="xs">
                          <Code>{v.name}</Code>
                          <Text size="xs" c="dimmed">{v.desc}</Text>
                        </Group>
                        <CopyButton value={v.name} timeout={1500}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
                              <ActionIcon size="xs" variant="subtle" onClick={copy}>
                                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            {/* Editor */}
            <Textarea
              autosize
              minRows={6}
              maxRows={14}
              value={state.content}
              onChange={(e) => handleContentChange(key, e.currentTarget.value)}
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: 13,
                  opacity: state.enabled ? 1 : 0.5,
                },
              }}
              disabled={!state.enabled}
            />

            <Group justify="flex-end" mt="sm" gap="xs">
              {state.isCustom && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconRestore size={14} />}
                  loading={isSaving}
                  onClick={() => handleReset(key)}
                >
                  Restaurar predeterminado
                </Button>
              )}
              <Button
                size="xs"
                leftSection={<IconDeviceFloppy size={14} />}
                loading={isSaving}
                disabled={!state.dirty || !state.enabled}
                onClick={() => handleSave(key)}
              >
                Guardar
              </Button>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
