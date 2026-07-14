/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Stack,
  Table,
  Switch,
  Radio,
  Group,
  Badge,
  Text,
  Alert,
} from "@mantine/core";
import { IconInfoCircle, IconBuildingStore } from "@tabler/icons-react";
import type { UseFormReturnType } from "@mantine/form";
import type { FormValues } from "../../schema";
import SectionCard from "../SectionCard";
import { DEFAULT_STORE_FORM_CONFIG } from "../../../../../services/organizationService";

const FIELD_META: Record<string, { label: string; description: string }> = {
  name:       { label: "Nombre completo",        description: "Siempre visible y requerido" },
  phone:      { label: "Teléfono",               description: "Usado para contactar al comprador" },
  email:      { label: "Correo electrónico",     description: "" },
  documentId: { label: "Número de documento",    description: "Cédula, pasaporte u otro ID" },
};

const IDENTIFIER_OPTIONS = [
  { value: "phone",      label: "Teléfono",               description: "Cada número de teléfono identifica a un comprador único (comportamiento actual)" },
  { value: "email",      label: "Correo electrónico",     description: "El correo identifica al comprador; el teléfono es solo canal de contacto" },
  { value: "documentId", label: "Número de documento",    description: "La cédula/ID identifica al comprador" },
];

export default function StoreFormTab({
  form,
  isEditing,
}: {
  form: UseFormReturnType<FormValues>;
  isEditing: boolean;
}) {
  const rawFields = form.values.storeFormConfig?.fields;
  const fields = (rawFields?.length ? rawFields : DEFAULT_STORE_FORM_CONFIG.fields) as typeof DEFAULT_STORE_FORM_CONFIG.fields;
  const identifierField = (form.values.storeFormConfig?.identifierField as string) || "phone";

  const getFieldIdx = (key: string): number => {
    const idx = fields.findIndex((f) => f.key === key);
    if (idx >= 0) return idx;
    return -1;
  };

  const handleIdentifierChange = (value: string) => {
    form.setFieldValue("storeFormConfig.identifierField", value as "phone" | "email" | "documentId");

    const currentFields = [...(form.values.storeFormConfig?.fields ?? DEFAULT_STORE_FORM_CONFIG.fields)] as any[];
    const updated = currentFields.map((f: any) =>
      f.key === value ? { ...f, enabled: true, required: true } : f
    );
    form.setFieldValue("storeFormConfig.fields", updated);
  };

  const handleFieldToggle = (key: string, prop: "enabled" | "required", value: boolean) => {
    const idx = getFieldIdx(key);
    if (idx < 0) return;
    form.setFieldValue(`storeFormConfig.fields.${idx}.${prop}`, value);

    if (prop === "enabled" && !value) {
      form.setFieldValue(`storeFormConfig.fields.${idx}.required`, false);
    }
  };

  const isIdentifier = (key: string) => key === identifierField;
  const isNameField  = (key: string) => key === "name";

  return (
    <SectionCard
      title="Formulario de tienda"
      icon={<IconBuildingStore size={18} />}
      iconColor="grape"
      description="Define qué campo identifica a un comprador y qué datos se solicitan al hacer un pedido en la tienda pública. Es independiente del formulario de cliente de citas."
    >
      <Stack gap="xl">

        <Stack gap="sm">
          <Text fw={600} size="sm">Campo identificador único</Text>
          <Text size="xs" c="dimmed">
            Este campo se usará para distinguir un comprador de otro (solo para autocompletar datos en el
            checkout; la tienda no crea un cliente en tu lista de citas).
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
            Ten en cuenta que la tienda está pensada para público general — exigir número de documento
            puede ser una barrera si tus compradores no son pacientes/clientes registrados.
          </Alert>
        )}

        <Stack gap="xs">
          <Text fw={600} size="sm">Campos del formulario de compra</Text>
          <Text size="xs" c="dimmed">
            Activa los campos que deseas recopilar de tus compradores. El campo identificador siempre es visible y requerido.
          </Text>

          <Table withTableBorder withColumnBorders mt="xs">
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
                      <Switch
                        checked={idx >= 0 ? (form.values.storeFormConfig?.fields?.[idx] as any)?.enabled ?? field.enabled : field.enabled}
                        size="sm"
                        disabled={!isEditing || isFixed}
                        onChange={(e) => handleFieldToggle(field.key, "enabled", e.currentTarget.checked)}
                      />
                    </Table.Td>

                    <Table.Td style={{ textAlign: "center" }}>
                      <Switch
                        checked={idx >= 0 ? (form.values.storeFormConfig?.fields?.[idx] as any)?.required ?? field.required : field.required}
                        size="sm"
                        disabled={!isEditing || isFixed || !(idx >= 0 ? (form.values.storeFormConfig?.fields?.[idx] as any)?.enabled ?? field.enabled : field.enabled)}
                        onChange={(e) => handleFieldToggle(field.key, "required", e.currentTarget.checked)}
                      />
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
