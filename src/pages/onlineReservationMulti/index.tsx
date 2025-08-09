/* eslint-disable @typescript-eslint/no-explicit-any */
// MultiBookingWizard.tsx
import { useEffect, useMemo, useState } from "react";
import StepMultiServiceEmployee from "./StepMultiServiceEmployee";
import StepMultiServiceDate from "./StepMultiServiceDate";
import StepMultiServiceTime from "./StepMultiServiceTime";
import StepMultiServiceSummary from "./StepMultiServiceSummary";
import StepCustomerData from "./StepCustomerData";
import { Service, getServicesByOrganizationId } from "../../services/serviceService";
import { Employee, getEmployeesByOrganizationId } from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
  ServiceTimeSelection,
} from "../../types/multiBooking";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Loader, Stack, Stepper, Button, Group, Text } from "@mantine/core";
import {
  createReservation,
  createMultipleReservations,
  type CreateMultipleReservationsPayload,
  type Reservation,
  type CreateReservationPayload,
} from "../../services/reservationService";
import dayjs from "dayjs";

export default function MultiBookingWizard() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Paso actual
  const [currentStep, setCurrentStep] = useState(0);

  // Paso 1: selección servicios/empleados
  const [selected, setSelected] = useState<SelectedService[]>([]);
  // Paso 2: fechas
  const [dates, setDates] = useState<ServiceWithDate[]>([]);
  // Paso 3: horarios
  const [times, setTimes] = useState<MultiServiceBlockSelection | ServiceTimeSelection[]>([]);
  // Paso 4: datos cliente
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: null as Date | null,
  });

  const [submitting, setSubmitting] = useState(false);

  const organization = useSelector((state: RootState) => state.organization.organization);

  useEffect(() => {
    if (!organization?._id) return;
    setLoading(true);
    Promise.all([
      getServicesByOrganizationId(organization._id),
      getEmployeesByOrganizationId(organization._id),
    ])
      .then(([servicesData, employeesData]) => {
        setServices(servicesData.filter((s) => s.isActive));
        setEmployees(employeesData);
      })
      .finally(() => setLoading(false));
  }, [organization]);

  // Reset encadenado cuando cambian selecciones/fechas
  useEffect(() => {
    setDates([]);
    setTimes([]);
  }, [selected]);

  useEffect(() => {
    setTimes([]);
  }, [dates]);

  const splitDates = useMemo(
    () => dates.some((d, _i, arr) => d.date?.toDateString() !== arr[0]?.date?.toDateString()),
    [dates]
  );

  // Validaciones para navegación
  const canGoNextFromStep0 = selected.length > 0;

  const canGoNextFromStep1 = (() => {
    if (selected.length === 0) return false;
    if (dates.length === 0) return false;
    if (splitDates) return dates.every((d) => !!d.date);
    return !!dates[0]?.date;
  })();

  const hasChosenTimes = useMemo(() => {
    if (!times) return false;
    if (Array.isArray(times)) {
      if (times.length !== selected.length) return false;
      return times.every((t) => !!t.time);
    } else {
      return !!times.startTime && Array.isArray(times.intervals) && times.intervals.length > 0;
    }
  }, [times, selected.length]);

  const hasCustomerData =
    customerDetails.name.trim().length > 0 && customerDetails.phone.trim().length >= 7;

  // 🚧 Guard temprano: si no hay organización, no seguimos (evita string | undefined)
  if (!organization?._id) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 220 }}>
        <Text c="dimmed">No hay organización seleccionada. Intenta recargar o selecciona una.</Text>
      </Stack>
    );
  }
  // Desde aquí, orgId es string garantizado
  const orgId: string = organization._id;

  // Payloads para reservas

  // 👉 Bloque único (mismo día encadenado): usa /multi
  const buildMultiplePayload = (): CreateMultipleReservationsPayload => {
    const block = times as MultiServiceBlockSelection;
    return {
      services: block.intervals.map((iv) => ({
        serviceId: iv.serviceId,
        employeeId: iv.employeeId ?? null,
        // duration opcional; el backend puede resolverla
      })),
      startDate: block.startTime ?? block.intervals[0].from,
      customerDetails,
      organizationId: orgId,
    } satisfies CreateMultipleReservationsPayload;
  };

  // 👉 Split (fechas distintas): N llamadas a /reservations
  const buildSingles = (): CreateReservationPayload[] => {
    const arr = times as ServiceTimeSelection[];
    return arr.map((t) => {
      const d = dates.find((x) => x.serviceId === t.serviceId)!;
      const svc = services.find((s) => s._id === t.serviceId)!;

      const baseTime = dayjs(t.time!, "h:mm A");
      const start = dayjs(d.date!)
        .hour(baseTime.hour())
        .minute(baseTime.minute())
        .second(0)
        .millisecond(0);

      return {
        serviceId: svc._id,
        employeeId: d.employeeId ?? null,
        startDate: start.toDate(),
        customerDetails,
        organizationId: orgId,
        status: "pending",
      } satisfies CreateReservationPayload;
    });
  };

  const handleSchedule = async () => {
    try {
      setSubmitting(true);

      if (!hasCustomerData) {
        // Obligar a completar datos
        setCurrentStep(3);
        return;
      }

      if (!splitDates) {
        const payload = buildMultiplePayload();
        await createMultipleReservations(payload);
      } else {
        const singles = buildSingles();
        for (const p of singles) {
          await createReservation(p);
        }
      }

      // Reset tras éxito
      setSelected([]);
      setDates([]);
      setTimes([]);
      setCustomerDetails({ name: "", email: "", phone: "", birthDate: null });
      setCurrentStep(0);
      // Aquí puedes disparar tu notificación de éxito
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 220 }}>
        <Loader size="lg" />
      </Stack>
    );
  }

  return (
    <Stack>
      <Stepper active={currentStep} onStepClick={setCurrentStep}>
        <Stepper.Step label="Servicios y Empleados">
          <StepMultiServiceEmployee
            services={services}
            employees={employees}
            value={selected}
            onChange={setSelected}
          />
        </Stepper.Step>

        <Stepper.Step label="Fechas">
          <StepMultiServiceDate
            selectedServices={selected}
            services={services}
            value={dates}
            onChange={setDates}
          />
        </Stepper.Step>

        <Stepper.Step label="Horarios">
          <StepMultiServiceTime
            organizationId={orgId}
            selectedServices={selected}
            services={services}
            employees={employees}
            dates={dates}
            value={times}
            onChange={setTimes}
          />
        </Stepper.Step>

        {/* Paso de datos del cliente */}
        <Stepper.Step label="Tus datos">
          <StepCustomerData
            bookingData={{
              customerDetails,
              organizationId: orgId,
            } as Partial<Reservation>}
            setBookingData={(updater) => {
              const base: Partial<Reservation> = {
                customerDetails,
                organizationId: orgId,
              };
              const next =
                typeof updater === "function" ? (updater as any)(base) : updater;
              if (next?.customerDetails) {
                setCustomerDetails(next.customerDetails as typeof customerDetails);
              }
            }}
          />
        </Stepper.Step>

        {/* Resumen */}
        <Stepper.Step label="Resumen">
          <StepMultiServiceSummary
            splitDates={splitDates}
            services={services}
            employees={employees}
            dates={dates}
            times={times}
          />
        </Stepper.Step>
      </Stepper>

      <Group justify="flex-end">
        {currentStep > 0 && (
          <Button variant="default" onClick={() => setCurrentStep((s) => s - 1)}>
            Atrás
          </Button>
        )}

        {currentStep === 0 && (
          <Button disabled={!canGoNextFromStep0} onClick={() => setCurrentStep(1)}>
            Siguiente
          </Button>
        )}

        {currentStep === 1 && (
          <Button disabled={!canGoNextFromStep1} onClick={() => setCurrentStep(2)}>
            Siguiente
          </Button>
        )}

        {currentStep === 2 && (
          <Button disabled={!hasChosenTimes} onClick={() => setCurrentStep(3)}>
            Continuar
          </Button>
        )}

        {currentStep === 3 && (
          <Button disabled={!hasCustomerData} onClick={() => setCurrentStep(4)}>
            Continuar
          </Button>
        )}

        {currentStep === 4 && (
          <Button loading={submitting} onClick={handleSchedule}>
            Agendar
          </Button>
        )}
      </Group>
    </Stack>
  );
}
