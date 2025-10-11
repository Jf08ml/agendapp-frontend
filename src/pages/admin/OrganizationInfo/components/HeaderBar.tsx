import { Badge, Button, Group, Title } from "@mantine/core";
import { Organization } from "../../../../services/organizationService";

export default function HeaderBar({
  org,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
}: {
  org: Organization;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Group justify="space-between" align="center" mb="xs">
      <Group gap="sm">
        <Title order={2}>Información de la organización</Title>
        <Badge color={org.isActive ? "green" : "red"}>
          {org.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </Group>

      {!isEditing ? (
        <Button onClick={onEdit}>Editar</Button>
      ) : (
        <Group gap="xs">
          <Button color="green" onClick={onSave} loading={saving}>
            Guardar cambios
          </Button>
          <Button
            variant="light"
            color="gray"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
        </Group>
      )}
    </Group>
  );
}
