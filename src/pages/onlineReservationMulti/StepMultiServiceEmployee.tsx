/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
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
  Alert,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { SelectedService } from "../../types/multiBooking";
import { IoAlertCircle } from "react-icons/io5";

interface StepMultiServiceEmployeeProps {
  services: Service[];
  employees: Employee[]; // isActive: boolean; profileImage?: string; names: string
  value: SelectedService[];
  onChange: (selected: SelectedService[]) => void;

  /** Si true (modo automático), el empleado es obligatorio por servicio */
  employeeRequired?: boolean;
}

const StepMultiServiceEmployee: React.FC<StepMultiServiceEmployeeProps> = ({
  services,
  employees,
  value,
  onChange,
  employeeRequired = false,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  // Control del dropdown del MultiSelect (servicios)
  const [opened, setOpened] = useState(false);
  const msRef = useRef<HTMLInputElement | null>(null);

  // Card en modo edición (para cambiar empleado)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // === Errores por servicio cuando employeeRequired === true
  // clave: serviceId, valor: mensaje de error (o null)
  const [errors, setErrors] = useState<Record<string, string | null>>({});

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

    // limpiar errores de servicios quitados
    setErrors((prev) => {
      const copy = { ...prev };
      Object.keys(copy).forEach((k) => {
        if (!serviceIds.includes(k)) delete copy[k];
      });
      return copy;
    });

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
    // limpiar error si ahora sí hay empleado
    setErrors((prev) => ({
      ...prev,
      [serviceId]:
        employeeRequired && !employeeId ? "Selecciona un empleado." : null,
    }));
    setEditingServiceId(null);
  };

  const clearEmployee = (serviceId: string) => {
    if (employeeRequired) {
      // no permitir limpiar si es obligatorio
      setErrors((prev) => ({
        ...prev,
        [serviceId]: "Selecciona un empleado.",
      }));
      return;
    }
    onChange(
      value.map((s) =>
        s.serviceId === serviceId ? { ...s, employeeId: null } : s
      )
    );
    setEditingServiceId(null);
  };

  // Auto-seleccionar cuando sólo hay 1 empleado disponible para ese servicio
  useEffect(() => {
    if (!employeeRequired) return;

    // Por cada servicio seleccionado sin empleado, si sólo hay 1 disponible => asignarlo
    const next = [...value];
    let changed = false;

    for (const sel of value) {
      if (sel.employeeId) continue;

      const empleadosServicio = activeEmployees.filter((e) => {
        const svcIds = (e.services || []).map((svc: any) =>
          typeof svc === "string" ? svc : svc._id
        );
        return svcIds.includes(sel.serviceId);
      });

      if (empleadosServicio.length === 1) {
        const unico = empleadosServicio[0];
        const idx = next.findIndex((x) => x.serviceId === sel.serviceId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], employeeId: unico._id };
          changed = true;
          setErrors((prev) => ({ ...prev, [sel.serviceId]: null }));
        }
      } else if (!errors[sel.serviceId]) {
        // marca error si sigue sin empleado
        setErrors((prev) => ({
          ...prev,
          [sel.serviceId]: "Selecciona un empleado.",
        }));
      }
    }

    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRequired, value, activeEmployees]);

  // Render de opción del Select (dropdown con avatar)
  const renderEmployeeOption = ({ option }: any) => {
    const emp = employeeById[option.value];
    if (!emp) {
      return (
        <Group gap="sm" wrap="nowrap">
          <Avatar radius="xl" size="sm">
            —
          </Avatar>
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
          <Group gap="xs">
            {employeeRequired && (
              <Badge color="green" variant="filled" size="sm">
                Empleado obligatorio (automático)
              </Badge>
            )}
            <Badge variant="light" size="sm">
              {selectedIds.length} seleccionado
              {selectedIds.length === 1 ? "" : "s"}
            </Badge>
          </Group>
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

      {employeeRequired && value.length > 0 && (
        <Alert
          mt="xs"
          color="green"
          variant="light"
          icon={<IoAlertCircle size={16} />}
        >
          En agendamiento automático, cada servicio debe tener un empleado
          asignado.
        </Alert>
      )}

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

            const selectedEmp = sel.employeeId
              ? employeeById[sel.employeeId]
              : null;

            const selectData = [
              // incluir "Sin preferencia" sólo si no es obligatorio
              ...(employeeRequired
                ? []
                : [{ value: "none", label: "Sin preferencia" }]),
              ...empleadosServicio.map((e) => ({
                value: e._id,
                label: e.names,
              })),
            ];

            // Select con avatares (modo edición)
            const employeeSelect = (
              <Select
                label={isMobile ? "Empleado" : undefined}
                placeholder="Sin preferencia"
                data={selectData}
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
                    <Avatar
                      radius="xl"
                      size="sm"
                      src={selectedEmp.profileImage || undefined}
                    >
                      {!selectedEmp.profileImage && selectedEmp.names
                        ? selectedEmp.names.charAt(0)
                        : null}
                    </Avatar>
                  ) : undefined
                }
                leftSectionWidth={34}
                error={
                  employeeRequired && !sel.employeeId
                    ? errors[sel.serviceId]
                    : null
                }
                withAsterisk={employeeRequired}
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
                        disabled={employeeRequired}
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
