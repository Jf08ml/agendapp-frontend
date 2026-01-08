/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Container, Title, Stack, Paper, Text, Table, Group, Badge, Select, Button } from "@mantine/core";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { getPaymentHistory, PaymentSession } from "../../services/paymentsService";

export default function PaymentHistory() {
  const organization = useSelector((state: RootState) => state.organization.organization);
  const [sessions, setSessions] = useState<PaymentSession[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const params: any = { limit: 100 };
      if (organization?._id) params.organizationId = organization._id;
      const data = await getPaymentHistory(params);
      setSessions(data || []);
    })();
  }, [organization?._id]);

  const getStatusColor = (status: string) => {
    if (status === "succeeded") return "green";
    if (status === "failed") return "red";
    if (status === "created") return "blue";
    return "gray";
  };

  const getStatusLabel = (status: string) => {
    if (status === "succeeded") return "✓ Pago exitoso";
    if (status === "failed") return "✗ Pago fallido";
    if (status === "created") return "Pendiente";
    return status;
  };

  const getPlanName = (session: PaymentSession) => {
    if (typeof session.planId === 'object' && session.planId?.displayName) {
      return session.planId.displayName;
    }
    return "-";
  };

  const filtered = filterStatus ? sessions.filter(s => s.status === filterStatus) : sessions;

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Historial de Pagos</Title>
            <Text c="dimmed" size="sm">Sesiones de pago registradas</Text>
          </div>
          <Group>
            <Button variant="light" component={Link} to="/my-membership">
              Volver a Mi Membresía
            </Button>
            <Select
              placeholder="Filtrar por estado"
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: "succeeded", label: "Exitoso" },
                { value: "failed", label: "Fallido" },
                { value: "created", label: "Pendiente" },
              ]}
              clearable
            />
          </Group>
        </Group>

        <Paper withBorder p="lg" radius="md">
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Monto</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Procesado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(session => (
                <Table.Tr key={session._id}>
                  <Table.Td>{new Date(session.createdAt).toLocaleString("es-CO")}</Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{getPlanName(session)}</Text>
                  </Table.Td>
                  <Table.Td>{session.amount ? `$${session.amount}` : "-"}</Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(session.status)} variant="light">
                      {getStatusLabel(session.status)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={session.processed ? "green" : "gray"}>
                      {session.processed ? "✓ Sí" : "No"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}><Text c="dimmed">Sin pagos registrados</Text></Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Container>
  );
}
