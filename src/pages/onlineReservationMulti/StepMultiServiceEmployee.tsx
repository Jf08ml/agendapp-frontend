/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState } from "react";
import {
  MultiSelect,
  Select,
  Stack,
  Group,
  Text,
  Paper,
  Badge,
  Divider,
  Center,
  Avatar,
  Button,
  Box,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { SelectedService } from "../../types/multiBooking";

interface StepMultiServiceEmployeeProps {
  services: Service[];
  employees: Employee[]; // isActive: boolean; profileImage?: string; names: string
  value: SelectedService[];
  onChange: (selected: SelectedService[]) => void;
}

const StepMultiServiceEmployee: React.FC<StepMultiServiceEmployeeProps> = ({
  services,
  employees,
  value,
  onChange,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  // Control del dropdown del MultiSelect (servicios)
  const [opened, setOpened] = useState(false);
  const msRef = useRef<HTMLInputElement | null>(null);

  // Card en modo edición (para cambiar empleado)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Solo empleados activos
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive),
    [employees]
  );

  // Lookup por id
  const employeeById = useMemo(
    () =>
      Object.fromEntries(activeEmployees.map((e) => [e._id, e])) as Record<
        string,
        Employee
      >,
    [activeEmployees]
  );

  // Para auto-scroll al card recién agregado
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const serviceOptions = useMemo(
    () =>
      services.map((s) => ({
        value: s._id,
        label: `${s.name} (${s.duration} min)`,
      })),
    [services]
  );

  const selectedIds = value.map((s) => s.serviceId);

  // Selección/retirada de servicios
  const handleServicesChange = (serviceIds: string[]) => {
    const newlyAdded = serviceIds.find((id) => !selectedIds.includes(id));

    const next = serviceIds.map((id) => {
      const prev = value.find((s) => s.serviceId === id);
      return { serviceId: id, employeeId: prev?.employeeId ?? null };
    });

    onChange(next);

    if (newlyAdded) {
      setOpened(false);
      msRef.current?.blur();
      setTimeout(() => {
        cardRefs.current[newlyAdded]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }
  };

  // Cambio/Quitar empleado
  const handleEmployeeChange = (
    serviceId: string,
    employeeId: string | null
  ) => {
    onChange(
      value.map((s) => (s.serviceId === serviceId ? { ...s, employeeId } : s))
    );
    setEditingServiceId(null);
  };
  const clearEmployee = (serviceId: string) => {
    onChange(
      value.map((s) => (s.serviceId === serviceId ? { ...s, employeeId: null } : s))
    );
    setEditingServiceId(null);
  };

  // Render de opción del Select (dropdown con avatar)
  const renderEmployeeOption = ({ option }: any) => {
    const emp = employeeById[option.value];
    if (!emp) {
      return (
        <Group gap="sm" wrap="nowrap">
          <Avatar radius="xl" size="sm">—</Avatar>
          <Text>{option.label}</Text>
        </Group>
      );
    }
    return (
      <Group gap="sm" wrap="nowrap">
        <Avatar radius="xl" size="sm" src={emp.profileImage || undefined}>
          {!emp.profileImage && emp.names ? emp.names.charAt(0) : null}
        </Avatar>
        <Text>{option.label}</Text>
      </Group>
    );
  };

  return (
    <Stack>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text fw={600} size={isMobile ? "sm" : "md"}>
            Selecciona servicios
          </Text>
          <Badge variant="light" size="sm">
            {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
          </Badge>
        </Group>

        <MultiSelect
          ref={msRef}
          data={serviceOptions}
          value={selectedIds}
          onChange={handleServicesChange}
          label="Servicios"
          placeholder="Elige uno o varios servicios"
          searchable
          clearable
          maxDropdownHeight={260}
          nothingFoundMessage="Sin resultados"
          hidePickedOptions
          dropdownOpened={opened}
          onDropdownOpen={() => setOpened(true)}
          onDropdownClose={() => setOpened(false)}
          comboboxProps={{ withinPortal: true, shadow: "md" }}
          onFocus={() => setOpened(true)}
          onBlur={() => setOpened(false)}
        />
      </Stack>

      <Divider my={isMobile ? "sm" : "md"} />

      {value.length === 0 ? (
        <Center mih={120}>
          <Text c="dimmed" size="sm">
            Aún no has seleccionado servicios.
          </Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {value.map((sel) => {
            const service = services.find((s) => s._id === sel.serviceId);

            // Empleados activos que prestan este servicio
            const empleadosServicio = activeEmployees.filter((e) => {
              const svcIds = (e.services || []).map((svc: any) =>
                typeof svc === "string" ? svc : svc._id
              );
              return svcIds.includes(sel.serviceId);
            });

            const selectedEmp = sel.employeeId ? employeeById[sel.employeeId] : null;

            // Select con avatares (modo edición)
            const employeeSelect = (
              <Select
                label={isMobile ? "Empleado" : undefined}
                placeholder="Sin preferencia"
                data={[
                  { value: "none", label: "Sin preferencia" },
                  ...empleadosServicio.map((e) => ({
                    value: e._id,
                    label: e.names,
                  })),
                ]}
                value={sel.employeeId || "none"}
                onChange={(v) =>
                  handleEmployeeChange(sel.serviceId, v === "none" ? null : v)
                }
                searchable
                nothingFoundMessage={
                  empleadosServicio.length === 0
                    ? "No hay empleados activos para este servicio"
                    : "Sin resultados"
                }
                w={isMobile ? "100%" : 340}
                comboboxProps={{ withinPortal: true, shadow: "md" }}
                // ✅ Avatares en el dropdown
                renderOption={renderEmployeeOption as any}
                // ✅ Avatar junto al valor seleccionado:
                //    usamos leftSection dinámico con el empleado elegido
                leftSection={
                  sel.employeeId && selectedEmp ? (
                    <Avatar radius="xl" size="sm" src={selectedEmp.profileImage || undefined}>
                      {!selectedEmp.profileImage && selectedEmp.names
                        ? selectedEmp.names.charAt(0)
                        : null}
                    </Avatar>
                  ) : undefined
                }
                leftSectionWidth={34}
              />
            );

            return (
              <Paper
                key={sel.serviceId}
                p={isMobile ? "sm" : "md"}
                radius="md"
                withBorder
                ref={(el) => (cardRefs.current[sel.serviceId] = el)}
              >
                {/* Título del servicio */}
                <Group
                  justify="space-between"
                  align="center"
                  wrap="wrap"
                  mb={isMobile ? "xs" : "sm"}
                >
                  <Text fw={600}>
                    {service?.name}{" "}
                    <Text span c="dimmed" size="sm">
                      ({service?.duration} min)
                    </Text>
                  </Text>
                </Group>

                {/* Cuerpo */}
                {!selectedEmp || editingServiceId === sel.serviceId ? (
                  // Modo edición o sin selección: Select
                  <Stack gap="xs">
                    {employeeSelect}
                    {selectedEmp && (
                      <Group justify="flex-end" gap="xs">
                        <Button
                          size="xs"
                          variant="default"
                          onClick={() => setEditingServiceId(null)}
                        >
                          Cancelar
                        </Button>
                      </Group>
                    )}
                  </Stack>
                ) : (
                  // Resumen con avatar grande + acciones
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="md" align="center" wrap="nowrap">
                      <Avatar
                        radius="xl"
                        size={100}
                        src={selectedEmp.profileImage || undefined}
                      >
                        {!selectedEmp.profileImage && selectedEmp.names
                          ? selectedEmp.names.charAt(0)
                          : null}
                      </Avatar>
                      <Box>
                        <Text fw={600}>{selectedEmp.names}</Text>
                        {/* <Text size="sm" c="dimmed">{selectedEmp.role}</Text> */}
                      </Box>
                    </Group>

                    <Group gap="xs" wrap="wrap">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => setEditingServiceId(sel.serviceId)}
                      >
                        Cambiar
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        onClick={() => clearEmployee(sel.serviceId)}
                      >
                        Quitar
                      </Button>
                    </Group>
                  </Group>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
};

export default StepMultiServiceEmployee;
