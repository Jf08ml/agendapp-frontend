import { useState } from "react";
import { Stack, Group, Text, Paper, Divider, Switch } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { Service } from "../../services/serviceService";
import { SelectedService, ServiceWithDate } from "../../types/multiBooking";

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
  // ¿Un solo día para todos, o fechas independientes?
  const [splitDates, setSplitDates] = useState(false);

  // Cuando seleccionan un día único, aplica a todos los servicios
  const handleUniqueDate = (date: Date | null) => {
    onChange(
      selectedServices.map((s) => ({
        serviceId: s.serviceId,
        employeeId: s.employeeId,
        date,
      }))
    );
  };

  // Cuando seleccionan días por servicio
  const handleSplitDateChange = (serviceId: string, date: Date | null) => {
    onChange(
      value.map((item) =>
        item.serviceId === serviceId ? { ...item, date } : item
      )
    );
  };

  // Inicializar el value si está vacío (al activar fechas independientes)
  const ensureValueForSplit = () => {
    if (value.length !== selectedServices.length) {
      onChange(
        selectedServices.map((s) => ({
          serviceId: s.serviceId,
          employeeId: s.employeeId,
          date: null,
        }))
      );
    }
  };

  return (
    <Stack>
      <Group align="center" justify="space-between">
        <Text fw={600} size="lg">
          Selecciona la(s) fecha(s) de tus servicios
        </Text>
        <Switch
          label="Agendar cada servicio en un día diferente"
          checked={splitDates}
          onChange={(e) => {
            setSplitDates(e.currentTarget.checked);
            if (e.currentTarget.checked) {
              ensureValueForSplit();
            } else {
              // Si desactivas, borra fechas individuales
              onChange(
                selectedServices.map((s) => ({
                  serviceId: s.serviceId,
                  employeeId: s.employeeId,
                  date: null,
                }))
              );
            }
          }}
        />
      </Group>
      <Divider />

      {!splitDates ? (
        <>
          <Text>Selecciona un día para las citas</Text>
          <DatePicker
            minDate={new Date()}
            value={value[0]?.date || null}
            onChange={handleUniqueDate}
          />
        </>
      ) : (
        // Un DatePicker para cada servicio
        value.map((item) => {
          const service = services.find((s) => s._id === item.serviceId);
          return (
            <Paper key={item.serviceId} p="md" radius="md" withBorder>
              <Group align="center" justify="space-between">
                <Text>
                  <strong>{service?.name}</strong>{" "}
                  <Text span color="dimmed" size="sm">
                    ({service?.duration} min)
                  </Text>
                </Text>
                <DatePicker
                  minDate={new Date()}
                  value={item.date}
                  onChange={(date) =>
                    handleSplitDateChange(item.serviceId, date)
                  }
                  style={{ width: 200 }}
                />
              </Group>
            </Paper>
          );
        })
      )}
    </Stack>
  );
};

export default StepMultiServiceDate;
