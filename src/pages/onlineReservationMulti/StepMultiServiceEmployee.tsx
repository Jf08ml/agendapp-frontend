import { MultiSelect, Select, Stack, Group, Text, Paper } from "@mantine/core";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { SelectedService } from "../../types/multiBooking";

interface StepMultiServiceEmployeeProps {
  services: Service[];
  employees: Employee[];
  value: SelectedService[];
  onChange: (selected: SelectedService[]) => void;
}

const StepMultiServiceEmployee: React.FC<StepMultiServiceEmployeeProps> = ({
  services,
  employees,
  value,
  onChange,
}) => {
  // Selección de servicios
  const handleServicesChange = (serviceIds: string[]) => {
    // Mantiene la selección de empleado si ya estaba elegida para ese servicio
    onChange(
      serviceIds.map((id) => {
        const prev = value.find((s) => s.serviceId === id);
        return { serviceId: id, employeeId: prev?.employeeId ?? null };
      })
    );
  };

  // Selección de empleado
  const handleEmployeeChange = (serviceId: string, employeeId: string | null) => {
    onChange(
      value.map((s) =>
        s.serviceId === serviceId ? { ...s, employeeId } : s
      )
    );
  };

  return (
    <Stack>
      <MultiSelect
        label="Selecciona uno o varios servicios"
        data={services.map((s) => ({
          value: s._id,
          label: `${s.name} (${s.duration} min)`,
        }))}
        value={value.map((s) => s.serviceId)}
        onChange={handleServicesChange}
        searchable
      />

      {value.map((sel) => {
        const service = services.find((s) => s._id === sel.serviceId);
        const empleadosServicio = employees.filter((e) =>
          (e.services || []).some((svc) => svc._id === sel.serviceId)
        );

        return (
          <Paper key={sel.serviceId} p="md" radius="md" withBorder mt="sm">
            <Group justify="space-between" align="center">
              <Text fw={600}>
                {service?.name}{" "}
                <Text span color="dimmed" size="sm">
                  ({service?.duration} min)
                </Text>
              </Text>
              <Select
                label="Empleado"
                placeholder="Sin preferencia"
                data={[
                  { value: "none", label: "Sin preferencia" },
                  ...empleadosServicio.map((e) => ({
                    value: e._id,
                    label: e.names,
                  })),
                ]}
                value={sel.employeeId || "none"}
                onChange={(v) => handleEmployeeChange(sel.serviceId, v === "none" ? null : v)}
                searchable
                style={{ width: 220 }}
              />
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default StepMultiServiceEmployee;
