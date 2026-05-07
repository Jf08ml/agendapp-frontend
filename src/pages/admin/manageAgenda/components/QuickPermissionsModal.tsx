import { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  Text,
  Checkbox,
  Button,
  Flex,
  Alert,
  Badge,
  Group,
  Avatar,
  Box,
  Tooltip,
  Divider,
} from "@mantine/core";
import { IconShieldCheck } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import {
  Employee,
  updateEmployee,
} from "../../../../services/employeeService";
import { AGENDA_PERMISSIONS } from "../../../../constants/agendaPermissions";

interface Props {
  employee: Employee | null;
  onClose: () => void;
  onSaved: (updated: Employee) => void;
}

export default function QuickPermissionsModal({
  employee,
  onClose,
  onSaved,
}: Props) {
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setCustomPermissions(employee.customPermissions ?? []);
    }
  }, [employee?._id]);

  const rolePermissions = employee?.role?.permissions ?? [];

  const toggle = (key: string) => {
    setCustomPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!employee?._id) return;
    setSaving(true);
    try {
      const updated = await updateEmployee(employee._id, {
        customPermissions,
      } as Partial<Employee>);
      if (updated) {
        onSaved(updated);
        showNotification({
          message: `Permisos de ${employee.names} actualizados.`,
          color: "green",
        });
        onClose();
      }
    } catch {
      showNotification({
        title: "Error",
        message: "No se pudieron guardar los permisos.",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={!!employee}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Avatar src={employee?.profileImage || undefined} size="sm" radius="xl">
            {employee?.names?.[0]}
          </Avatar>
          <Box>
            <Text fw={600} size="sm" lh={1.2}>
              {employee?.names}
            </Text>
            <Text size="xs" c="dimmed">
              {employee?.position}
            </Text>
          </Box>
        </Group>
      }
      size="sm"
      centered
    >
      <Stack gap="sm">
        <Alert
          color="blue"
          variant="light"
          icon={<IconShieldCheck size={14} />}
          p="xs"
        >
          <Text size="xs">
            Los permisos marcados con{" "}
            <Badge size="xs" variant="light" color="gray">
              Rol
            </Badge>{" "}
            vienen del rol base y no se pueden quitar aquí.
          </Text>
        </Alert>

        {AGENDA_PERMISSIONS.map((perm) => {
          const fromRole = rolePermissions.includes(perm.key);
          const fromCustom = customPermissions.includes(perm.key);
          return (
            <Tooltip
              key={perm.key}
              label="Otorgado por el rol — edita el rol para quitarlo"
              disabled={!fromRole}
              withArrow
              position="right"
            >
              <Checkbox
                label={
                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">{perm.label}</Text>
                    {fromRole && (
                      <Badge size="xs" variant="light" color="gray">
                        Rol
                      </Badge>
                    )}
                  </Group>
                }
                description={perm.description}
                checked={fromRole || fromCustom}
                disabled={fromRole}
                onChange={() => toggle(perm.key)}
              />
            </Tooltip>
          );
        })}

        <Divider />

        <Flex justify="end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar permisos
          </Button>
        </Flex>
      </Stack>
    </Modal>
  );
}
