import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Table,
  Badge,
  Group,
  Button,
  Text,
  Stack,
  ActionIcon,
  Tooltip,
  Modal,
  Textarea,
  Select,
  Paper,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconRefresh, IconCheck, IconEdit } from "@tabler/icons-react";
import SuperadminNav from "./SuperadminNav";
import {
  adminGetFeatureRequests,
  adminUpdateFeatureRequest,
  type FeatureRequestAdmin,
  type FeatureRequestStatus,
} from "../../services/featureRequestService";

const STATUS_OPTIONS: { value: FeatureRequestStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "under_review", label: "En revisión" },
  { value: "planned", label: "Planeada" },
  { value: "done", label: "Implementada" },
  { value: "declined", label: "No planeada" },
];

const STATUS_COLOR: Record<FeatureRequestStatus, string> = {
  pending: "gray",
  under_review: "blue",
  planned: "violet",
  done: "teal",
  declined: "red",
};

export default function SuperadminFeatureRequests() {
  const [requests, setRequests] = useState<FeatureRequestAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FeatureRequestStatus | null>(null);

  const [editing, setEditing] = useState<FeatureRequestAdmin | null>(null);
  const [formStatus, setFormStatus] = useState<FeatureRequestStatus>("pending");
  const [formReply, setFormReply] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      setRequests(await adminGetFeatureRequests(filterStatus ?? undefined));
    } catch {
      notifications.show({ title: "Error", message: "No se pudieron cargar las solicitudes", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (r: FeatureRequestAdmin) => {
    setEditing(r);
    setFormStatus(r.status);
    setFormReply(r.adminReply ?? "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminUpdateFeatureRequest(editing._id, { status: formStatus, adminReply: formReply.trim() });
      notifications.show({ title: "Éxito", message: "Solicitud actualizada", color: "green" });
      setEditing(null);
      fetchAll();
    } catch {
      notifications.show({ title: "Error", message: "No se pudo guardar", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  const rows = requests.map((r) => (
    <Table.Tr key={r._id}>
      <Table.Td>
        <Text fw={600} size="sm">{r.organizationId?.name ?? "—"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={2} style={{ maxWidth: 320 }}>{r.text}</Text>
      </Table.Td>
      <Table.Td>
        <Stack gap={2}>
          <Text size="sm">{r.submittedByName ?? "—"}</Text>
          {r.submittedByRole && (
            <Text size="xs" c="dimmed">{r.submittedByRole === "admin" ? "Dueño/a" : "Empleado/a"}</Text>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">
          {new Date(r.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Badge color={STATUS_COLOR[r.status]} variant="light" size="sm">
            {STATUS_OPTIONS.find((s) => s.value === r.status)?.label ?? r.status}
          </Badge>
          {r.closedByOrg && (
            <Tooltip label="La organización la retiró de su lista activa">
              <Badge color="gray" variant="outline" size="sm">
                Retirada
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Tooltip label="Revisar / actualizar">
          <ActionIcon variant="light" color="blue" onClick={() => openEdit(r)}>
            <IconEdit size={16} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <SuperadminNav />

        <Group justify="space-between">
          <div>
            <Title order={2}>Solicitudes de mejora</Title>
            <Text c="dimmed" size="sm">
              Pedidos enviados por administradores/empleados de organizaciones — cada una ve solo las suyas
            </Text>
          </div>
          <Group gap="xs">
            <Select
              placeholder="Filtrar por estado"
              data={STATUS_OPTIONS}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as FeatureRequestStatus | null)}
              clearable
              w={200}
            />
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchAll}>
              Actualizar
            </Button>
          </Group>
        </Group>

        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
            <Text c="dimmed">Cargando solicitudes...</Text>
          </Stack>
        ) : (
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Organización</Table.Th>
                  <Table.Th>Solicitud</Table.Th>
                  <Table.Th>Solicitante</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? rows : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="lg">
                        No hay solicitudes{filterStatus ? " con ese estado" : ""}.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      <Modal
        opened={!!editing}
        onClose={() => setEditing(null)}
        title={<Text fw={700} size="lg">{editing?.organizationId?.name}</Text>}
        size="lg"
        centered
      >
        {editing && (
          <Stack gap="md">
            <Paper withBorder p="sm" radius="sm" bg="gray.0">
              <Text size="sm">{editing.text}</Text>
              <Text size="xs" c="dimmed" mt={4}>
                {editing.submittedByName} ·{" "}
                {new Date(editing.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
              </Text>
            </Paper>

            <Select
              label="Estado"
              data={STATUS_OPTIONS}
              value={formStatus}
              onChange={(v) => setFormStatus((v as FeatureRequestStatus) ?? "pending")}
            />

            <Textarea
              label="Respuesta (visible para la organización)"
              placeholder="Ej: ¡Buena idea! La vamos a agregar en la próxima versión."
              value={formReply}
              onChange={(e) => setFormReply(e.currentTarget.value)}
              minRows={3}
              autosize
              maxRows={8}
            />

            <Group justify="flex-end">
              <Button variant="light" color="gray" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button leftSection={<IconCheck size={16} />} loading={saving} onClick={handleSave}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
