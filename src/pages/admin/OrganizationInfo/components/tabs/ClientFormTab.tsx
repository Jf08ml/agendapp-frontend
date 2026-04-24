import {
  Stack,
  Table,
  Switch,
  Radio,
  Group,
  Badge,
  Text,
  Alert,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle, IconId } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import SectionCard from "../SectionCard";
import { DEFAULT_CLIENT_FORM_CONFIG } from "../../../../../services/organizationService";

const FIELD_META: Record<string, { label: string; description: string }> = {
  name:       { label: "Nombre completo",        description: "Siempre visible y requerido" },
  phone:      { label: "Teléfono",               description: "Usado para envío de recordatorios WhatsApp" },
  email:      { label: "Correo electrónico",     description: "" },
  birthDate:  { label: "Fecha de nacimiento",    description: "" },
  documentId: { label: "Número de documento",    description: "Cédula, pasaporte u otro ID" },
  notes:      { label: "Notas internas",         description: "Visible solo para el equipo, no para el cliente" },
};

const IDENTIFIER_OPTIONS = [
  { value: "phone",      label: "Teléfono",               description: "Cada número de teléfono identifica a un cliente único (comportamiento actual)" },
  { value: "email",      label: "Correo electrónico",     description: "El correo identifica al cliente; el teléfono es solo canal de contacto" },
  { value: "documentId", label: "Número de documento",    description: "La cédula/ID identifica al cliente; ideal para negocios donde una persona reserva para varias (familia, hijos)" },
];

export default function ClientFormTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const rawFields = form.values.clientFormConfig?.fields;
  const fields = (rawFields?.length ? rawFields : DEFAULT_CLIENT_FORM_CONFIG.fields) as typeof DEFAULT_CLIENT_FORM_CONFIG.fields;
  const identifierField = (form.values.clientFormConfig?.identifierField as string) || "phone";

  // Devuelve el índice del campo en el array, garantizando orden canónico
  const getFieldIdx = (key: string): number => {
    const idx = fields.findIndex((f) => f.key === key);
    if (idx >= 0) return idx;
    return -1;
  };

  const handleIdentifierChange = (value: string) => {
    form.setFieldValue("clientFormConfig.identifierField", value as "phone" | "email" | "documentId");

    // Forzar visible+required en el nuevo identificador
    const currentFields = [...(form.values.clientFormConfig?.fields ?? DEFAULT_CLIENT_FORM_CONFIG.fields)] as any[];
    const updated = currentFields.map((f: any) =>
      f.key === value ? { ...f, enabled: true, required: true } : f
    );
    form.setFieldValue("clientFormConfig.fields", updated);
  };

  const handleFieldToggle = (key: string, prop: "enabled" | "required", value: boolean) => {
    const idx = getFieldIdx(key);
    if (idx < 0) return;
    form.setFieldValue(`clientFormConfig.fields.${idx}.${prop}`, value);

    // Si se deshabilita un campo, también quitar required
    if (prop === "enabled" && !value) {
      form.setFieldValue(`clientFormConfig.fields.${idx}.required`, false);
    }
  };

  const isIdentifier = (key: string) => key === identifierField;
  const isNameField  = (key: string) => key === "name";

  return (
    <SectionCard
      title="Formulario de cliente"
      icon={<IconId size={18} />}
      iconColor="blue"
      description="Define qué campo identifica de forma única a cada cliente y qué datos se solicitan al hacer una reserva en línea."
    >
      <Stack gap="xl">

        {/* Selector de identificador */}
        <Stack gap="sm">
          <Text fw={600} size="sm">Campo identificador único</Text>
          <Text size="xs" c="dimmed">
            Este campo se usará para distinguir un cliente de otro. Si dos personas comparten el mismo valor en
            este campo, se considerarán el mismo cliente.
          </Text>

          <Radio.Group
            value={identifierField}
            onChange={handleIdentifierChange}
          >
            <Stack gap="xs">
              {IDENTIFIER_OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  value={opt.value}
                  label={
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>{opt.label}</Text>
                      <Text size="xs" c="dimmed">{opt.description}</Text>
                    </Stack>
                  }
                  disabled={!isEditing}
                />
              ))}
            </Stack>
          </Radio.Group>
        </Stack>

        {identifierField === "documentId" && (
          <Alert icon={<IconInfoCircle size={16} />} color="blue" radius="md">
            Con esta configuración, una madre puede reservar para sus hijos usando el mismo teléfono,
            siempre que cada persona tenga un número de documento distinto. El teléfono seguirá
            usándose para enviar recordatorios de WhatsApp.
          </Alert>
        )}

        {/* Tabla de campos */}
        <Stack gap="xs">
          <Text fw={600} size="sm">Campos del formulario de reserva</Text>
          <Text size="xs" c="dimmed">
            Activa los campos que deseas recopilar de tus clientes. El campo identificador siempre es visible y requerido.
          </Text>

          <Table withBorder withColumnBorders radius="md" mt="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Campo</Table.Th>
                <Table.Th style={{ width: 100, textAlign: "center" }}>Visible</Table.Th>
                <Table.Th style={{ width: 100, textAlign: "center" }}>Requerido</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fields.map((field) => {
                const meta = FIELD_META[field.key] ?? { label: field.key, description: "" };
                const isFixed = isNameField(field.key) || isIdentifier(field.key);
                const idx = getFieldIdx(field.key);

                return (
                  <Table.Tr key={field.key}>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Stack gap={2}>
                          <Group gap="xs">
                            <Text size="sm" fw={500}>{meta.label}</Text>
                            {isIdentifier(field.key) && (
                              <Badge size="xs" color="blue" variant="light">identificador</Badge>
                            )}
                            {isNameField(field.key) && (
                              <Badge size="xs" color="gray" variant="light">fijo</Badge>
                            )}
                          </Group>
                          {meta.description && (
                            <Text size="xs" c="dimmed">{meta.description}</Text>
                          )}
                        </Stack>
                      </Group>
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {isFixed ? (
                        <Tooltip label="No se puede desactivar">
                          <Switch checked size="sm" disabled />
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={idx >= 0 ? (form.values.clientFormConfig?.fields?.[idx] as any)?.enabled ?? field.enabled : field.enabled}
                          size="sm"
                          disabled={!isEditing}
                          onChange={(e) => handleFieldToggle(field.key, "enabled", e.currentTarget.checked)}
                        />
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      {isFixed ? (
                        <Tooltip label="Siempre requerido">
                          <Switch checked size="sm" disabled />
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={idx >= 0 ? (form.values.clientFormConfig?.fields?.[idx] as any)?.required ?? field.required : field.required}
                          size="sm"
                          disabled={!isEditing || !(idx >= 0 ? (form.values.clientFormConfig?.fields?.[idx] as any)?.enabled ?? field.enabled : field.enabled)}
                          onChange={(e) => handleFieldToggle(field.key, "required", e.currentTarget.checked)}
                        />
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      </Stack>
    </SectionCard>
  );
}
