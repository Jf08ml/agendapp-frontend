/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Stack,
  Text,
  Paper,
  Group,
  TextInput,
  Select,
  TagsInput,
  Switch,
  SegmentedControl,
  ActionIcon,
  Button,
  Divider,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../schema";
import { BUILT_IN_FIELD_KEYS, ClientFieldConfig } from "../../../../services/organizationService";

const TYPE_OPTIONS = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "select", label: "Selección (lista de opciones)" },
];

const SCOPE_OPTIONS = [
  { value: "booking", label: "Ligado a la reserva/pedido" },
  { value: "client", label: "Perfil del cliente" },
];

// Rango Unicode de marcas diacríticas combinantes (U+0300 - U+036F), usado para
// quitar tildes tras normalizar a NFD (ej. "á" -> "a" + combining acute).
const DIACRITICS_RE = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

function slugify(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "campo";
}

function generateUniqueKey(label: string, existingKeys: string[]): string {
  const base = slugify(label);
  let key = base;
  let n = 2;
  while (existingKeys.includes(key) || (BUILT_IN_FIELD_KEYS as readonly string[]).includes(key)) {
    key = `${base}_${n}`;
    n++;
  }
  return key;
}

export default function CustomFieldBuilder({
  form,
  configPath,
  isEditing,
  allowClientScope,
}: {
  form: UseFormReturnType<FormValues>;
  configPath: "clientFormConfig" | "storeFormConfig";
  isEditing: boolean;
  allowClientScope: boolean;
}) {
  const allFields = (form.values[configPath]?.fields ?? []) as ClientFieldConfig[];
  const customFields = allFields.filter((f) => !(BUILT_IN_FIELD_KEYS as readonly string[]).includes(f.key));

  const getIdx = (key: string) => allFields.findIndex((f) => f.key === key);

  const updateField = (key: string, patch: Partial<ClientFieldConfig>) => {
    const idx = getIdx(key);
    if (idx < 0) return;
    for (const [prop, value] of Object.entries(patch)) {
      form.setFieldValue(`${configPath}.fields.${idx}.${prop}` as any, value);
    }
  };

  const handleAddField = () => {
    const existingKeys = allFields.map((f) => f.key);
    const key = generateUniqueKey("Campo nuevo", existingKeys);
    const newField: ClientFieldConfig = {
      key,
      label: "Campo nuevo",
      enabled: true,
      required: false,
      type: "text",
      scope: "booking",
    };
    form.setFieldValue(`${configPath}.fields` as any, [...allFields, newField]);
  };

  const handleDeleteField = (key: string) => {
    form.setFieldValue(
      `${configPath}.fields` as any,
      allFields.filter((f) => f.key !== key)
    );
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <div>
          <Text fw={600} size="sm">Campos personalizados</Text>
          <Text size="xs" c="dimmed">
            Agrega campos propios que no existen en la plataforma (ej. "Número de siniestro", "Talla", "Alergias").
          </Text>
        </div>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={handleAddField}
          disabled={!isEditing}
        >
          Agregar campo
        </Button>
      </Group>

      {customFields.length === 0 && (
        <Text size="xs" c="dimmed" fs="italic">
          No hay campos personalizados configurados.
        </Text>
      )}

      {customFields.map((field) => (
        <Paper key={field.key} withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={2} style={{ flex: 1 }}>
                <TextInput
                  size="sm"
                  label="Etiqueta"
                  placeholder="Ej: Número de siniestro"
                  value={field.label ?? ""}
                  onChange={(e) => updateField(field.key, { label: e.currentTarget.value })}
                  disabled={!isEditing}
                />
                <Text size="xs" c="dimmed">clave: {field.key}</Text>
              </Stack>
              <ActionIcon
                color="red"
                variant="light"
                mt={26}
                onClick={() => handleDeleteField(field.key)}
                disabled={!isEditing}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Group grow align="flex-start">
              <Select
                size="sm"
                label="Tipo"
                data={TYPE_OPTIONS}
                value={field.type ?? "text"}
                onChange={(v) => updateField(field.key, { type: (v as ClientFieldConfig["type"]) ?? "text" })}
                disabled={!isEditing}
                allowDeselect={false}
              />
              {allowClientScope && (
                <div>
                  <Text size="sm" fw={500} mb={4}>Alcance del valor</Text>
                  <SegmentedControl
                    fullWidth
                    size="xs"
                    data={SCOPE_OPTIONS}
                    value={field.scope ?? "booking"}
                    onChange={(v) => updateField(field.key, { scope: v as ClientFieldConfig["scope"] })}
                    disabled={!isEditing}
                  />
                </div>
              )}
            </Group>

            {field.type === "select" && (
              <TagsInput
                size="sm"
                label="Opciones"
                placeholder="Escribe una opción y presiona Enter"
                value={field.options ?? []}
                onChange={(vals) => updateField(field.key, { options: vals })}
                disabled={!isEditing}
              />
            )}

            <Group>
              <Switch
                size="sm"
                label="Habilitado"
                checked={field.enabled ?? true}
                onChange={(e) => updateField(field.key, { enabled: e.currentTarget.checked })}
                disabled={!isEditing}
              />
              <Switch
                size="sm"
                label="Requerido"
                checked={field.required ?? false}
                onChange={(e) => updateField(field.key, { required: e.currentTarget.checked })}
                disabled={!isEditing || !(field.enabled ?? true)}
              />
            </Group>
          </Stack>
        </Paper>
      ))}

      {customFields.length > 0 && <Divider />}
    </Stack>
  );
}
