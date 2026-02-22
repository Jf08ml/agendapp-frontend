import { Badge, Group, Title } from "@mantine/core";
import { Organization } from "../../../../services/organizationService";

export default function HeaderBar({ org }: { org: Organization }) {
  return (
    <Group justify="space-between" align="center" mb="xs">
      <Group gap="sm">
        <Title order={2}>Información de la organización</Title>
        <Badge color={org.isActive ? "green" : "red"}>
          {org.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </Group>
    </Group>
  );
}
