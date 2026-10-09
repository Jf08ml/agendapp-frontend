/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MultiSelect,
  Select,
  Stack,
  Group,
  Text,
  Paper,
  Avatar,
  CloseButton,
} from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Service } from "../../services/serviceService";
import { Employee } from "../../services/employeeService";
import { SelectedService } from "../../types/multiBooking";
import { formatCurrency } from "../../utils/formatCurrency";
import StepHeading from "./StepHeading";

interface StepMultiServiceEmployeeProps {
  services: Service[];
  employees: Employee[]; // isActive: boolean; profileImage?: string; names: string
  value: SelectedService[];
  onChange: (selected: SelectedService[]) => void;

  /** Si true (modo automático), el profesional es obligatorio por servicio */
  employeeRequired?: boolean;
}

const employeeServiceIds = (e: Employee): string[] =>
  (e.services || []).map((svc: any) => (typeof svc === "string" ? svc : svc._id));

const EmployeeAvatar = ({ emp, size = "sm" }: { emp?: Employee; size?: string }) => (
  <Avatar radius="xl" size={size} src={emp?.profileImage || undefined}>
    {!emp?.profileImage && emp?.names ? emp.names.charAt(0) : null}
  </Avatar>
);

const StepMultiServiceEmployee: React.FC<StepMultiServiceEmployeeProps> = ({
  services,
  employees,
  value,
  onChange,
  employeeRequired = false,
}) => {
  const currency = useSelector(
    (s: RootState) => s.organization.organization?.currency
  );

  // Control del dropdown del MultiSelect (servicios)
  const [opened, setOpened] = useState(false);
  const msRef = useRef<HTMLInputElement | null>(null);

  // Solo profesionales activos
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive),
    [employees]
  );

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
        label: `${s.featured ? "⭐ " : ""}${s.name} · ${s.duration} min`,
      })),
    [services]
  );

  const selectedIds = value.map((s) => s.serviceId);

  // Selección/retirada de servicios
  const handleServicesChange = (serviceIds: string[]) => {
    const newlyAdded = serviceIds.find((id) => !selectedIds.includes(id));

    onChange(
      serviceIds.map((id) => {
        const prev = value.find((s) => s.serviceId === id);
        return { serviceId: id, employeeId: prev?.employeeId ?? null };
      })
    );

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

  const removeService = (serviceId: string) =>
    onChange(value.filter((s) => s.serviceId !== serviceId));

  const handleEmployeeChange = (serviceId: string, employeeId: string | null) =>
    onChange(
      value.map((s) => (s.serviceId === serviceId ? { ...s, employeeId } : s))
    );

  // Auto-seleccionar cuando sólo hay 1 profesional para ese servicio (modo obligatorio)
  useEffect(() => {
    if (!employeeRequired) return;
    let changed = false;
    const next = value.map((sel) => {
      if (sel.employeeId) return sel;
      const eligible = activeEmployees.filter((e) =>
        employeeServiceIds(e).includes(sel.serviceId)
      );
      if (eligible.length === 1) {
        changed = true;
        return { ...sel, employeeId: eligible[0]._id };
      }
      return sel;
    });
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRequired, value, activeEmployees]);

  // Opción del Select con avatar
  const renderEmployeeOption = ({ option }: any) => (
    <Group gap="sm" wrap="nowrap">
      {option.value === "none" ? (
        <Avatar radius="xl" size="sm">?</Avatar>
      ) : (
        <EmployeeAvatar emp={employeeById[option.value]} />
      )}
      <Text size="sm">{option.label}</Text>
    </Group>
  );

  return (
    <Stack gap="md">
      <StepHeading
        title="¿Qué servicio quieres?"
        hint="Puedes elegir más de uno."
      />

      <MultiSelect
        ref={msRef}
        data={serviceOptions}
        value={selectedIds}
        onChange={handleServicesChange}
        placeholder={value.length ? "Agregar otro servicio" : "Buscar o elegir servicio"}
        aria-label="Servicios"
        size="md"
        searchable
        maxDropdownHeight={300}
        nothingFoundMessage="Sin resultados"
        hidePickedOptions
        // Los servicios elegidos se ven (y se quitan) en las tarjetas de abajo
        styles={{ pill: { display: "none" } }}
        dropdownOpened={opened}
        onDropdownOpen={() => setOpened(true)}
        onDropdownClose={() => setOpened(false)}
        comboboxProps={{ withinPortal: true, shadow: "md" }}
        onFocus={() => setOpened(true)}
        onBlur={() => setOpened(false)}
      />

      {value.map((sel) => {
        const service = services.find((s) => s._id === sel.serviceId);
        const eligible = activeEmployees.filter((e) =>
          employeeServiceIds(e).includes(sel.serviceId)
        );
        const selectedEmp = sel.employeeId ? employeeById[sel.employeeId] : undefined;
        const showPrice = service && !service.hidePrice && Number(service.price) > 0;

        return (
          <Paper
            key={sel.serviceId}
            p="sm"
            radius="md"
            withBorder
            ref={(el) => (cardRefs.current[sel.serviceId] = el)}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text fw={600} lh={1.3}>
                  {service?.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {service?.duration} min
                  {showPrice ? ` · ${formatCurrency(Number(service.price), currency)}` : ""}
                </Text>
              </Stack>
              <CloseButton
                aria-label={`Quitar ${service?.name ?? "servicio"}`}
                onClick={() => removeService(sel.serviceId)}
              />
            </Group>

            <Select
              label="¿Con quién?"
              placeholder={employeeRequired ? "Elige un profesional" : "Sin preferencia"}
              data={[
                ...(employeeRequired ? [] : [{ value: "none", label: "Sin preferencia" }]),
                ...eligible.map((e) => ({ value: e._id, label: e.names })),
              ]}
              value={sel.employeeId || (employeeRequired ? null : "none")}
              onChange={(v) =>
                handleEmployeeChange(sel.serviceId, !v || v === "none" ? null : v)
              }
              allowDeselect={false}
              size="md"
              nothingFoundMessage="No hay profesionales para este servicio"
              comboboxProps={{ withinPortal: true, shadow: "md" }}
              renderOption={renderEmployeeOption as any}
              leftSection={selectedEmp ? <EmployeeAvatar emp={selectedEmp} /> : undefined}
              leftSectionWidth={selectedEmp ? 40 : undefined}
              withAsterisk={employeeRequired}
            />
          </Paper>
        );
      })}
    </Stack>
  );
};

export default StepMultiServiceEmployee;
