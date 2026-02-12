/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Title,
  Table,
  Text,
  MultiSelect,
  ScrollArea,
  Flex,
  Loader,
  Container,
  ActionIcon,
  Badge,
  Accordion,
  Stack,
  Group,
  Tooltip,
  SegmentedControl,
  Button,
  Grid,
  Divider,
  Drawer,
  Select,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { openConfirmModal } from "@mantine/modals";
import {
  Appointment,
  getAppointmentsByOrganizationId,
  updateAppointment,
  batchConfirmAppointments,
} from "../../services/appointmentService";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatCurrency } from "../../utils/formatCurrency";
import { startOfWeek, addDays, startOfMonth, endOfMonth } from "date-fns";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import "dayjs/locale/es";
import { registerService } from "../../services/clientService";
import { useMediaQuery } from "@mantine/hooks";

import {
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconFilter,
  IconChecks,
  IconCircleCheck,
} from "@tabler/icons-react";

dayjs.extend(localeData);
dayjs.locale("es");

type Interval = "daily" | "weekly" | "biweekly" | "monthly" | "custom";

type ApptStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "cancelled_by_customer"
  | "cancelled_by_admin"
  | "attended"
  | "no_show"
  | string;

const STATUS_META: Record<
  string,
  { label: string; color: string; bg?: string; text?: string }
> = {
  confirmed: {
    label: "Confirmada",
    color: "green",
    bg: "#EAF7EE",
    text: "#145A32",
  },
  pending: {
    label: "Pendiente",
    color: "yellow",
    bg: "#FFF6DF",
    text: "#7D6608",
  },
  cancelled: {
    label: "Cancelada",
    color: "red",
    bg: "#FDECEC",
    text: "#78281F",
  },
  cancelled_by_customer: {
    label: "Cancelada (cliente)",
    color: "orange",
    bg: "#FFF0E6",
    text: "#8A4B08",
  },
  cancelled_by_admin: {
    label: "Cancelada (admin)",
    color: "grape",
    bg: "#F3E8FF",
    text: "#4A235A",
  },
  attended: {
    label: "Asistió",
    color: "teal",
    bg: "#E6FAF5",
    text: "#0B6E4F",
  },
  no_show: {
    label: "No asistió",
    color: "pink",
    bg: "#FFE6EE",
    text: "#8B1A4A",
  },
};

function StatusBadge({ status }: { status: ApptStatus }) {
  const meta = STATUS_META[status] || { label: status || "—", color: "gray" };
  return (
    <Badge variant="light" color={meta.color} size="sm">
      {meta.label}
    </Badge>
  );
}

// Desktop: resaltado MUY suave (opcional)
function getRowStylesSoft(status: ApptStatus) {
  const meta = STATUS_META[status];
  if (!meta?.bg) return {};
  return { backgroundColor: meta.bg, color: meta.text };
}

// Mobile: acento en borde, más limpio que pintar el fondo
function getCardAccentStyle(status: ApptStatus) {
  const meta = STATUS_META[status];
  if (!meta?.color) return {};
  return { borderLeft: `4px solid var(--mantine-color-${meta.color}-6)` };
}

function canConfirm(status: ApptStatus) {
  return (
    status !== "confirmed" &&
    status !== "cancelled" &&
    status !== "cancelled_by_customer" &&
    status !== "cancelled_by_admin" &&
    status !== "attended" &&
    status !== "no_show"
  );
}

function CustomPriceBadge({ isMobile }: { isMobile: boolean }) {
  return (
    <Badge size="sm" color="grape" variant="light">
      {isMobile ? "Personalizado" : "Precio personalizado"}
    </Badge>
  );
}

const DailyCashbox: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  // Intervalo y fechas
  const [interval, setInterval] = useState<Interval>("daily");
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Filtros
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filtersOpened, setFiltersOpened] = useState(false);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  const org = useSelector(selectOrganization);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const currency = org?.currency || "COP";

  const calculateDates = (intervalValue: Interval, day?: Date | null) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (intervalValue) {
      case "daily": {
        const base = day ?? now;
        start = dayjs(base).startOf("day").toDate();
        end = dayjs(base).endOf("day").toDate();
        break;
      }
      case "weekly": {
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = addDays(start, 6);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "biweekly": {
        const d = now.getDate();
        start =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), now.getMonth(), 16);
        end =
          d <= 15
            ? new Date(now.getFullYear(), now.getMonth(), 15)
            : endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "monthly": {
        start = startOfMonth(now);
        end = endOfMonth(now);
        start = dayjs(start).startOf("day").toDate();
        end = dayjs(end).endOf("day").toDate();
        break;
      }
      case "custom":
        // se maneja manualmente con datepickers
        break;
      default:
        break;
    }

    if (intervalValue !== "custom") {
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Recalcula rango al cambiar intervalo
  useEffect(() => {
    calculateDates(interval, selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  // Recalcula rango al cambiar día (solo daily)
  useEffect(() => {
    if (interval === "daily") calculateDates("daily", selectedDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Trae citas cuando hay org + rango
  useEffect(() => {
    if (organizationId && startDate && endDate) fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, startDate, endDate]);

  useEffect(() => {
    // UX: si el usuario elige "Personalizado" en mobile, abre filtros automáticamente
    if (isMobile && interval === "custom") {
      setFiltersOpened(true);

      // opcional: hint visual
      showNotification({
        title: "Rango personalizado",
        message: "Selecciona la fecha de inicio y fin en Filtros.",
        color: "blue",
        autoClose: 2500,
        position: "top-right",
      });
    }
  }, [interval, isMobile]);

  const fetchAppointments = async () => {
    if (!organizationId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const response = await getAppointmentsByOrganizationId(
        organizationId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      const sorted = response.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );

      setAppointments(sorted);
    } catch (error) {
      console.error("Error al obtener citas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointment = (
    appointmentId: string,
    clientId: string
  ) => {
    openConfirmModal({
      title: "Confirmar cita",
      children: <p>¿Estás seguro de que deseas confirmar esta cita?</p>,
      centered: true,
      labels: { confirm: "Confirmar", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        try {
          await updateAppointment(appointmentId, { status: "confirmed" });
          await registerService(clientId);
          showNotification({
            title: "Éxito",
            message: "Cita confirmada y servicio registrado exitosamente",
            color: "green",
            autoClose: 2500,
            position: "top-right",
          });
          fetchAppointments();
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudo confirmar la cita.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        }
      },
    });
  };

  const handleConfirmAllPending = () => {
    // Filtrar solo las citas pendientes que se pueden confirmar
    const pendingAppointments = filteredAppointments.filter((appt) =>
      canConfirm(appt.status || "pending")
    );

    if (pendingAppointments.length === 0) {
      showNotification({
        title: "Sin citas pendientes",
        message: "No hay citas pendientes para confirmar.",
        color: "blue",
        autoClose: 2500,
        position: "top-right",
      });
      return;
    }

    openConfirmModal({
      title: "Confirmar todas las citas pendientes",
      children: (
        <div>
          <p>
            ¿Estás seguro de que deseas confirmar{" "}
            <strong>{pendingAppointments.length}</strong> cita
            {pendingAppointments.length !== 1 ? "s" : ""} pendiente
            {pendingAppointments.length !== 1 ? "s" : ""}?
          </p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "gray" }}>
            Esta acción confirmará todas las citas visibles en la tabla y
            registrará los servicios de los clientes.
          </p>
        </div>
      ),
      centered: true,
      labels: { confirm: "Confirmar todas", cancel: "Cancelar" },
      confirmProps: { color: "green" },
      onConfirm: async () => {
        if (!organizationId) return;

        setLoading(true);
        try {
          const appointmentIds = pendingAppointments.map((appt) => appt._id);

          const result = await batchConfirmAppointments(
            appointmentIds,
            organizationId
          );

          if (result) {
            const { confirmed, failed, alreadyConfirmed } = result;

            let message = "";
            if (confirmed.length > 0) {
              message += `${confirmed.length} confirmada${confirmed.length !== 1 ? "s" : ""}. `;
            }
            if (alreadyConfirmed.length > 0) {
              message += `${alreadyConfirmed.length} ya confirmada${alreadyConfirmed.length !== 1 ? "s" : ""}. `;
            }
            if (failed.length > 0) {
              message += `${failed.length} fallida${failed.length !== 1 ? "s" : ""}. `;
            }

            showNotification({
              title: "Proceso completado",
              message: message.trim(),
              color: failed.length > 0 ? "yellow" : "green",
              autoClose: 4000,
              position: "top-right",
            });

            // Recargar las citas
            fetchAppointments();
          }
        } catch (error) {
          showNotification({
            title: "Error",
            message: "No se pudieron confirmar las citas.",
            color: "red",
            autoClose: 3000,
            position: "top-right",
          });
          console.error(error);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Opciones de servicios desde las citas
  const serviceOptions = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => set.add(a.service?.name || "Otro"));
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [appointments]);

  // Filtrado por servicio (impacta tabla/cards + totales + resumen)
  const filteredAppointments = useMemo(() => {
    if (selectedServices.length === 0) return appointments;
    return appointments.filter((a) =>
      selectedServices.includes(a.service?.name || "Otro")
    );
  }, [appointments, selectedServices]);

  // Totales + resumen por servicio calculados sobre filteredAppointments
  const { totalIncome, totalCount, avgTicket, servicesSummary } =
    useMemo(() => {
      const summary: Record<string, { count: number; total: number }> = {};
      let total = 0;

      for (const appt of filteredAppointments) {
        const basePrice = appt.service?.price || 0;
        const additionalTotal =
          appt.additionalItems?.reduce(
            (sum, item) => sum + (item?.price || 0),
            0
          ) || 0;

        const usedPrice =
          typeof appt.customPrice === "number"
            ? appt.customPrice
            : typeof appt.totalPrice === "number"
            ? appt.totalPrice
            : basePrice;

        const lineTotal = usedPrice + additionalTotal;
        total += lineTotal;

        const serviceName = appt.service?.name || "Otro";
        if (!summary[serviceName])
          summary[serviceName] = { count: 0, total: 0 };
        summary[serviceName].count += 1;
        summary[serviceName].total += lineTotal;
      }

      const count = filteredAppointments.length;

      return {
        totalIncome: total,
        totalCount: count,
        avgTicket: count > 0 ? total / count : 0,
        servicesSummary: summary,
      };
    }, [filteredAppointments]);

  const formattedRangeLabel =
    startDate && endDate
      ? interval === "daily"
        ? dayjs(startDate).format("DD/MM/YYYY")
        : `${dayjs(startDate).format("DD/MM/YYYY")} – ${dayjs(endDate).format(
            "DD/MM/YYYY"
          )}`
      : "";

  // ---- UI: filtros (contenido reutilizable desktop/mobile) ----
  const FiltersContent = (
    <Stack gap="sm">
      {interval === "daily" && (
        <>
          <Group justify="space-between" wrap="nowrap">
            <Button
              variant="light"
              leftSection={<IconChevronLeft size={16} />}
              onClick={() =>
                setSelectedDay((d) =>
                  dayjs(d ?? new Date())
                    .subtract(1, "day")
                    .toDate()
                )
              }
            >
              Anterior
            </Button>

            <Button variant="subtle" onClick={() => setSelectedDay(new Date())}>
              Hoy
            </Button>

            <Button
              variant="light"
              rightSection={<IconChevronRight size={16} />}
              onClick={() =>
                setSelectedDay((d) =>
                  dayjs(d ?? new Date())
                    .add(1, "day")
                    .toDate()
                )
              }
            >
              Siguiente
            </Button>
          </Group>

          <DatePickerInput
            label="Día"
            locale="es"
            value={selectedDay}
            onChange={setSelectedDay}
            clearable={false}
          />
        </>
      )}

      {interval === "custom" && (
        <Group grow align="flex-start">
          <DatePickerInput
            label="Inicio"
            locale="es"
            value={startDate}
            onChange={(d) =>
              setStartDate(d ? dayjs(d).startOf("day").toDate() : null)
            }
          />
          <DatePickerInput
            label="Fin"
            locale="es"
            value={endDate}
            onChange={(d) =>
              setEndDate(d ? dayjs(d).endOf("day").toDate() : null)
            }
          />
        </Group>
      )}

      <MultiSelect
        label="Servicios"
        placeholder="Todos"
        data={serviceOptions}
        value={selectedServices}
        onChange={setSelectedServices}
        clearable
        searchable
      />
    </Stack>
  );

  const intervalOptions = [
    { value: "daily", label: "Diario" },
    { value: "weekly", label: "Semanal" },
    { value: "biweekly", label: "Quincenal" },
    { value: "monthly", label: "Mensual" },
    { value: "custom", label: "Personalizado" },
  ] as const;

  const IntervalPicker = (
    <div>
      {isMobile ? (
        <Select
          label="Intervalo"
          placeholder="Selecciona intervalo"
          data={intervalOptions as any}
          value={interval}
          onChange={(v) => {
            const next = (v || "daily") as Interval;
            setInterval(next);
            if (next === "daily" && !selectedDay) setSelectedDay(new Date());
          }}
          searchable={false}
          clearable={false}
        />
      ) : (
        <SegmentedControl
          fullWidth
          value={interval}
          onChange={(v) => {
            const next = v as Interval;
            setInterval(next);
            if (next === "daily" && !selectedDay) setSelectedDay(new Date());
          }}
          data={[
            { value: "daily", label: "Diario" },
            { value: "weekly", label: "Semanal" },
            { value: "biweekly", label: "Quincenal" },
            { value: "monthly", label: "Mensual" },
            { value: "custom", label: "Personalizado" },
          ]}
        />
      )}
    </div>
  );

  const Toolbar = (
    <Card shadow="sm" radius="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <IconCalendar size={18} />
            <Text fw={900} lineClamp={1}>
              Caja
            </Text>
            <Badge variant="light">{formattedRangeLabel || "—"}</Badge>
          </Group>

          {isMobile && (
            <Button
              leftSection={<IconFilter size={16} />}
              variant="light"
              onClick={() => setFiltersOpened(true)}
            >
              Filtros
            </Button>
          )}
        </Group>

        <Grid gutter="sm" align="center">
          <Grid.Col span={{ base: 12, md: 6 }}>{IntervalPicker}</Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Group
              justify={isMobile ? "space-between" : "flex-end"}
              gap="md"
              wrap="wrap"
            >
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <Text size="xs" c="dimmed">
                  Ingresos
                </Text>
                <Text fw={900}>{formatCurrency(totalIncome, currency)}</Text>
              </div>
              <Divider orientation="vertical" />
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <Text size="xs" c="dimmed">
                  Citas
                </Text>
                <Text fw={900}>{totalCount}</Text>
              </div>
              <Divider orientation="vertical" />
              <div style={{ textAlign: isMobile ? "left" : "right" }}>
                <Text size="xs" c="dimmed">
                  Ticket prom.
                </Text>
                <Text fw={900}>{formatCurrency(avgTicket, currency)}</Text>
              </div>
            </Group>
          </Grid.Col>

          {/* Desktop: filtros inline */}
          {!isMobile && (
            <>
              {interval === "daily" && (
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      onClick={() =>
                        setSelectedDay((d) =>
                          dayjs(d ?? new Date())
                            .subtract(1, "day")
                            .toDate()
                        )
                      }
                      aria-label="Día anterior"
                    >
                      <IconChevronLeft size={16} />
                    </ActionIcon>

                    <DatePickerInput
                      locale="es"
                      value={selectedDay}
                      onChange={setSelectedDay}
                      clearable={false}
                      w="60%"
                    />

                    <ActionIcon
                      variant="light"
                      onClick={() =>
                        setSelectedDay((d) =>
                          dayjs(d ?? new Date())
                            .add(1, "day")
                            .toDate()
                        )
                      }
                      aria-label="Día siguiente"
                    >
                      <IconChevronRight size={16} />
                    </ActionIcon>

                    <Button
                      variant="subtle"
                      onClick={() => setSelectedDay(new Date())}
                    >
                      Hoy
                    </Button>
                  </Group>
                </Grid.Col>
              )}

              {interval === "custom" && (
                <>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <DatePickerInput
                      label="Inicio"
                      locale="es"
                      value={startDate}
                      onChange={(d) =>
                        setStartDate(
                          d ? dayjs(d).startOf("day").toDate() : null
                        )
                      }
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <DatePickerInput
                      label="Fin"
                      locale="es"
                      value={endDate}
                      onChange={(d) =>
                        setEndDate(d ? dayjs(d).endOf("day").toDate() : null)
                      }
                    />
                  </Grid.Col>
                </>
              )}

              <Grid.Col span={{ base: 12, md: 4 }}>
                <MultiSelect
                  label="Servicios"
                  placeholder="Todos"
                  data={serviceOptions}
                  value={selectedServices}
                  onChange={setSelectedServices}
                  clearable
                  searchable
                />
              </Grid.Col>
            </>
          )}
        </Grid>
      </Stack>

      {/* Mobile: Drawer de filtros */}
      <Drawer
        opened={filtersOpened}
        onClose={() => setFiltersOpened(false)}
        position="bottom"
        size="lg"
        radius="md"
        title={
          <Group gap="xs">
            <IconAdjustments size={18} />
            <Text fw={900}>Filtros</Text>
          </Group>
        }
      >
        <Stack>
          {FiltersContent}
          <Button onClick={() => setFiltersOpened(false)}>Aplicar</Button>
        </Stack>
      </Drawer>
    </Card>
  );

  // ---- UI: Mobile cards ----
  const MobileCards = (
    <Stack gap="sm">
      {filteredAppointments.length === 0 ? (
        <Card withBorder radius="md" p="md">
          <Text ta="center" c="dimmed">
            No hay citas para este filtro/intervalo.
          </Text>
        </Card>
      ) : (
        filteredAppointments.map((appointment) => {
          const status = (appointment.status || "pending") as ApptStatus;

          const basePrice = appointment.service?.price || 0;
          const additionalTotal =
            appointment.additionalItems?.reduce(
              (sum, item) => sum + (item?.price || 0),
              0
            ) || 0;

          const usedPrice =
            typeof appointment.customPrice === "number"
              ? appointment.customPrice
              : typeof appointment.totalPrice === "number"
              ? appointment.totalPrice
              : basePrice;

          const total = usedPrice + additionalTotal;

          const isCustom =
            typeof appointment.customPrice === "number" &&
            appointment.customPrice !== basePrice;

          return (
            <Card
              key={appointment._id}
              withBorder
              radius="md"
              p="sm"
              style={getCardAccentStyle(status)}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Text fw={900} lineClamp={1}>
                      {appointment.client?.name || "—"}
                    </Text>
                    <StatusBadge status={status} />
                  </Group>

                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {appointment.service?.name || "—"} •{" "}
                    {dayjs(appointment.startDate).format("DD/MM/YYYY")}
                  </Text>

                  {/* Precio en una línea */}
                  <Group gap="xs" mt={6} align="center">
                    <Badge variant="light" size="md">
                      {formatCurrency(total, currency)}
                    </Badge>
                  </Group>

                  {/* ✅ Personalizado SIEMPRE visible en su propia línea */}
                  {isCustom && (
                    <Group mt={6} gap="xs">
                      <Tooltip
                        label={
                          <div>
                            <div>
                              Precio base: {formatCurrency(basePrice, currency)}
                            </div>
                            <div>
                              Precio personalizado:{" "}
                              {formatCurrency(
                                appointment.customPrice!,
                                currency
                              )}
                            </div>
                            {additionalTotal > 0 && (
                              <div>
                                Adicionales:{" "}
                                {formatCurrency(additionalTotal, currency)}
                              </div>
                            )}
                            <div style={{ marginTop: 6, fontWeight: 900 }}>
                              Total: {formatCurrency(total, currency)}
                            </div>
                          </div>
                        }
                        withArrow
                      >
                        <div>
                          <CustomPriceBadge isMobile={true} />
                        </div>
                      </Tooltip>

                      {additionalTotal > 0 && (
                        <Badge variant="light" color="blue" size="sm">
                          + Adicionales
                        </Badge>
                      )}
                    </Group>
                  )}
                </div>

                {canConfirm(status) && (
                  <ActionIcon
                    color="green"
                    variant="filled"
                    onClick={() =>
                      handleConfirmAppointment(
                        appointment._id,
                        appointment.client?._id || ""
                      )
                    }
                    aria-label="Confirmar"
                    size="lg"
                  >
                    <IconCircleCheck size={20} stroke={2} />
                  </ActionIcon>
                )}
              </Group>
            </Card>
          );
        })
      )}
    </Stack>
  );

  // ---- UI: Desktop table ----
  const DesktopTable = (
    <ScrollArea scrollbarSize={10}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Fecha</Table.Th>
            <Table.Th>Cliente</Table.Th>
            <Table.Th>Servicio</Table.Th>
            <Table.Th>Precio</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th style={{ width: 90, textAlign: "center" }}>
              Acción
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {filteredAppointments.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center" c="dimmed">
                  No hay citas registradas
                </Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            filteredAppointments.map((appointment) => {
              const status = (appointment.status || "pending") as ApptStatus;

              const basePrice = appointment.service?.price || 0;
              const additionalTotal =
                appointment.additionalItems?.reduce(
                  (sum, item) => sum + (item?.price || 0),
                  0
                ) || 0;

              const usedPrice =
                typeof appointment.customPrice === "number"
                  ? appointment.customPrice
                  : typeof appointment.totalPrice === "number"
                  ? appointment.totalPrice
                  : basePrice;

              const total = usedPrice + additionalTotal;

              const isCustom =
                typeof appointment.customPrice === "number" &&
                appointment.customPrice !== basePrice;

              return (
                <Table.Tr
                  key={appointment._id}
                  style={getRowStylesSoft(status)}
                >
                  <Table.Td>
                    {dayjs(appointment.startDate).format("DD/MM/YYYY")}
                  </Table.Td>

                  <Table.Td>{appointment.client?.name || "—"}</Table.Td>

                  <Table.Td>{appointment.service?.name || "—"}</Table.Td>

                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text>{formatCurrency(total, currency)}</Text>

                      {isCustom && (
                        <Tooltip
                          label={
                            <div>
                              <div>
                                Precio base:{" "}
                                {formatCurrency(basePrice, currency)}
                              </div>
                              <div>
                                Precio personalizado:{" "}
                                {formatCurrency(
                                  appointment.customPrice!,
                                  currency
                                )}
                              </div>
                              {additionalTotal > 0 && (
                                <div>
                                  Adicionales:{" "}
                                  {formatCurrency(additionalTotal, currency)}
                                </div>
                              )}
                              <div style={{ marginTop: 6, fontWeight: 900 }}>
                                Total: {formatCurrency(total, currency)}
                              </div>
                            </div>
                          }
                          withArrow
                        >
                          <div>
                            <CustomPriceBadge isMobile={false} />
                          </div>
                        </Tooltip>
                      )}

                      {additionalTotal > 0 && (
                        <Badge variant="light" color="blue" size="sm">
                          + Adicionales
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <StatusBadge status={status} />
                  </Table.Td>

                  <Table.Td style={{ textAlign: "center" }}>
                    {canConfirm(status) && (
                      <ActionIcon
                        color="green"
                        variant="light"
                        onClick={() =>
                          handleConfirmAppointment(
                            appointment._id,
                            appointment.client?._id || ""
                          )
                        }
                        aria-label="Confirmar"
                        size="lg"
                      >
                        <IconCircleCheck size={20} stroke={2} />
                      </ActionIcon>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  return (
    <Container fluid>
      <Group justify="space-between" mb="md">
        <Title order={2}>Caja</Title>
        {loading && <Badge variant="light">Cargando…</Badge>}
      </Group>

      {Toolbar}

      <Card shadow="sm" mt="md" withBorder>
        <Accordion variant="separated">
          <Accordion.Item value="resumen">
            <Accordion.Control>
              <Title order={4}>Resumen por servicio</Title>
            </Accordion.Control>
            <Accordion.Panel>
              {Object.entries(servicesSummary).length > 0 ? (
                <Stack gap="xs">
                  {Object.entries(servicesSummary).map(
                    ([serviceName, data]) => (
                      <Group
                        key={serviceName}
                        justify="space-between"
                        wrap="nowrap"
                      >
                        <Text lineClamp={1}>{serviceName}</Text>
                        <Text fw={800}>
                          {data.count} • {formatCurrency(data.total, currency)}
                        </Text>
                      </Group>
                    )
                  )}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center">
                  No hay servicios en este intervalo.
                </Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Card>

      <Card shadow="lg" radius="md" withBorder my="md">
        <Group justify="space-between" mb="sm" wrap="wrap">
          <Title order={3}>Citas</Title>
          <Group gap="md" wrap="wrap">
            {filteredAppointments.filter((appt) =>
              canConfirm(appt.status || "pending")
            ).length > 0 && (
              <Button
                leftSection={<IconChecks size={16} />}
                color="green"
                variant="light"
                onClick={handleConfirmAllPending}
                disabled={loading}
              >
                Confirmar todas pendientes
              </Button>
            )}
            <Text size="sm" c="dimmed">
              {selectedServices.length > 0
                ? `Filtrado: ${selectedServices.length} servicio(s)`
                : "Sin filtros"}
            </Text>
          </Group>
        </Group>

        {loading ? (
          <Flex justify="center" align="center" direction="column" py="xl">
            <Loader size={40} />
            <Text mt="md">Cargando citas...</Text>
          </Flex>
        ) : isMobile ? (
          MobileCards
        ) : (
          DesktopTable
        )}
      </Card>
    </Container>
  );
};

export default DailyCashbox;
