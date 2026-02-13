/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
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
  createMultipleReservations,
  type CreateMultipleReservationsPayload,
  type Reservation,
} from "../../services/reservationService";
import dayjs from "dayjs";
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
  const [times, setTimes] = useState<MultiServiceBlockSelection | null>(null);
  // Paso 4: datos cliente
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: null as Date | null,
  });

  const [submitting, setSubmitting] = useState(false);

  // Ref para guardar la función de actualización del cliente
  const updateClientRef = useRef<(() => Promise<boolean>) | null>(null);
  // Paquete de sesiones detectado
  const [clientPackageId, setClientPackageId] = useState<string | null>(null);

  // Datos para la pantalla de éxito
  const [finishInfo, setFinishInfo] = useState<{
    count: number;
    customer: string;
    dateText: string;
    reservationIds: string[];
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
    setTimes(null);
  }, [selected]);

  useEffect(() => {
    setTimes(null);
  }, [dates]);

  // Scroll al top al cambiar de paso
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [currentStep]);

  // Validaciones para navegación
  const canGoNextFromStep0 = selected.length > 0;

  const canGoNextFromStep1 = (() => {
    if (selected.length === 0) return false;
    if (dates.length === 0) return false;
    return !!dates[0]?.date;
  })();

  const hasChosenTimes = (() => {
    if (!times) return false;
    return (
      !!times.startTime &&
      Array.isArray(times.intervals) &&
      times.intervals.length > 0
    );
  })();

  const hasCustomerData = (() => {
    const hasName = customerDetails.name.trim().length > 0;
    const hasPhone = customerDetails.phone.trim().length >= 7;
    return hasName && hasPhone;
  })();

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
    
    // 🔧 FIX: Usar el string original si existe, evita conversiones de timezone
    let startDateStr: string;
    if ((block as any).startTimeStr) {
      // Tenemos el string original del backend, úsalo directamente
      startDateStr = (block as any).startTimeStr;
    } else {
      // Fallback: construir desde el Date (puede tener problemas de timezone)
      const startDateTime = block.startTime ?? block.intervals[0].from;
      startDateStr = dayjs(startDateTime).format("YYYY-MM-DDTHH:mm:ss");
    }

    return {
      services: block.intervals.map((iv) => ({
        serviceId: iv.serviceId,
        employeeId: iv.employeeId ?? null,
      })),
      startDate: startDateStr,
      customerDetails,
      organizationId: orgId,
      ...(clientPackageId ? { clientPackageId } : {}),
    } satisfies CreateMultipleReservationsPayload;
  };

  const handleSchedule = async () => {
    if (completed || submitting) return; // evita doble envío post-finish
    try {
      setSubmitting(true);

      if (!hasCustomerData) {
        setCurrentStep(3);
        return;
      }

      // 🔄 Actualizar cliente si existe (nuevo flujo)
      if (updateClientRef.current) {
        await updateClientRef.current();
      }

      const payload = buildMultiplePayload();
      const result = await createMultipleReservations(payload);

      let reservationIds: string[] = [];
      if (result && Array.isArray(result)) {
        reservationIds = result
          .map((r) => r._id)
          .filter((id): id is string => !!id);
      }

      const count = (times as MultiServiceBlockSelection).intervals.length;
      const start =
        (times as MultiServiceBlockSelection).startTime ??
        (times as MultiServiceBlockSelection).intervals[0]?.from;
      const firstDateText = start ? dayjs(start).format("DD/MM/YYYY HH:mm") : "";

      setFinishInfo({
        count,
        customer: customerDetails.name || "Cliente",
        dateText: firstDateText,
        reservationIds,
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
    setTimes(null);
    setCustomerDetails({ name: "", email: "", phone: "", birthDate: null });
    setFinishInfo(null);
    setCompleted(false);
    setClientPackageId(null);
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
            onClientUpdateReady={(updateFn) => {
              updateClientRef.current = updateFn;
            }}
            selectedServiceIds={selected.map((s) => s.serviceId)}
            onPackageDetected={(pkgId) => setClientPackageId(pkgId)}
          />
        );
      case 4:
        return (
          <StepMultiServiceSummary
            services={services}
            employees={employees}
            dates={dates}
            times={times}
            currency={organization?.currency}
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
            {finishInfo &&
              dates.length > 0 &&
              finishInfo.reservationIds.length > 0 && (
                <ReservationDepositAlert
                  reservationId={finishInfo.reservationIds[0]}
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
                  appointmentDate={
                    dates[0]?.date
                      ? dayjs(dates[0].date).format("DD/MM/YYYY")
                      : ""
                  }
                  appointmentTime={(() => {
                    if (!times?.startTime) return undefined;
                    return times.startTime instanceof Date
                      ? dayjs(times.startTime).format("HH:mm")
                      : String(times.startTime);
                  })()}
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
                onClick={() => {
                  setCurrentStep(4);
                }}
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
                  onClick={() => {
                    setCurrentStep(4);
                  }}
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
