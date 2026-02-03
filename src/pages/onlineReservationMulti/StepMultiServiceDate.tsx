import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Stack,
  Text,
  Paper,
  Divider,
  Loader,
  Center,
  Badge,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";
import { Service } from "../../services/serviceService";
import { SelectedService, ServiceWithDate } from "../../types/multiBooking";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { checkDaysAvailability } from "../../services/scheduleService";
dayjs.locale("es");

interface StepMultiServiceDateProps {
  selectedServices: SelectedService[];
  services: Service[];
  value: ServiceWithDate[];
  onChange: (next: ServiceWithDate[]) => void;
}

const StepMultiServiceDate: React.FC<StepMultiServiceDateProps> = ({
  selectedServices,
  services,
  value,
  onChange,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const organizationId = organization?._id;

  // Días de negocio de la organización (fallback)
  const businessDays = organization?.openingHours?.businessDays ?? [1, 2, 3, 4, 5];

  // Cargar disponibilidad cuando cambian los servicios seleccionados
  useEffect(() => {
    if (!organizationId || selectedServices.length === 0) {
      setAvailability({});
      return;
    }

    const loadAvailability = async () => {
      setLoading(true);
      try {
        // Preparar servicios con duración
        const servicesWithDuration = selectedServices.map((sel) => {
          const svc = services.find((s) => s._id === sel.serviceId);
          return {
            serviceId: sel.serviceId,
            employeeId: sel.employeeId,
            duration: svc?.duration ?? 30,
          };
        });

        // Calcular rango: desde hoy hasta 59 días adelante (60 días en total)
        const startDate = dayjs().format("YYYY-MM-DD");
        const endDate = dayjs().add(59, "day").format("YYYY-MM-DD");

        const response = await checkDaysAvailability(
          organizationId,
          servicesWithDuration,
          startDate,
          endDate
        );

        console.log("checkDaysAvailability response:", response);

        if (response?.availability) {
          console.log("Availability loaded:", Object.keys(response.availability).length, "days");
          setAvailability(response.availability);
        } else {
          console.log("No availability data in response:", response);
        }
      } catch (error) {
        console.error("Error loading availability:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, [organizationId, selectedServices, services]);

  // Handler para seleccionar fecha
  const handleDateSelect = useCallback(
    (date: Date | null) => {
      onChange(
        selectedServices.map((s) => ({
          serviceId: s.serviceId,
          employeeId: s.employeeId,
          date,
        }))
      );
    },
    [selectedServices, onChange]
  );

  // Determinar si un día está deshabilitado (solo días pasados y no laborables)
  // NO deshabilitamos días sin disponibilidad para poder aplicar estilos
  const isDisabledDay = useCallback(
    (d: Date) => {
      // Días anteriores a hoy
      if (dayjs(d).isBefore(dayjs(), "day")) return true;

      // Días que no son laborables (según organización)
      if (!businessDays.includes(dayjs(d).day())) return true;

      // NO deshabilitamos por falta de disponibilidad aquí
      // para que los estilos se apliquen correctamente
      return false;
    },
    [businessDays]
  );

  // Fecha seleccionada actualmente
  const selectedDate = value[0]?.date;

  // getDayProps con estilos y control de selección
  const getDayProps = useCallback(
    (date: Date) => {
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const isToday = dayjs(date).isSame(dayjs(), "day");
      const isPast = dayjs(date).isBefore(dayjs(), "day");
      const isBusinessDay = businessDays.includes(dayjs(date).day());
      const isSelected = selectedDate && dayjs(date).isSame(dayjs(selectedDate), "day");

      // Día pasado o no laborable - sin estilo especial
      if (isPast || !isBusinessDay) {
        return {};
      }

      // Si está seleccionado, mostrar estilo de selección prominente
      if (isSelected) {
        return {
          style: {
            backgroundColor: "#228be6",
            color: "#ffffff",
            fontWeight: 700,
            borderRadius: "50%",
            boxShadow: "0 0 0 2px #228be6, 0 0 0 4px #ffffff",
          },
        };
      }

      // Si tenemos datos de disponibilidad
      if (Object.keys(availability).length > 0) {
        const hasAvailability = availability[dateStr];

        if (hasAvailability === false) {
          return {
            disabled: true, // Deshabilitar para que no se pueda seleccionar
            style: {
              backgroundColor: "#ffe0e0",
              color: "#c92a2a",
              textDecoration: "line-through",
              cursor: "not-allowed",
            },
          };
        }

        if (hasAvailability === true) {
          return {
            style: {
              backgroundColor: isToday ? "#d0ebff" : "#d3f9d8",
              color: isToday ? "#1864ab" : "#2b8a3e",
              fontWeight: 700,
            },
          };
        }
      }

      return {};
    },
    [availability, businessDays, selectedDate]
  );

  // Contar días disponibles
  const availableDaysCount = useMemo(
    () => Object.values(availability).filter(Boolean).length,
    [availability]
  );

  const hasAvailabilityData = Object.keys(availability).length > 0;

  return (
    <Stack>
      <Text fw={600} size={isMobile ? "sm" : "md"}>
        Selecciona el día de tu cita
      </Text>

      <Divider />

      <Stack gap="xs">
        {hasAvailabilityData && (
          <Text c="dimmed" size="sm">
            Los días en <Text span c="green" fw={600}>verde</Text> tienen horarios disponibles.
            <Text span c="red" fw={600}> Los días tachados</Text> no tienen disponibilidad.
          </Text>
        )}

        {loading ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Verificando disponibilidad...
              </Text>
            </Stack>
          </Center>
        ) : (
          <>
            {availableDaysCount > 0 && (
              <Badge variant="light" color="green" size="sm">
                {availableDaysCount} días con disponibilidad
              </Badge>
            )}

            {availableDaysCount === 0 && hasAvailabilityData && (
              <Badge variant="light" color="red" size="sm">
                No hay disponibilidad en los próximos días
              </Badge>
            )}

            <Paper withBorder radius="md" p={isMobile ? "sm" : "md"}>
              <DatePicker
                minDate={new Date()}
                maxDate={dayjs().add(59, "day").toDate()}
                value={value[0]?.date || null}
                onChange={handleDateSelect}
                size={isMobile ? "sm" : "md"}
                style={{ width: "100%" }}
                locale="es"
                getDayProps={getDayProps}
                excludeDate={isDisabledDay}
              />
            </Paper>

            {/* Día seleccionado */}
            {selectedDate && (
              <Paper withBorder p="sm" radius="md" bg="blue.0">
                <Text size="sm" fw={600} c="blue.7">
                  Día seleccionado: {dayjs(selectedDate).format("dddd, D [de] MMMM [de] YYYY")}
                </Text>
              </Paper>
            )}

            {/* Leyenda de colores */}
            {hasAvailabilityData && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed" fw={500}>
                  Leyenda:
                </Text>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: "#d3f9d8",
                        borderRadius: 4,
                        border: "1px solid #2b8a3e",
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      Disponible
                    </Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: "#ffe0e0",
                        borderRadius: 4,
                        border: "1px solid #c92a2a",
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      Sin disponibilidad
                    </Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: "#228be6",
                        borderRadius: "50%",
                        border: "2px solid #228be6",
                        boxShadow: "0 0 0 2px #ffffff",
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      Seleccionado
                    </Text>
                  </div>
                </div>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Stack>
  );
};

export default StepMultiServiceDate;
