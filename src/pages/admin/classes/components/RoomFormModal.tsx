/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from "react";
import { Modal, TextInput, NumberInput, Textarea, Button, Group, Switch } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Room } from "../../../../services/classService";

interface Props {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Room, "_id" | "organizationId" | "createdAt">) => Promise<void>;
  editing?: Room | null;
  loading?: boolean;
}

export default function RoomFormModal({ opened, onClose, onSubmit, editing, loading }: Props) {
  const form = useForm({
    initialValues: {
      name: "",
      capacity: 10,
      description: "",
      isActive: true,
    },
    validate: {
      name: (v) => (!v.trim() ? "El nombre es requerido" : null),
      capacity: (v) => (v < 1 ? "La capacidad debe ser al menos 1" : null),
    },
  });

  useEffect(() => {
    if (editing) {
      form.setValues({
        name: editing.name,
        capacity: editing.capacity,
        description: editing.description || "",
        isActive: editing.isActive,
      });
    } else {
      form.reset();
    }
  }, [editing, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    await onSubmit(values);
    form.reset();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? "Editar salón" : "Nuevo salón"}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          label="Nombre del salón"
          placeholder="Ej: Salón A, Pista Principal"
          required
          mb="sm"
          {...form.getInputProps("name")}
        />
        <NumberInput
          label="Capacidad máxima"
          description="Número máximo de personas que caben físicamente"
          min={1}
          required
          mb="sm"
          {...form.getInputProps("capacity")}
        />
        <Textarea
          label="Descripción"
          placeholder="Descripción del salón (opcional)"
          mb="sm"
          autosize
          minRows={2}
          {...form.getInputProps("description")}
        />
        <Switch
          label="Salón activo"
          mb="lg"
          {...form.getInputProps("isActive", { type: "checkbox" })}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {editing ? "Guardar cambios" : "Crear salón"}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
