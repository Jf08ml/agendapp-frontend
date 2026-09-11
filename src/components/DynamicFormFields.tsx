import { TextInput, NumberInput, Select, SimpleGrid } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { ClientFieldConfig } from "../services/organizationService";

interface DynamicFormFieldsProps {
  /** Campos personalizados ya filtrados (excluyendo built-in) y habilitados. */
  fields: ClientFieldConfig[];
  /** Los valores llegan como `unknown` (vienen de un `Mixed` en Mongo, o de un JSON.parse) — el componente los estrecha con `typeof`/`instanceof` antes de usarlos en cada input. */
  values: Record<string, unknown>;
  onChange: (key: string, value: string | number | Date | null) => void;
  disabled?: boolean;
}

/**
 * Renderiza campos personalizados de la organización (Organization.clientFormConfig
 * / storeFormConfig) en los formularios públicos de reserva y tienda — el input se
 * elige según field.type. Complementa (no reemplaza) los campos fijos ya hardcodeados
 * de cada formulario (nombre, teléfono, email, etc.).
 */
export default function DynamicFormFields({ fields, values, onChange, disabled }: DynamicFormFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {fields.map((field) => {
        const value = values[field.key];
        const label = field.label || field.key;

        if (field.type === "number") {
          return (
            <NumberInput
              key={field.key}
              label={label}
              value={typeof value === "number" ? value : undefined}
              onChange={(v) => onChange(field.key, typeof v === "number" ? v : null)}
              required={field.required}
              disabled={disabled}
            />
          );
        }

        if (field.type === "date") {
          return (
            <DateInput
              key={field.key}
              label={label}
              value={value instanceof Date ? value : null}
              onChange={(v) => onChange(field.key, v)}
              valueFormat="DD/MM/YYYY"
              locale="es"
              required={field.required}
              disabled={disabled}
              popoverProps={{ withinPortal: true, trapFocus: false }}
            />
          );
        }

        if (field.type === "select") {
          return (
            <Select
              key={field.key}
              label={label}
              data={field.options ?? []}
              value={typeof value === "string" ? value : null}
              onChange={(v) => onChange(field.key, v)}
              required={field.required}
              disabled={disabled}
            />
          );
        }

        return (
          <TextInput
            key={field.key}
            label={label}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.key, e.currentTarget.value)}
            required={field.required}
            disabled={disabled}
          />
        );
      })}
    </SimpleGrid>
  );
}
