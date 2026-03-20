import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconSearch, IconShieldCheck } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { showNotification } from "@mantine/notifications";
import {
  AuditLog,
  AuditLogAction,
  AuditLogEntityType,
  getAuditLogs,
} from "../../../services/auditLogService";
import { selectOrganization } from "../../../features/organization/sliceOrganization";

dayjs.extend(utc);
dayjs.extend(timezone);

const ACTION_LABELS: Record<AuditLogAction, string> = {
  delete_appointment: "Cita eliminada",
  delete_client: "Cliente eliminado",
  force_delete_client: "Cliente eliminado (forzado)",
  delete_employee: "Profesional eliminado",
  delete_reservation: "Reserva eliminada",
  delete_reservation_with_appointment: "Reserva + cita eliminadas",
};

const ENTITY_COLORS: Record<AuditLogEntityType, string> = {
  appointment: "red",
  client: "orange",
  employee: "grape",
  reservation: "blue",
};

const ENTITY_LABELS: Record<AuditLogEntityType, string> = {
  appointment: "Cita",
  client: "Cliente",
  employee: "Profesional",
  reservation: "Reserva",
};

const formatSnapshot = (log: AuditLog): string => {
  const s = log.entitySnapshot || {};
  if (log.entityType === "appointment") {
    const parts = [s.clientName, s.serviceName, s.employeeName].filter(Boolean);
    return parts.join(" · ") || "—";
  }
  if (log.entityType === "client") {
    return [s.name, s.phoneNumber].filter(Boolean).join(" · ") || "—";
  }
  if (log.entityType === "employee") {
    return [s.names, s.email].filter(Boolean).join(" · ") || "—";
  }
  if (log.entityType === "reservation") {
    return [s.customerName, s.customerPhone].filter(Boolean).join(" · ") || "—";
  }
  return "—";
};

const LIMIT = 25;

const AuditLogPage: React.FC = () => {
  const org = useSelector(selectOrganization);
  const tz = org?.timezone || "America/Bogota";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [entityType, setEntityType] = useState<AuditLogEntityType | "">("");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const result = await getAuditLogs({
        entityType: entityType || undefined,
        startDate: startDate ? dayjs(startDate).format("YYYY-MM-DD") : undefined,
        endDate: endDate ? dayjs(endDate).format("YYYY-MM-DD") : undefined,
        page,
        limit: LIMIT,
      });
      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      showNotification({ color: "red", message: "Error al cargar el historial" });
    } finally {
      setLoading(false);
    }
  }, [entityType, dateRange, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [entityType, dateRange]);

  const rows = logs.map((log) => (
    <Table.Tr key={log._id}>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {dayjs.utc(log.createdAt).tz(tz).format("DD/MM/YYYY HH:mm")}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={ENTITY_COLORS[log.entityType]} variant="light" size="sm">
          {ENTITY_LABELS[log.entityType]}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{ACTION_LABELS[log.action] || log.action}</Text>
      </Table.Td>
      <Table.Td>
        <Tooltip label={formatSnapshot(log)} multiline maw={320}>
          <Text size="sm" truncate maw={260}>
            {formatSnapshot(log)}
          </Text>
        </Tooltip>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{log.performedByName || "—"}</Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconShieldCheck size={22} />
          <Title order={4}>Historial de eliminaciones</Title>
        </Group>
        <Text size="sm" c="dimmed">
          {total} registro{total !== 1 ? "s" : ""}
        </Text>
      </Group>

      {/* Filtros */}
      <Card withBorder p="sm" radius="md">
        <Group gap="sm" wrap="wrap">
          <Select
            placeholder="Tipo de entidad"
            clearable
            value={entityType}
            onChange={(v) => setEntityType((v as AuditLogEntityType) || "")}
            data={[
              { value: "appointment", label: "Citas" },
              { value: "client", label: "Clientes" },
              { value: "employee", label: "Profesionales" },
              { value: "reservation", label: "Reservas" },
            ]}
            leftSection={<IconSearch size={14} />}
            w={180}
          />
          <DatePickerInput
            type="range"
            placeholder="Rango de fechas"
            value={dateRange}
            onChange={setDateRange}
            clearable
            valueFormat="DD/MM/YYYY"
            w={240}
          />
        </Group>
      </Card>

      {/* Tabla */}
      <Card withBorder p={0} radius="md">
        {loading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : logs.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed" size="sm">
              No hay registros para los filtros seleccionados
            </Text>
          </Center>
        ) : (
          <Box style={{ overflowX: "auto" }}>
            <Table highlightOnHover verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha y hora</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Acción</Table.Th>
                  <Table.Th>Detalle</Table.Th>
                  <Table.Th>Realizado por</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </Box>
        )}
      </Card>

      {totalPages > 1 && (
        <Center>
          <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
        </Center>
      )}
    </Stack>
  );
};

export default AuditLogPage;
