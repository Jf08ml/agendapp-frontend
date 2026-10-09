/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BookingChoiceScreen from "./BookingChoiceScreen";
import BookingChatPanel from "./BookingChatPanel";
import StepMultiServiceEmployee from "./StepMultiServiceEmployee";
import StepMultiServiceDate from "./StepMultiServiceDate";
import StepMultiServiceTime from "./StepMultiServiceTime";
import StepMultiServiceSummary, { ConfirmationPhoneNote } from "./StepMultiServiceSummary";
import StepHeading from "./StepHeading";
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
  createReservationCheckout,
  type CreateMultipleReservationsPayload,
  type Reservation,
} from "../../services/reservationService";
import {
  createReceiptReservationCheckout,
  type ReservationReceiptPayload,
} from "../../services/collectionService";
import type { RecurrencePattern, SeriesPreview } from "../../services/appointmentService";
import dayjs from "dayjs";
import { formatTimeFromISO, getTimeFormatStr } from "../../utils/timeFormatUtils";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { ReservationDepositAlert } from "../../components/ReservationDepositAlert";
import { MpDepositNotice } from "../../components/MpDepositNotice";
import { computeDepositTotal, uniformDepositPercentage } from "../../utils/deposit";
import { trackReservationConversion } from "../../utils/orgGoogleTags";

type BookingMode = "choice" | "chat" | "manual";

export default function MultiBookingWizard() {
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Sub-interruptores de enableOnlineBooking (default true si la org aún no
  // cargó o el campo no vino — el backend siempre lo manda, pero una copia
  // offline vieja del org config podría no tenerlo). Con uno solo activo se
  // entra directo a ese flujo, sin pantalla de elección.
  const aiEnabled = organization?.enableAiBooking !== false;
  const manualEnabled = organization?.enableManualBooking !== false;
  const onlyAiEnabled = aiEnabled && !manualEnabled;
  const onlyManualEnabled = !aiEnabled && manualEnabled;

  const [mode, setMode] = useState<BookingMode>(() => {
    if (onlyAiEnabled) return "chat";
    if (onlyManualEnabled) return "manual";
    return "choice";
  });

  // Si `organization` todavía no había cargado en el primer render (el
  // inicializador de arriba solo corre una vez), corrige apenas se sepa que
  // solo hay un método disponible — evita quedar atascado en "choice".
  useEffect(() => {
    if (mode !== "choice") return;
    if (onlyAiEnabled) setMode("chat");
    else if (onlyManualEnabled) setMode("manual");
  }, [mode, onlyAiEnabled, onlyManualEnabled]);

  // Vuelve a la pantalla de elección, salvo que ya no tenga sentido mostrarla
  // (solo un método activo) — evita que "Volver" abra la elección con una
  // opción que el admin desactivó.
  const goToChoice = () => {
    if (onlyAiEnabled) return setMode("chat");
    if (onlyManualEnabled) return setMode("manual");
    setMode("choice");
  };

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Paso actual (0..2) + finish (3)
  const [currentStep, setCurrentStep] = useState(0);

  // Paso 1: selección servicios/profesionales
  const [selected, setSelected] = useState<SelectedService[]>([]);
  // Paso 2: fecha + horario
  const [dates, setDates] = useState<ServiceWithDate[]>([]);
  const [times, setTimes] = useState<MultiServiceBlockSelection | null>(null);
  // Paso 3: datos cliente + resumen
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: null as Date | null,
    documentId: "",
    notes: "",
  });
  // Valores de campos personalizados (Organization.clientFormConfig.fields)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  // 🔁 Recurrencia
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>({
    type: 'none', intervalWeeks: 1, weekdays: [], endType: 'count', count: 1,
  });
  const [seriesPreview, setSeriesPreview] = useState<SeriesPreview | null>(null);

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

  // Pre-selección de servicio vía query param ?serviceId=
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedServiceId = searchParams.get("serviceId");
  const preselectionApplied = useRef(false);

  useEffect(() => {
    if (loading || !preselectedServiceId || preselectionApplied.current) return;
    const service = services.find((s) => s._id === preselectedServiceId);
    if (service) {
      setSelected([{ serviceId: preselectedServiceId, employeeId: null }]);
      preselectionApplied.current = true;
    }
  }, [loading, preselectedServiceId, services]);

  // === Responsive helpers ===
  const isMobile = useMediaQuery("(max-width: 48rem)"); // ~768px
  const contentTopRef = useRef<HTMLDivElement | null>(null);
  // Sección de horas dentro del paso "Fecha y hora" (scroll al tocar un día)
  const timesRef = useRef<HTMLDivElement | null>(null);

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
    setRecurrencePattern({ type: 'none', intervalWeeks: 1, weekdays: [], endType: 'count', count: 1 });
    setSeriesPreview(null);
  }, [selected]);

  useEffect(() => {
    setTimes(null);
    setRecurrencePattern({ type: 'none', intervalWeeks: 1, weekdays: [], endType: 'count', count: 1 });
    setSeriesPreview(null);
  }, [dates]);

  // Scroll al top al cambiar de paso
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [currentStep]);

  const [termsAccepted, setTermsAccepted] = useState(false);

  // Validaciones para navegación
  // En agendamiento automático cada servicio necesita profesional
  const employeeRequired = organization?.reservationPolicy === "auto_if_available";
  const canGoNextFromStep0 =
    selected.length > 0 && (!employeeRequired || selected.every((s) => !!s.employeeId));

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
    const identifierField = organization?.clientFormConfig?.identifierField || 'phone';
    const termsOk = !organization?.termsAndConditions?.enabled || termsAccepted;
    if (identifierField === 'phone') return hasName && customerDetails.phone.trim().length >= 7 && termsOk;
    if (identifierField === 'email') return hasName && customerDetails.email.trim().length > 3 && termsOk;
    if (identifierField === 'documentId') return hasName && (customerDetails.documentId || "").trim().length > 0 && termsOk;
    return hasName && termsOk;
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
      ...(Object.keys(customFieldValues).length > 0 ? { customFieldValues } : {}),
      ...(clientPackageId ? { clientPackageId } : {}),
      ...(recurrencePattern.type === 'weekly' ? { recurrencePattern } : {}),
    } satisfies CreateMultipleReservationsPayload;
  };

  const handleSchedule = async () => {
    if (completed || submitting) return; // evita doble envío post-finish
    try {
      setSubmitting(true);

      if (!hasCustomerData) {
        setCurrentStep(2);
        return;
      }

      // 🔄 Actualizar cliente si existe (nuevo flujo)
      if (updateClientRef.current) {
        await updateClientRef.current();
      }

      const payload = buildMultiplePayload();

      // 💳 Pay-to-confirm: si la org exige depósito, cobramos antes de crear la
      // reserva. Preferimos Mercado Pago (automático); si no está conectado pero
      // hay métodos de transferencia, usamos el flujo de comprobante con IA.
      // (El depósito no aplica a series recurrentes en esta versión.)
      // El abono puede ser distinto por servicio (% o monto fijo): se decide con el total real.
      const depositServices = dates
        .map((date) => services.find((s) => s._id === date.serviceId))
        .filter((s): s is NonNullable<typeof s> => !!s);
      const depositConfigured =
        !clientPackageId &&
        computeDepositTotal(organization, depositServices) > 0 &&
        recurrencePattern.type !== "weekly";
      const hasMp = !!organization?.mpCollect?.connected;
      const hasReceipt = (organization?.paymentMethods?.length ?? 0) > 0;
      const prefersReceipt = organization?.depositPreferredMethod === "receipt";
      // Si prefiere transferencia y la tiene, va por comprobante (aunque MP esté
      // conectado). Si no, MP cuando esté disponible; si no, comprobante.
      const useReceipt = depositConfigured && hasReceipt && (prefersReceipt || !hasMp);
      const useMp = depositConfigured && hasMp && !useReceipt;

      if (useMp) {
        const checkout = await createReservationCheckout({ ...payload, source: "manual_booking" });
        if (checkout?.checkoutUrl) {
          window.location.href = checkout.checkoutUrl; // redirección al checkout de MP
          return;
        }
        // Si falló el checkout, no continuar creando la reserva sin pago.
        return;
      }

      if (useReceipt) {
        const checkout = await createReceiptReservationCheckout({
          ...payload,
          source: "manual_booking",
        } as unknown as ReservationReceiptPayload);
        if (checkout) {
          navigate("/pago/comprobante", {
            state: {
              externalReference: checkout.externalReference,
              amount: checkout.amount,
              currency: checkout.currency,
              paymentMethods: checkout.paymentMethods,
              orderType: "reservation",
            },
          });
          return;
        }
        // Si falló el checkout, no continuar creando la reserva sin pago.
        return;
      }

      const result = await createMultipleReservations({ ...payload, source: "manual_booking" });

      trackReservationConversion(organization?.analyticsConfig);

      let reservationIds: string[] = [];
      if (result && Array.isArray(result)) {
        reservationIds = result
          .map((r) => r._id)
          .filter((id): id is string => !!id);
      }

      const servicesPerOccurrence = (times as MultiServiceBlockSelection).intervals.length;
      const isRecurring = recurrencePattern.type === 'weekly';
      const occurrenceCount = isRecurring && seriesPreview ? seriesPreview.availableCount : 1;
      const count = servicesPerOccurrence * occurrenceCount;
      const start =
        (times as MultiServiceBlockSelection).startTime ??
        (times as MultiServiceBlockSelection).intervals[0]?.from;
      const tf = organization?.timeFormat;
      const timeStr = (times as any).startTimeStr
        ? formatTimeFromISO((times as any).startTimeStr, tf)
        : start
        ? dayjs(start).format(getTimeFormatStr(tf))
        : "";
      const firstDateText = start ? `${dayjs(start).format("DD/MM/YYYY")} ${timeStr}` : "";

      setFinishInfo({
        count,
        customer: customerDetails.name || "Cliente",
        dateText: firstDateText,
        reservationIds,
      });

      setCompleted(true);
      setCurrentStep(3); // Paso “Finish”
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setSelected([]);
    setDates([]);
    setTimes(null);
    setCustomerDetails({ name: "", email: "", phone: "", birthDate: null, documentId: "", notes: "" });
    setFinishInfo(null);
    setCompleted(false);
    setClientPackageId(null);
    setRecurrencePattern({ type: 'none', intervalWeeks: 1, weekdays: [], endType: 'count', count: 1 });
    setSeriesPreview(null);
    setCurrentStep(0);
  };

  // Altura disponible = 100dvh - header (50px) - footer (30px) - bordes/padding (~10px)
  const FULL_H = "calc(100dvh - 90px)";

  if (mode === "choice") {
    return (
      <Card withBorder radius="md" p={isMobile ? "md" : "xl"}
        style={{ minHeight: FULL_H, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BookingChoiceScreen
          onSelectAI={() => setMode("chat")}
          onSelectManual={() => setMode("manual")}
        />
      </Card>
    );
  }

  if (mode === "chat") {
    const preselectedService = preselectedServiceId
      ? services.find((s) => s._id === preselectedServiceId)
      : undefined;
    return (
      <Card withBorder radius="md" p={0}
        style={{ overflow: "hidden", height: FULL_H, display: "flex", flexDirection: "column" }}>
        <BookingChatPanel
          onBack={onlyAiEnabled ? undefined : goToChoice}
          preselectedService={preselectedService}
        />
      </Card>
    );
  }

  if (loading) {
    return <CustomLoader loadingText="Cargando servicios y profesionales" />;
  }

  const NextBtn = (props: any) => <Button fullWidth={isMobile} {...props} />;
  const BackBtn = (props: any) => (
    <Button variant="default" fullWidth={isMobile} {...props} />
  );

  // ======= Header y contenido compactos en móvil =======
  const steps = [
    { key: 0, label: "Servicio" },
    { key: 1, label: "Fecha y hora" },
    { key: 2, label: "Confirmar" },
  ];
  const totalSteps = steps.length; // 0..2 son pasos, el 3 es Completed
  const FINISH_STEP = totalSteps;

  function renderStepContent(step: number) {
    switch (step) {
      case 0:
        return (
          <StepMultiServiceEmployee
            services={services}
            employees={employees}
            value={selected}
            onChange={setSelected}
            employeeRequired={employeeRequired}
          />
        );
      case 1:
        return (
          <Stack gap="lg">
            <StepMultiServiceDate
              selectedServices={selected}
              services={services}
              value={dates}
              onChange={setDates}
              onDatePicked={() =>
                // Esperar a que se pinte la sección de horas antes de desplazar
                setTimeout(
                  () =>
                    timesRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    }),
                  50
                )
              }
            />
            {dates[0]?.date && <Divider />}
            <div ref={timesRef} style={{ scrollMarginTop: isMobile ? 60 : 16 }}>
              <StepMultiServiceTime
                organizationId={orgId}
                selectedServices={selected}
                services={services}
                employees={employees}
                dates={dates}
                value={times}
                onChange={setTimes}
                recurrencePattern={recurrencePattern}
                onRecurrenceChange={setRecurrencePattern}
                seriesPreview={seriesPreview}
                onSeriesPreviewChange={setSeriesPreview}
                timeFormat={organization?.timeFormat}
              />
            </div>
          </Stack>
        );
      case 2: {
        const depositServices = dates
          .map((date) => services.find((s) => s._id === date.serviceId))
          .filter((s): s is NonNullable<typeof s> => !!s);
        const depositTotal = computeDepositTotal(organization, depositServices);
        const depositPct = uniformDepositPercentage(organization, depositServices);
        const depositActive =
          !clientPackageId &&
          depositTotal > 0 &&
          (!!organization?.mpCollect?.connected ||
            (organization?.paymentMethods?.length ?? 0) > 0) &&
          recurrencePattern.type !== "weekly";
        const anyHidePrice = dates.some(
          (date) => services.find((s) => s._id === date.serviceId)?.hidePrice
        );
        return (
          <Stack gap="lg">
            <Stack gap="xs">
              <StepHeading title="Confirma tu cita" />
              <StepMultiServiceSummary
                services={services}
                employees={employees}
                dates={dates}
                times={times}
                currency={organization?.currency}
                recurrencePattern={recurrencePattern}
                seriesPreview={seriesPreview}
                timeFormat={organization?.timeFormat}
                usingPackage={!!clientPackageId}
                onEdit={() => setCurrentStep(1)}
              />
            </Stack>

            <Stack gap="sm">
              <StepHeading title="Tus datos" />
              <Paper withBorder radius="md" p={isMobile ? "sm" : "md"}>
                <StepCustomerData
                  bookingData={
                    { customerDetails, customFieldValues, organizationId: orgId } as Partial<Reservation>
                  }
                  setBookingData={(updater) => {
                    const base: Partial<Reservation> = {
                      customerDetails,
                      customFieldValues,
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
                    if (next?.customFieldValues) {
                      setCustomFieldValues(next.customFieldValues as Record<string, unknown>);
                    }
                  }}
                  onClientUpdateReady={(updateFn) => {
                    updateClientRef.current = updateFn;
                  }}
                  selectedServiceIds={selected.map((s) => s.serviceId)}
                  onPackageDetected={(pkgId) => setClientPackageId(pkgId)}
                  onTermsAcceptedChange={setTermsAccepted}
                />
              </Paper>
            </Stack>

            {(depositActive || customerDetails.phone) && (
              <Stack gap="sm">
                <ConfirmationPhoneNote phone={customerDetails.phone} />
                {depositActive && (
                  <MpDepositNotice
                    percentage={depositPct}
                    currency={organization?.currency ?? "COP"}
                    amount={anyHidePrice ? undefined : depositTotal}
                    objectLabel="tu reserva"
                  />
                )}
              </Stack>
            )}
          </Stack>
        );
      }
      default:
        return null;
    }
  }

  return (
    <Card
      withBorder
      radius="md"
      p={isMobile ? "sm" : "xl"}
      // overflow visible: el Card de Mantine trae overflow hidden, que rompe el
      // position: sticky de la barra de botones (abajo)
      style={{ position: "relative", minHeight: FULL_H, overflow: "visible" }}
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
            {steps.map((s) => (
              <Stepper.Step key={s.key} label={s.label} />
            ))}
            <Stepper.Completed>Finish</Stepper.Completed>
          </Stepper>
        ) : (
          // Mobile: progreso segmentado con el nombre de cada paso
          currentStep < FINISH_STEP && (
            <Group
              gap={6}
              wrap="nowrap"
              align="flex-start"
              py={6}
            >
              {steps.map((s) => {
                const reached = s.key <= currentStep;
                return (
                  <Stack key={s.key} gap={4} style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 9999,
                        background: reached
                          ? "var(--brand-text)"
                          : "var(--mantine-color-default-border)",
                        transition: "background 160ms ease",
                      }}
                    />
                    <Text
                      size="xs"
                      fw={s.key === currentStep ? 700 : 500}
                      c={s.key === currentStep ? undefined : "dimmed"}
                    >
                      {s.key + 1}. {s.label}
                    </Text>
                  </Stack>
                );
              })}
            </Group>
          )
        )}

        {/* ======= STEP CONTENT ======= */}
        {currentStep < FINISH_STEP ? (
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
              {recurrencePattern.type === 'weekly' && seriesPreview
                ? `${seriesPreview.availableCount} citas recurrentes programadas desde ${finishInfo?.dateText ?? "—"}.`
                : `${finishInfo?.count ?? 0} ${finishInfo?.count === 1 ? "reserva" : "reservas"} programada${finishInfo && finishInfo.count !== 1 ? "s" : ""} desde ${finishInfo?.dateText ?? "—"}.`
              }
            </Text>
            <Divider my="md" />

            {/* Deposit Alert - Mostrar solo si hay reservas, está habilitado y NO se pagó con un paquete */}
            {!clientPackageId &&
              finishInfo &&
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
                  depositAmount={(() => {
                    const depServices = dates
                      .map((date) => services.find((s) => s._id === date.serviceId))
                      .filter((s): s is NonNullable<typeof s> => !!s);
                    return computeDepositTotal(organization, depServices);
                  })()}
                  depositPercentage={uniformDepositPercentage(
                    organization,
                    dates
                      .map((date) => services.find((s) => s._id === date.serviceId))
                      .filter((s): s is NonNullable<typeof s> => !!s)
                  )}
                  hidePrice={dates.some(
                    (date) => services.find((s) => s._id === date.serviceId)?.hidePrice
                  )}
                  appointmentDate={
                    dates[0]?.date
                      ? dayjs(dates[0].date).format("DD/MM/YYYY")
                      : ""
                  }
                  appointmentTime={(() => {
                    const tf = organization?.timeFormat;
                    if ((times as any)?.startTimeStr)
                      return formatTimeFromISO((times as any).startTimeStr, tf);
                    if (!times?.startTime) return undefined;
                    return times.startTime instanceof Date
                      ? dayjs(times.startTime).format(getTimeFormatStr(tf))
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

        {/* Acciones fijas abajo (desktop alineadas a la derecha; móvil lado a lado) */}
        {currentStep < FINISH_STEP && !completed && (() => {
          const actions = (
            <Group
              justify={isMobile ? "stretch" : "flex-end"}
              wrap="nowrap"
              gap="sm"
              grow={isMobile}
            >
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
                  disabled={!hasChosenTimes}
                  onClick={() => setCurrentStep(2)}
                >
                  Continuar
                </NextBtn>
              )}

              {currentStep === 2 && (
                <NextBtn
                  disabled={!hasCustomerData}
                  loading={submitting}
                  onClick={handleSchedule}
                >
                  Reservar
                </NextBtn>
              )}
            </Group>
          );

          // Fija abajo (también en escritorio): con muchos horarios no hay que
          // bajar hasta el final para continuar
          return (
            <Paper
              withBorder
              radius="md"
              p="sm"
              style={{
                position: "sticky",
                // Pegada al borde inferior, por encima del footer del AppShell
                // (solo trae la versión): así ocupa el mínimo de pantalla
                bottom: 0,
                zIndex: "calc(var(--app-shell-footer-z-index, 100) + 1)",
                // Respeta la barra de inicio del iPhone
                paddingBottom: "calc(var(--mantine-spacing-sm) + env(safe-area-inset-bottom))",
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.08)",
                background: "var(--mantine-color-body)",
              }}
            >
              {actions}
            </Paper>
          );
        })()}
      </Stack>
    </Card>
  );
}
