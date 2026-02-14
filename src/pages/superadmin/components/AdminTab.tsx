import {
  Stack,
  TextInput,
  Switch,
  Select,
  Group,
  Button,
  ActionIcon,
  Text,
  Badge,
  Paper,
  PasswordInput,
} from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { BiPlus, BiTrash } from "react-icons/bi";
import { useState } from "react";
import type { SuperadminFormValues } from "../schema";

export default function AdminTab({
  form,
  isEditing,
  isCreateMode,
}: {
  form: UseFormReturnType<SuperadminFormValues>;
  isEditing: boolean;
  isCreateMode: boolean;
}) {
  const [newDomain, setNewDomain] = useState("");

  const domains = form.values.domains || [];

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase();
    if (!trimmed) return;
    if (domains.includes(trimmed)) return;
    form.setFieldValue("domains", [...domains, trimmed]);
    setNewDomain("");
  };

  const handleRemoveDomain = (index: number) => {
    form.setFieldValue(
      "domains",
      domains.filter((_, i) => i !== index)
    );
  };

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Dominios
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Dominios asociados a esta organización para el multi-tenant
        </Text>
        <Stack gap="xs">
          {domains.map((domain, index) => (
            <Group key={index} gap="xs">
              <Badge variant="light" color="blue" size="lg" style={{ flex: 1 }}>
                {domain}
              </Badge>
              {isEditing && (
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => handleRemoveDomain(index)}
                >
                  <BiTrash size={14} />
                </ActionIcon>
              )}
            </Group>
          ))}
          {isEditing && (
            <Group gap="xs">
              <TextInput
                placeholder="nuevo-dominio.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button
                size="sm"
                variant="light"
                leftSection={<BiPlus size={14} />}
                onClick={handleAddDomain}
              >
                Agregar
              </Button>
            </Group>
          )}
          {domains.length === 0 && !isEditing && (
            <Text size="sm" c="dimmed" fs="italic">
              Sin dominios configurados
            </Text>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Contraseña
        </Text>
        <PasswordInput
          label={isCreateMode ? "Contraseña" : "Nueva contraseña"}
          placeholder={
            isCreateMode
              ? "Contraseña para la organización"
              : "Dejar vacío para mantener la actual"
          }
          disabled={!isEditing}
          required={isCreateMode}
          {...form.getInputProps("password")}
        />
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          Estado y acceso
        </Text>
        <Stack gap="md">
          <Switch
            label="Organización activa"
            description="Desactivar impedirá el acceso completo a la plataforma"
            checked={form.values.isActive ?? true}
            onChange={(e) =>
              form.setFieldValue("isActive", e.currentTarget.checked)
            }
            disabled={!isEditing}
            color="green"
          />

          <Switch
            label="Acceso bloqueado"
            description="Bloquea el acceso hasta que se active un plan de membresía"
            checked={form.values.hasAccessBlocked ?? true}
            onChange={(e) =>
              form.setFieldValue("hasAccessBlocked", e.currentTarget.checked)
            }
            disabled={!isEditing}
            color="red"
          />

          <Select
            label="Estado de membresía"
            value={form.values.membershipStatus || "none"}
            onChange={(value) =>
              form.setFieldValue(
                "membershipStatus",
                (value as SuperadminFormValues["membershipStatus"]) || "none"
              )
            }
            disabled={!isEditing}
            data={[
              { value: "active", label: "Activa" },
              { value: "trial", label: "Prueba" },
              { value: "suspended", label: "Suspendida" },
              { value: "none", label: "Sin membresía" },
            ]}
          />
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="sm">
          WhatsApp
        </Text>
        <TextInput
          label="Client ID de WhatsApp"
          placeholder="ID del cliente de WhatsApp (opcional)"
          disabled={!isEditing}
          {...form.getInputProps("clientIdWhatsapp")}
        />
      </Paper>
    </Stack>
  );
}
