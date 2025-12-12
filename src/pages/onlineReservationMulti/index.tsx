/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useRef } from "react";
import StepMultiServiceEmployee from "./StepMultiServiceEmployee";
import StepMultiServiceDate from "./StepMultiServiceDate";
import StepMultiServiceTime from "./StepMultiServiceTime";
import StepMultiServiceSummary from "./StepMultiServiceSummary";
import StepCustomerData from "./StepCustomerData";
import {
  Service,
  getServicesByOrganizationId,
} from "../../services/serviceService";
import {
  Employee,
  getEmployeesByOrganizationId,
} from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
  ServiceTimeSelection,
} from "../../types/multiBooking";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Stack,
  Stepper,
  Button,
  Group,
  Text,
  Card,
  Paper,
  LoadingOverlay,
  Title,
  Badge,
  Divider,
  Center,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  createReservation,
  createMultipleReservations,
  type CreateMultipleReservationsPayload,
  type Reservation,
  type CreateReservationPayload,
} from "../../services/reservationService";
import dayjs from "dayjs";
import { buildStartFrom, getId } from "./bookingUtilsMulti";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { ReservationDepositAlert } from "../../components/ReservationDepositAlert";

export default function MultiBookingWizard() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Paso actual (0..4) + finish (5)
  const [currentStep, setCurrentStep] = useState(0);

  // Paso 1: selección servicios/empleados
  const [selected, setSelected] = useState<SelectedService[]>([]);
  // Paso 2: fechas
  const [dates, setDates] = useState<ServiceWithDate[]>([]);
  // Paso 3: horarios
  const [times, setTimes] = useState<
    MultiServiceBlockSelection | ServiceTimeSelection[]
  >([]);
  // Paso 4: datos cliente
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: null as Date | null,
  });

  const [submitting, setSubmitting] = useState(false);

  // Datos para la pantalla de éxito
  const [finishInfo, setFinishInfo] = useState<{
    count: number;
    customer: string;
    dateText: string;
  } | null>(null);

  // Bloquea navegación/reenvíos tras terminar
  const [completed, setCompleted] = useState(false);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // === Responsive helpers ===
  const isMobile = useMediaQuery("(max-width: 48rem)"); // ~768px
  const contentTopRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll al top al cambiar de paso
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [currentStep]);

  const splitDates = useMemo(
    () =>
      dates.some(
        (d, _i, arr) => d.date?.toDateString() !== arr[0]?.date?.toDateString()
      ),
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
      return times.every(
        (t) => typeof t.time === "string" && t.time.trim().length > 0
      );
    }
    return (
      !!(times as MultiServiceBlockSelection).startTime &&
      Array.isArray((times as MultiServiceBlockSelection).intervals) &&
      (times as MultiServiceBlockSelection).intervals.length > 0
    );
  }, [times, selected.length]);

  const hasCustomerData =
    customerDetails.name.trim().length > 0 &&
    customerDetails.phone.trim().length >= 7;

  if (!organization?._id) {
    return (
      <Stack align="center" justify="center" style={{ minHeight: 220 }}>
        <Text c="dimmed">
          No hay organización seleccionada. Intenta recargar o selecciona una.
        </Text>
      </Stack>
    );
  }
  const orgId: string = organization._id;

  // Payloads
  const buildMultiplePayload = (): CreateMultipleReservationsPayload => {
    const block = times as MultiServiceBlockSelection;
    return {
      services: block.intervals.map((iv) => ({
        serviceId: iv.serviceId,
        employeeId: iv.employeeId ?? null,
      })),
      startDate: block.startTime ?? block.intervals[0].from,
      customerDetails,
      organizationId: orgId,
    } satisfies CreateMultipleReservationsPayload;
  };

  const buildSingles = (): CreateReservationPayload[] => {
    const arr = times as ServiceTimeSelection[];

    return arr.map((t) => {
      const sid = getId(t.serviceId) ?? (t as any).serviceId; // id seguro
      // Busca la fecha por id normalizado
      const d = dates.find(
        (x) => (getId(x.serviceId) ?? (x as any).serviceId) === sid
      );
      const svc = services.find((s) => s._id === sid);

      if (!d?.date)
        throw new Error(`Falta fecha para el servicio "${svc?.name ?? sid}"`);
      if (!t.time)
        throw new Error(`Falta hora para el servicio "${svc?.name ?? sid}"`);

      const start = buildStartFrom(d.date, t.time);

      return {
        serviceId: sid,
        employeeId: d.employeeId ?? null,
        startDate: start.toISOString(), // ISO para evitar problemas de TZ/serialización
        customerDetails,
        organizationId: orgId,
        status: "pending",
      } satisfies CreateReservationPayload;
    });
  };

  const handleSchedule = async () => {
    if (completed || submitting) return; // evita doble envío post-finish
    try {
      setSubmitting(true);

      if (!hasCustomerData) {
        setCurrentStep(3);
        return;
      }

      let count = 0;
      let firstDateText = "";

      if (!splitDates) {
        const payload = buildMultiplePayload();
        await createMultipleReservations(payload);
        count = (times as MultiServiceBlockSelection).intervals.length;
        const start =
          (times as MultiServiceBlockSelection).startTime ??
          (times as MultiServiceBlockSelection).intervals[0]?.from;
        if (start) firstDateText = dayjs(start).format("DD/MM/YYYY HH:mm");
      } else {
        const singles = buildSingles();
        for (const p of singles) {
          await createReservation(p);
        }
        count = singles.length;
        firstDateText = dayjs(singles[0].startDate).format("DD/MM/YYYY HH:mm");
      }

      setFinishInfo({
        count,
        customer: customerDetails.name || "Cliente",
        dateText: firstDateText,
      });

      setCompleted(true);
      setCurrentStep(5); // Paso “Finish”
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setSelected([]);
    setDates([]);
    setTimes([]);
    setCustomerDetails({ name: "", email: "", phone: "", birthDate: null });
    setFinishInfo(null);
    setCompleted(false);
    setCurrentStep(0);
  };

  if (loading) {
    return <CustomLoader loadingText="Cargando servicios y empleados" />;
  }

  const NextBtn = (props: any) => <Button fullWidth={isMobile} {...props} />;
  const BackBtn = (props: any) => (
    <Button variant="default" fullWidth={isMobile} {...props} />
  );

  // ======= Header y contenido compactos en móvil =======
  const steps = [
    { key: 0, label: "Servicios y Empleados" },
    { key: 1, label: "Fechas" },
    { key: 2, label: "Horarios" },
    { key: 3, label: "Tus datos" },
    { key: 4, label: "Resumen" },
    { key: 5, label: "Finish" },
  ];
  const totalSteps = 5; // 0..4 son pasos, el 5 es Completed
  const progressValue = Math.min((currentStep / totalSteps) * 100, 100);

  function renderStepContent(step: number) {
    switch (step) {
      case 0:
        return (
          <StepMultiServiceEmployee
            services={services}
            employees={employees}
            value={selected}
            onChange={setSelected}
            employeeRequired={
              organization?.reservationPolicy === "auto_if_available"
            }
          />
        );
      case 1:
        return (
          <StepMultiServiceDate
            selectedServices={selected}
            services={services}
            value={dates}
            onChange={setDates}
          />
        );
      case 2:
        return (
          <StepMultiServiceTime
            organizationId={orgId}
            selectedServices={selected}
            services={services}
            employees={employees}
            dates={dates}
            value={times}
            onChange={setTimes}
          />
        );
      case 3:
        return (
          <StepCustomerData
            bookingData={
              { customerDetails, organizationId: orgId } as Partial<Reservation>
            }
            setBookingData={(updater) => {
              const base: Partial<Reservation> = {
                customerDetails,
                organizationId: orgId,
              };
              const next =
                typeof updater === "function"
                  ? (updater as any)(base)
                  : updater;
              if (next?.customerDetails) {
                setCustomerDetails(
                  next.customerDetails as typeof customerDetails
                );
              }
            }}
          />
        );
      case 4:
        return (
          <StepMultiServiceSummary
            splitDates={splitDates}
            services={services}
            employees={employees}
            dates={dates}
            times={times}
          />
        );
      default:
        return null;
    }
  }

  return (
    <Card
      withBorder
      radius="md"
      p={isMobile ? "md" : "xl"}
      style={{ position: "relative" }}
    >
      <LoadingOverlay visible={submitting} zIndex={1000} />
      <div ref={contentTopRef} />

      <Stack gap={isMobile ? "md" : "xl"}>
        {/* ======= HEADER / STEPPER ======= */}
        {!isMobile ? (
          // Desktop: Stepper compacto (sin contenido dentro)
          <Stepper
            active={currentStep}
            onStepClick={(i) => {
              if (completed) return;
              setCurrentStep(i);
            }}
            orientation="horizontal"
            size="sm"
            iconSize={26}
            allowNextStepsSelect={false}
          >
            {steps.slice(0, 5).map((s) => (
              <Stepper.Step key={s.key} label={s.label} />
            ))}
            <Stepper.Completed>Finish</Stepper.Completed>
          </Stepper>
        ) : (
          // Mobile: Header compacto con barra de progreso
          <Paper
            withBorder
            p="sm"
            radius="md"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 9,
              background: "var(--mantine-color-body)",
            }}
          >
            <Group justify="space-between" align="center">
              <Text size="sm" fw={600}>
                {currentStep < 5 ? steps[currentStep].label : "¡Completado!"}
              </Text>
              <Text size="xs" c="dimmed">
                Paso {Math.min(currentStep + 1, 5)} de 5
              </Text>
            </Group>
            <Divider my={6} />
            <div
              style={{
                height: 6,
                borderRadius: 9999,
                overflow: "hidden",
                background: "var(--mantine-color-gray-2)",
              }}
            >
              <div
                style={{
                  width: `${progressValue}%`,
                  height: "100%",
                  background: "var(--mantine-color-green-6)",
                  transition: "width 160ms ease",
                }}
              />
            </div>
          </Paper>
        )}

        {/* ======= STEP CONTENT ======= */}
        {currentStep < 5 ? (
          <Stack gap={isMobile ? "md" : "xl"}>
            {renderStepContent(currentStep)}
          </Stack>
        ) : (
          // Finish
          <Stack>
            <Center mb="sm">
              <Badge color="green" size="lg" radius="md" variant="filled">
                ¡Reservas creadas!
              </Badge>
            </Center>
            <Title order={3} ta="center" mb="xs">
              Todo listo, {finishInfo?.customer ?? "Cliente"} 🎉
            </Title>
            <Text ta="center" c="dimmed" mb="md">
              {finishInfo?.count ?? 0}{" "}
              {finishInfo?.count === 1 ? "reserva" : "reservas"} programada
              {finishInfo && finishInfo.count !== 1 ? "s" : ""} desde{" "}
              {finishInfo?.dateText ?? "—"}.
            </Text>
            <Divider my="md" />

            {/* Deposit Alert - Mostrar solo si hay reservas y está habilitado */}
            {finishInfo && dates.length > 0 && (
              <ReservationDepositAlert
                clientName={customerDetails.name}
                serviceName={
                  dates.length === 1
                    ? services.find((s) => s._id === dates[0].serviceId)
                        ?.name || "Múltiples servicios"
                    : "Múltiples servicios"
                }
                servicePrice={dates.reduce((total, date) => {
                  const service = services.find(
                    (s) => s._id === date.serviceId
                  );
                  return total + (service?.price || 0);
                }, 0)}
                appointmentTime={dates[0]?.date ? dayjs(dates[0].date).format("DD/MM/YYYY") : ""}
                appointmentDate={
                  (() => {
                    const value = Array.isArray(times) && times.length > 0
                      ? times[0].time
                      : typeof times === "object" && "startTime" in times
                      ? times.startTime
                      : "";
                    return value instanceof Date ? dayjs(value).format("HH:mm") : value || undefined;
                  })()
                }
              />
            )}

            <Group
              justify={isMobile ? "stretch" : "center"}
              gap="sm"
              wrap="wrap"
              mt="md"
            >
              <Button fullWidth={isMobile} onClick={handleNewBooking}>
                Nueva reserva
              </Button>
            </Group>
          </Stack>
        )}

        {/* Acciones desktop */}
        {!isMobile && currentStep < 5 && !completed && (
          <Group justify="flex-end" wrap="wrap" gap="sm">
            {currentStep > 0 && (
              <BackBtn onClick={() => setCurrentStep((s) => s - 1)}>
                Atrás
              </BackBtn>
            )}

            {currentStep === 0 && (
              <NextBtn
                disabled={!canGoNextFromStep0}
                onClick={() => setCurrentStep(1)}
              >
                Siguiente
              </NextBtn>
            )}

            {currentStep === 1 && (
              <NextBtn
                disabled={!canGoNextFromStep1}
                onClick={() => setCurrentStep(2)}
              >
                Siguiente
              </NextBtn>
            )}

            {currentStep === 2 && (
              <NextBtn
                disabled={!hasChosenTimes}
                onClick={() => setCurrentStep(3)}
              >
                Continuar
              </NextBtn>
            )}

            {currentStep === 3 && (
              <NextBtn
                disabled={!hasCustomerData}
                onClick={() => setCurrentStep(4)}
              >
                Continuar
              </NextBtn>
            )}

            {currentStep === 4 && (
              <Button loading={submitting} onClick={handleSchedule}>
                Reservar
              </Button>
            )}
          </Group>
        )}

        {/* Acciones mobile sticky */}
        {isMobile && currentStep < 5 && !completed && (
          <Paper
            withBorder
            radius="md"
            p="sm"
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 10,
              background: "var(--mantine-color-body)",
            }}
          >
            <Stack gap="sm">
              {currentStep > 0 && (
                <BackBtn onClick={() => setCurrentStep((s) => s - 1)}>
                  Atrás
                </BackBtn>
              )}

              {currentStep === 0 && (
                <NextBtn
                  disabled={!canGoNextFromStep0}
                  onClick={() => setCurrentStep(1)}
                >
                  Siguiente
                </NextBtn>
              )}

              {currentStep === 1 && (
                <NextBtn
                  disabled={!canGoNextFromStep1}
                  onClick={() => setCurrentStep(2)}
                >
                  Siguiente
                </NextBtn>
              )}

              {currentStep === 2 && (
                <NextBtn
                  disabled={!hasChosenTimes}
                  onClick={() => setCurrentStep(3)}
                >
                  Continuar
                </NextBtn>
              )}

              {currentStep === 3 && (
                <NextBtn
                  disabled={!hasCustomerData}
                  onClick={() => setCurrentStep(4)}
                >
                  Continuar
                </NextBtn>
              )}

              {currentStep === 4 && (
                <Button fullWidth loading={submitting} onClick={handleSchedule}>
                  Reservar
                </Button>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Card>
  );
}
