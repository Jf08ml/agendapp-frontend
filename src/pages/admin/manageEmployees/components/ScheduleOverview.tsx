/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Vista de resumen de horarios - muestra horario de organización y empleados
 * con visualización de bloques de tiempo tipo timeline
 */
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Text,
  Stack,
  Paper,
  Loader,
  Alert,
  Group,
  Title,
  Tooltip,
  ScrollArea,
  Badge,
} from "@mantine/core";
import { IoInformationCircleOutline } from "react-icons/io5";
import { showNotification } from "@mantine/notifications";
import { Employee } from "../../../../services/employeeService";
import { getEmployeeSchedule } from "../../../../services/scheduleService";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";

const DAY_LABELS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Lunes", short: "Lun" },
  { value: 2, label: "Martes", short: "Mar" },
  { value: 3, label: "Miércoles", short: "Mié" },
  { value: 4, label: "Jueves", short: "Jue" },
  { value: 5, label: "Viernes", short: "Vie" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

interface DaySchedule {
  day: number;
  isAvailable?: boolean;
  isOpen?: boolean;
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
}

interface WeeklySchedule {
  enabled: boolean;
  schedule: DaySchedule[];
}

interface OpeningHours {
  businessDays: number[];
  start: string;
  end: string;
  breaks: { start: string; end: string }[];
  stepMinutes: number;
}

interface OrgScheduleData {
  weeklySchedule?: WeeklySchedule;
  openingHours?: OpeningHours;
}

interface ScheduleOverviewProps {
  organizationId: string;
  employees: Employee[];
}

// Convierte horario en minutos desde medianoche
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Convierte minutos a formato HH:mm
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Normaliza el horario de la organización según el formato que use
function getOrgDaySchedule(
  orgData: OrgScheduleData,
  dayOfWeek: number
): DaySchedule | null {
  
  // Si usa weeklySchedule
  if (orgData.weeklySchedule?.enabled && orgData.weeklySchedule.schedule) {
    const daySchedule = orgData.weeklySchedule.schedule.find(
      (d) => d.day === dayOfWeek
    );
    
    if (daySchedule && (daySchedule.isOpen || daySchedule.isAvailable)) {
      return {
        day: dayOfWeek,
        isAvailable: true,
        start: daySchedule.start,
        end: daySchedule.end,
        breaks: daySchedule.breaks || [],
      };
    }
    return null;
  }

  // Si usa openingHours (formato legacy)
  if (orgData.openingHours) {
    const isOpen = orgData.openingHours.businessDays?.includes(dayOfWeek);
    
    if (isOpen) {
      return {
        day: dayOfWeek,
        isAvailable: true,
        start: orgData.openingHours.start,
        end: orgData.openingHours.end,
        breaks: orgData.openingHours.breaks || [],
      };
    }
  }

  return null;
}

// Calcula la intersección de dos rangos horarios
function calculateIntersection(
  orgStart: string,
  orgEnd: string,
  empStart: string,
  empEnd: string
): { start: string; end: string; valid: boolean } {
  const orgStartMin = timeToMinutes(orgStart);
  const orgEndMin = timeToMinutes(orgEnd);
  const empStartMin = timeToMinutes(empStart);
  const empEndMin = timeToMinutes(empEnd);

  const effectiveStart = Math.max(orgStartMin, empStartMin);
  const effectiveEnd = Math.min(orgEndMin, empEndMin);

  return {
    start: minutesToTime(effectiveStart),
    end: minutesToTime(effectiveEnd),
    valid: effectiveStart < effectiveEnd,
  };
}

export default function ScheduleOverview({
  organizationId,
  employees,
}: ScheduleOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [employeeSchedules, setEmployeeSchedules] = useState<
    Map<string, WeeklySchedule>
  >(new Map());

  // Obtener organización del Redux store (slice de organization, no auth)
  const organization = useSelector((state: RootState) => state.organization.organization);
  
  const orgData: OrgScheduleData | null = useMemo(() => {
    if (!organization) return null;

    // Normalize breaks to remove 'note' and ensure always array
    const normalizeBreaks = (breaks?: { start: string; end: string; note?: string }[]) =>
      (breaks ?? []).map(({ start, end }) => ({ start, end }));

    let weeklySchedule: WeeklySchedule | undefined = undefined;
    if (organization.weeklySchedule) {
      weeklySchedule = {
        enabled: organization.weeklySchedule.enabled,
        schedule: (organization.weeklySchedule.schedule ?? []).map((d: any) => ({
          day: d.day,
          isAvailable: d.isAvailable,
          isOpen: d.isOpen,
          start: d.start,
          end: d.end,
          breaks: normalizeBreaks(d.breaks),
        })),
      };
    }

    let openingHours: OpeningHours | undefined = undefined;
    if (organization.openingHours) {
      openingHours = {
        businessDays: organization.openingHours.businessDays ?? [],
        start: organization.openingHours.start ?? "00:00",
        end: organization.openingHours.end ?? "23:59",
        breaks: normalizeBreaks(organization.openingHours.breaks),
        stepMinutes: organization.openingHours.stepMinutes ?? 30,
      };
    }

    return {
      weeklySchedule,
      openingHours,
    };
  }, [organization]);

  useEffect(() => {
    loadSchedules();
  }, [organizationId, employees]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      // Cargar horarios de empleados
      const schedules = new Map<string, WeeklySchedule>();
      for (const emp of employees) {
        const empData = await getEmployeeSchedule(emp._id);
        if (empData) {
          schedules.set(emp._id, empData);
        }
      }
      setEmployeeSchedules(schedules);
    } catch (error) {
      console.error("Error cargando horarios:", error);
      showNotification({
        title: "Error",
        message: "No se pudieron cargar los horarios",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Group justify="center" p="xl">
          <Loader size="sm" />
          <Text>Cargando horarios...</Text>
        </Group>
      </Paper>
    );
  }

  if (!orgData) {
    return (
      <Alert
        icon={<IoInformationCircleOutline size={20} />}
        title="Sin configuración"
        color="blue"
      >
        No se ha configurado el horario de la organización
      </Alert>
    );
  }

  // Determinar rango visual (6:00 AM - 10:00 PM)
  const visualStart = 6 * 60; // 6:00 AM
  const visualEnd = 22 * 60; // 10:00 PM
  const visualRange = visualEnd - visualStart;

  // Renderizar bloque de tiempo visual
  const renderTimeBlock = (
    start: string,
    end: string,
    color: string,
    label?: string,
    breaks?: { start: string; end: string }[]
  ) => {
    if (!start || !end) {
      console.error("renderTimeBlock: start or end is undefined", { start, end });
      return null;
    }
    
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);

    // Calcular posición y ancho en el timeline
    const leftPercent = ((startMin - visualStart) / visualRange) * 100;
    const widthPercent = ((endMin - startMin) / visualRange) * 100;

    return (
      <Box pos="relative" w="100%" h={40}>
        {/* Bloque principal */}
        <Tooltip
          label={`${start} - ${end}${label ? ` (${label})` : ""}`}
          position="top"
        >
          <Box
            pos="absolute"
            left={`${leftPercent}%`}
            w={`${widthPercent}%`}
            h="100%"
            bg={color}
            style={{
              borderRadius: 4,
              border: "1px solid rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text size="xs" fw={500} c="white">
              {start}-{end}
            </Text>
          </Box>
        </Tooltip>

        {/* Breaks */}
        {breaks &&
          breaks.map((brk, idx) => {
            const brkStartMin = timeToMinutes(brk.start);
            const brkEndMin = timeToMinutes(brk.end);
            const brkLeft = ((brkStartMin - visualStart) / visualRange) * 100;
            const brkWidth = ((brkEndMin - brkStartMin) / visualRange) * 100;

            return (
              <Box
                key={idx}
                pos="absolute"
                left={`${brkLeft}%`}
                w={`${brkWidth}%`}
                h="100%"
                bg="repeating-linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.3) 5px, transparent 5px, transparent 10px)"
                style={{
                  borderRadius: 4,
                  border: "2px dashed rgba(255,255,255,0.6)",
                  pointerEvents: "all",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 2px",
                }}
              >
                {/* Hora de inicio en el borde izquierdo */}
                <Text size="10px" fw={600} c="white" style={{ 
                  textShadow: "0 0 3px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap" 
                }}>
                  {brk.start}
                </Text>
                
                {/* Hora de fin en el borde derecho */}
                <Text size="10px" fw={600} c="white" style={{ 
                  textShadow: "0 0 3px rgba(0,0,0,0.8)",
                  whiteSpace: "nowrap" 
                }}>
                  {brk.end}
                </Text>
              </Box>
            );
          })}
      </Box>
    );
  };

  return (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Title order={4} mb="xs">
          Vista de Horarios - Visualización Timeline
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Horarios efectivos = Intersección entre organización y empleado.
          Breaks mostrados con patrón rayado.
        </Text>

        <ScrollArea>
          <Stack gap="sm">
            {DAY_LABELS.map((day) => {
              const orgDay = getOrgDaySchedule(orgData, day.value);

              return (
                <Paper key={day.value} p="md" withBorder bg="gray.0">
                  <Stack gap="xs">
                    <Group justify="space-between" mb="xs">
                      <Text fw={600} size="sm">
                        {day.label}
                      </Text>
                      <Badge
                        size="sm"
                        color={
                          orgData.weeklySchedule?.enabled ? "blue" : "gray"
                        }
                        variant="light"
                      >
                        {orgData.weeklySchedule?.enabled
                          ? "Horario semanal"
                          : "Horario general"}
                      </Badge>
                    </Group>

                    {/* Organización */}
                    <Group gap="xs" align="flex-start">
                      <Text size="sm" w={120} fw={500} pt={8}>
                        Organización:
                      </Text>
                      <Box style={{ flex: 1 }}>
                        {orgDay ? (
                          renderTimeBlock(
                            orgDay.start,
                            orgDay.end,
                            "var(--mantine-color-blue-6)",
                            "Org",
                            orgDay.breaks
                          )
                        ) : (
                          <Badge color="gray" variant="light">
                            Cerrado
                          </Badge>
                        )}
                      </Box>
                    </Group>

                    {/* Empleados */}
                    {employees.map((emp) => {
                      const empSchedule = employeeSchedules.get(emp._id);
                      const empDay = empSchedule?.schedule?.find(
                        (d) => d.day === day.value
                      );

                      const displayName = emp.names || emp.email || "Sin nombre";

                      return (
                        <Group key={emp._id} gap="xs" align="flex-start" wrap="nowrap">
                          <Box w={120} style={{ flexShrink: 0 }}>
                            <Text
                              size="sm"
                              fw={empSchedule?.enabled ? 600 : 400}
                              c={empSchedule?.enabled ? "blue.7" : "dimmed"}
                              pt={8}
                              lineClamp={1}
                            >
                              {displayName}
                              {empSchedule?.enabled && " ⚙️"}
                            </Text>
                          </Box>

                          <Box style={{ flex: 1 }}>
                            {!empSchedule || !empSchedule.enabled ? (
                              orgDay ? (
                                renderTimeBlock(
                                  orgDay.start,
                                  orgDay.end,
                                  "var(--mantine-color-gray-5)",
                                  "Usa org",
                                  orgDay.breaks
                                )
                              ) : (
                                <Badge color="gray" variant="light" size="sm">
                                  Cerrado
                                </Badge>
                              )
                            ) : !empDay || !empDay.isAvailable ? (
                              <Badge color="red" variant="light" size="sm">
                                No disponible
                              </Badge>
                            ) : orgDay ? (
                              (() => {
                                const intersection = calculateIntersection(
                                  orgDay.start,
                                  orgDay.end,
                                  empDay.start,
                                  empDay.end
                                );

                                if (!intersection.valid) {
                                return (
                                  <Badge color="orange" variant="light">
                                    Sin intersección
                                  </Badge>
                                );
                              }

                              // Combinar breaks
                              const allBreaks = [
                                ...(orgDay.breaks || []),
                                ...(empDay.breaks || []),
                              ];

                              return renderTimeBlock(
                                intersection.start,
                                intersection.end,
                                "var(--mantine-color-green-6)",
                                "Efectivo",
                                allBreaks
                              );
                            })()
                          ) : (
                            <Badge color="orange" variant="light">
                              Org cerrada
                            </Badge>
                          )}
                          </Box>
                        </Group>
                      );
                    })}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </ScrollArea>
      </Paper>

      {/* Leyenda */}
      <Paper p="sm" withBorder bg="gray.0">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Leyenda:
          </Text>
          <Group gap="md">
            <Group gap={4}>
              <Box w={20} h={20} bg="blue.6" style={{ borderRadius: 4 }} />
              <Text size="xs">Organización</Text>
            </Group>
            <Group gap={4}>
              <Box w={20} h={20} bg="green.6" style={{ borderRadius: 4 }} />
              <Text size="xs">Horario efectivo (∩)</Text>
            </Group>
            <Group gap={4}>
              <Box w={20} h={20} bg="gray.5" style={{ borderRadius: 4 }} />
              <Text size="xs">Usa horario org</Text>
            </Group>
            <Group gap={4}>
              <Box
                w={20}
                h={20}
                bg="repeating-linear-gradient(45deg, rgba(0,0,0,0.1), rgba(0,0,0,0.1) 2px, transparent 2px, transparent 4px)"
                style={{ borderRadius: 4, border: "1px solid #ccc" }}
              />
              <Text size="xs">Break/Descanso</Text>
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            ⚙️ Empleado con horario personalizado habilitado
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
