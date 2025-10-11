import { useEffect, useMemo, useState } from "react";
import {
  Stack,
  Group,
  Text,
  Paper,
  Divider,
  SegmentedControl,
  SimpleGrid,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DatePicker, DateInput } from "@mantine/dates";
import { Service } from "../../services/serviceService";
import { SelectedService, ServiceWithDate } from "../../types/multiBooking";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
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
  const isMobile = useMediaQuery("(max-width: 48rem)"); // ~768px

  // UI:  "one" = un solo día para todos, "split" = fechas por servicio
  const [mode, setMode] = useState<"one" | "split">("one");

  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const businessDays = organization?.openingHours?.businessDays ?? [
    1, 2, 3, 4, 5,
  ];

  const isDisabledDay = (d: Date) => !businessDays.includes(dayjs(d).day());

  // Mantener value sincronizado con servicios seleccionados
  useEffect(() => {
    if (mode === "split") {
      if (value.length !== selectedServices.length) {
        onChange(
          selectedServices.map((s) => ({
            serviceId: s.serviceId,
            employeeId: s.employeeId,
            date: value.find((v) => v.serviceId === s.serviceId)?.date ?? null,
          }))
        );
      }
    } else {
      if (
        selectedServices.length > 0 &&
        value.length !== selectedServices.length
      ) {
        onChange(
          selectedServices.map((s) => ({
            serviceId: s.serviceId,
            employeeId: s.employeeId,
            date: value[0]?.date ?? null,
          }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedServices]);

  const handleUniqueDate = (date: Date | null) => {
    onChange(
      selectedServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId,
        date,
      }))
    );
  };

  const handleSplitDateChange = (serviceId: string, date: Date | null) => {
    onChange(
      selectedServices.map((s) => {
        const current = value.find((v) => v.serviceId === s.serviceId);
        if (s.serviceId === serviceId) {
          return { serviceId: s.serviceId, employeeId: s.employeeId, date };
        }
        return {
          serviceId: s.serviceId,
          employeeId: s.employeeId,
          date: current?.date ?? null,
        };
      })
    );
  };

  const gridCols = useMemo(() => {
    if (isMobile) return 1;
    return selectedServices.length >= 3 ? 3 : 2;
  }, [isMobile, selectedServices.length]);

  return (
    <Stack>
      <Group align="center" justify="space-between" wrap="wrap" gap="xs">
        <Text fw={600} size={isMobile ? "sm" : "md"}>
          Selecciona la(s) fecha(s) de tus servicios
        </Text>

        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as "one" | "split")}
          data={[
            { label: "Mismo día", value: "one" },
            { label: "Día diferente", value: "split" },
          ]}
          size={isMobile ? "xs" : "sm"}
          radius="md"
        />
      </Group>

      <Divider />

      {mode === "one" ? (
        <Stack gap="xs">
          <Text c="dimmed" size="sm">
            Elige un día y aplicará a todos los servicios seleccionados.
          </Text>
          <Paper withBorder radius="md" p={isMobile ? "sm" : "md"}>
            <DatePicker
              minDate={new Date()}
              value={value[0]?.date || null}
              onChange={handleUniqueDate}
              size={isMobile ? "sm" : "md"}
              style={{ width: "100%" }}
              locale="es"
              getDayProps={(date) => ({ disabled: isDisabledDay(date) })}
            />
          </Paper>
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            Asigna una fecha específica para cada servicio.
          </Text>

          <SimpleGrid cols={gridCols} spacing={isMobile ? "sm" : "md"}>
            {selectedServices.map((sel) => {
              const item = value.find((v) => v.serviceId === sel.serviceId);
              const service = services.find((s) => s._id === sel.serviceId);

              return (
                <Paper
                  key={sel.serviceId}
                  withBorder
                  radius="md"
                  p={isMobile ? "sm" : "md"}
                >
                  <Stack gap="xs">
                    <Text fw={600} lh="sm">
                      {service?.name}{" "}
                      <Text span c="dimmed" size="sm">
                        ({service?.duration} min)
                      </Text>
                    </Text>

                    <DateInput
                      label={isMobile ? undefined : "Fecha"}
                      placeholder="Selecciona una fecha"
                      minDate={new Date()}
                      value={item?.date ?? null}
                      onChange={(date) =>
                        handleSplitDateChange(sel.serviceId, date)
                      }
                      size={isMobile ? "sm" : "md"}
                      clearable
                      style={{ width: "100%" }}
                      popoverProps={{ withinPortal: true, trapFocus: false }}
                      locale="es"
                      valueFormat="DD/MM/YYYY"
                      getDayProps={(date) => ({ disabled: isDisabledDay(date) })}
                    />
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        </Stack>
      )}
    </Stack>
  );
};

export default StepMultiServiceDate;
