/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import {
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Switch,
  Stack,
  Divider,
  Text,
  ColorInput,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { ClassType } from "../../../../services/classService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<ClassType, "_id" | "organizationId" | "createdAt">,
  ) => Promise<void>;
  editing?: ClassType | null;
  loading?: boolean;
}

interface FormValues {
  name: string;
  description: string;
  duration: number;
  defaultCapacity: number;
  pricePerPerson: number;
  color: string;
  isActive: boolean;
  groupDiscount: {
    enabled: boolean;
    minPeople: number;
    maxPeople: number | null;
    discountPercent: number;
  };
}

export default function ClassFormModal({
  opened,
  onClose,
  onSubmit,
  editing,
  loading,
}: Props) {
  const form = useForm<FormValues>({
    initialValues: {
      name: "",
      description: "",
      duration: 60,
      defaultCapacity: 10,
      pricePerPerson: 0,
      color: "#4C6EF5",
      isActive: true,
      groupDiscount: {
        enabled: false,
        minPeople: 2,
        maxPeople: null as number | null,
        discountPercent: 10,
      },
    },
    validate: {
      name: (v) => (!v.trim() ? "El nombre es requerido" : null),
      duration: (v) => v < 1 ? "La duración debe ser al menos 1 minuto" : null,
      defaultCapacity: (v) => (v < 1 ? "El cupo debe ser al menos 1" : null),
      pricePerPerson: (v) => (v < 0 ? "El precio no puede ser negativo" : null),
      groupDiscount: {
        minPeople: (v, values) =>
          (values as FormValues).groupDiscount.enabled && v < 2 ? "Mínimo 2 personas" : null,
        discountPercent: (v, values) =>
          (values as FormValues).groupDiscount.enabled && (v <= 0 || v > 100)
            ? "El descuento debe estar entre 1 y 100"
            : null,
      },
    },
  });

  useEffect(() => {
    if (editing) {
      form.setValues({
        name: editing.name,
        description: editing.description || "",
        duration: editing.duration,
        defaultCapacity: editing.defaultCapacity,
        pricePerPerson: editing.pricePerPerson,
        color: editing.color || "#4C6EF5",
        isActive: editing.isActive,
        groupDiscount: {
          enabled: editing.groupDiscount?.enabled ?? false,
          minPeople: editing.groupDiscount?.minPeople ?? 2,
          maxPeople: editing.groupDiscount?.maxPeople ?? null,
          discountPercent: editing.groupDiscount?.discountPercent ?? 10,
        },
      });
    } else {
      form.reset();
    }
  }, [editing, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    await onSubmit(values);
    form.reset();
  };

  const discountEnabled = form.values.groupDiscount.enabled;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Editar clase" : "Nueva clase"}
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="sm">
          <TextInput
            label="Nombre de la clase"
            placeholder="Ej: Pilates Básico, Curso de Verano"
            required
            {...form.getInputProps("name")}
          />
          <Textarea
            label="Descripción"
            placeholder="Describe la clase para los clientes"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />
          <SimpleGrid cols={2}>
            <NumberInput
              label="Duración (minutos)"
              min={1}
              required
              {...form.getInputProps("duration")}
            />
            <NumberInput
              label="Cupo por defecto"
              description="Personas por sesión"
              min={1}
              required
              {...form.getInputProps("defaultCapacity")}
            />
          </SimpleGrid>
          <SimpleGrid cols={2}>
            <NumberInput
              label="Precio por persona"
              prefix="$"
              thousandSeparator=","
              min={0}
              required
              {...form.getInputProps("pricePerPerson")}
            />
            <ColorInput
              label="Color en agenda"
              format="hex"
              swatches={[
                "#4C6EF5",
                "#7950F2",
                "#E64980",
                "#F03E3E",
                "#2F9E44",
                "#1971C2",
                "#F76707",
              ]}
              {...form.getInputProps("color")}
            />
          </SimpleGrid>

          <Divider label="Descuento grupal" labelPosition="left" />

          <Switch
            label="Activar descuento por reserva grupal"
            description="Aplica un descuento cuando reservan juntos cierto número de personas"
            {...form.getInputProps("groupDiscount.enabled", {
              type: "checkbox",
            })}
          />

          {discountEnabled && (
            <Stack
              gap="sm"
              pl="md"
              style={{ borderLeft: "3px solid var(--mantine-color-blue-4)" }}
            >
              <Text size="xs" c="dimmed">
                El descuento aplica cuando el número de personas está entre el
                mínimo y el máximo (si se define).
              </Text>
              <SimpleGrid cols={3}>
                <NumberInput
                  label="Mínimo de personas"
                  min={2}
                  required
                  {...form.getInputProps("groupDiscount.minPeople")}
                />
                <NumberInput
                  label="Máximo de personas"
                  description="Opcional"
                  min={2}
                  allowDecimal={false}
                  placeholder="Sin límite"
                  value={form.values.groupDiscount.maxPeople ?? ""}
                  onChange={(v) =>
                    form.setFieldValue(
                      "groupDiscount.maxPeople",
                      v === "" ? null : Number(v),
                    )
                  }
                />
                <NumberInput
                  label="Descuento (%)"
                  min={1}
                  max={100}
                  suffix="%"
                  required
                  {...form.getInputProps("groupDiscount.discountPercent")}
                />
              </SimpleGrid>
            </Stack>
          )}

          <Switch
            label="Clase activa"
            {...form.getInputProps("isActive", { type: "checkbox" })}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editing ? "Guardar cambios" : "Crear clase"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
