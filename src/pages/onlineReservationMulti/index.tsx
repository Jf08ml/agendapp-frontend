/* eslint-disable @typescript-eslint/no-explicit-any */
// Reserva en línea (rediseño, mockup ReservaMovil): 4 pasos —Servicio, Fecha y
// hora, Tus datos, Listo— con una barra fija de resumen que lleva el único
// botón principal. Entra directo al paso de servicios; el chat con IA queda
// como enlace («Prefiero reservar por chat»). Si el negocio solo tiene la IA
// activa, se entra directo al chat. Los endpoints y los payloads no cambian.
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import BookingChatPanel from "./BookingChatPanel";
import ServicePicker from "./ServicePicker";
import EmployeeAvatarPicker from "./EmployeeAvatarPicker";
import { missingRequiredEmployee } from "./bookingUtilsMulti";
import StepMultiServiceDate from "./StepMultiServiceDate";
import StepMultiServiceTime from "./StepMultiServiceTime";
import StepMultiServiceSummary from "./StepMultiServiceSummary";
import StepHeading from "./StepHeading";
import StepCustomerData from "./StepCustomerData";
import { Service, getServicesByOrganizationId } from "../../services/serviceService";
import { Employee, getEmployeesByOrganizationId } from "../../services/employeeService";
import {
  SelectedService,
  ServiceWithDate,
  MultiServiceBlockSelection,
} from "../../types/multiBooking";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Box, Button, LoadingOverlay } from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconChevronLeft,
  IconClock,
  IconMessageChatbot,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import {
  createMultipleReservations,
  createReservationCheckout,
  isSlotTakenError,
  type CreateMultipleReservationsPayload,
  type Reservation,
} from "../../services/reservationService";
import {
  createReceiptReservationCheckout,
  type ReservationReceiptPayload,
} from "../../services/collectionService";
import type { RecurrencePattern, SeriesPreview } from "../../services/appointmentService";
import dayjs from "dayjs";
import { formatTimeFromISO, getTimeFormatStr, toSpanishMeridiem } from "../../utils/timeFormatUtils";
import { formatCurrency } from "../../utils/formatCurrency";
import CustomLoader from "../../components/customLoader/CustomLoader";
import { ReservationDepositAlert } from "../../components/ReservationDepositAlert";
import { MpDepositNotice } from "../../components/MpDepositNotice";
import { computeDepositTotal, uniformDepositPercentage } from "../../utils/deposit";
import { trackReservationConversion } from "../../utils/orgGoogleTags";

type BookingMode = "chat" | "manual";

const STEPS = ["Servicio", "Fecha y hora", "Tus datos", "Listo"] as const;
const FINISH_STEP = 3;

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "3 h", "1 h 30 min", "45 min" */
function formatDuration(totalMin: number): string {
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function MultiBookingWizard() {
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Sub-interruptores de enableOnlineBooking (default true si la org aún no
  // cargó o el campo no vino). Con la reserva manual activa se entra directo a
  // los servicios; solo con la IA activa, directo al chat.
  const aiEnabled = organization?.enableAiBooking !== false;
  const manualEnabled = organization?.enableManualBooking !== false;
  const onlyAiEnabled = aiEnabled && !manualEnabled;

  const [mode, setMode] = useState<BookingMode>(() => (onlyAiEnabled ? "chat" : "manual"));

  // Si `organization` todavía no había cargado en el primer render, corrige
  // apenas se sepa que solo está la IA.
  useEffect(() => {
    if (onlyAiEnabled) setMode("chat");
  }, [onlyAiEnabled]);

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Paso actual (0..2) + Listo (3)
  const [currentStep, setCurrentStep] = useState(0);

  // Paso 1: servicios (el profesional se elige en el paso 2)
  const [selected, setSelected] = useState<SelectedService[]>([]);
  // Paso 2: fecha + horario
  const [dates, setDates] = useState<ServiceWithDate[]>([]);
  const [times, setTimes] = useState<MultiServiceBlockSelection | null>(null);
  // Error al confirmar (p. ej. el horario se ocupó segundos antes: SLOT_TAKEN)
  const [submitError, setSubmitError] = useState<{ message: string; slotTaken: boolean } | null>(null);
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

  // Datos para la pantalla final
  const [finishInfo, setFinishInfo] = useState<{
    count: number;
    customer: string;
    dateText: string;
    reservationIds: string[];
    /** Todas aprobadas al crear (agendamiento automático con cupo) */
    confirmed: boolean;
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
        // Sin los profesionales ocultos de la reserva en línea (siguen en la agenda interna)
        setEmployees(employeesData.filter((e) => e.onlineBookingEnabled !== false));
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

  // Al elegir un horario nuevo, el aviso de "horario ocupado" ya no aplica
  useEffect(() => {
    if (times) setSubmitError((e) => (e?.slotTaken ? null : e));
  }, [times]);

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
  const employeeMissing = missingRequiredEmployee(selected, employees, employeeRequired);

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
      <div className="ag-empty">
        <p>No hay organización seleccionada. Intenta recargar la página.</p>
      </div>
    );
  }
  const orgId: string = organization._id;
  const currency = organization.currency;

  // Servicios elegidos con su ficha completa (en el orden elegido)
  const selectedServiceDocs = selected
    .map((s) => services.find((svc) => svc._id === s.serviceId))
    .filter((s): s is Service => !!s);
  const totalMin = selectedServiceDocs.reduce((acc, s) => acc + (s.duration ?? 0), 0);
  const anyHidePrice = selectedServiceDocs.some((s) => s.hidePrice);
  const totalPrice = selectedServiceDocs.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  const totalLabel = !anyHidePrice && totalPrice > 0 ? formatCurrency(totalPrice, currency) : null;

  // Abono (misma regla de siempre)
  const depositServices = dates
    .map((date) => services.find((s) => s._id === date.serviceId))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const depositTotal = computeDepositTotal(organization, depositServices);
  const depositConfigured =
    !clientPackageId && depositTotal > 0 && recurrencePattern.type !== "weekly";
  const hasMp = !!organization?.mpCollect?.connected;
  const hasReceipt = (organization?.paymentMethods?.length ?? 0) > 0;
  const prefersReceipt = organization?.depositPreferredMethod === "receipt";
  // Si prefiere transferencia y la tiene, va por comprobante (aunque MP esté
  // conectado). Si no, MP cuando esté disponible; si no, comprobante.
  const useReceipt = depositConfigured && hasReceipt && (prefersReceipt || !hasMp);
  const useMp = depositConfigured && hasMp && !useReceipt;
  const depositActive = useMp || useReceipt;

  // Hora elegida, sin conversión de zona horaria
  const tf = organization?.timeFormat;
  // Web pública: «2:00 p. m.» (respeta 12 h / 24 h del negocio)
  const startTimeText = toSpanishMeridiem((() => {
    if (!times) return "";
    if ((times as any).startTimeStr) return formatTimeFromISO((times as any).startTimeStr, tf);
    const start = times.startTime ?? times.intervals[0]?.from;
    return start ? dayjs(start).format(getTimeFormatStr(tf)) : "";
  })());
  const endTimeText = toSpanishMeridiem((() => {
    const last = times?.intervals[times.intervals.length - 1];
    if (!last) return "";
    if (last.endStr) return formatTimeFromISO(last.endStr, tf);
    return dayjs(last.to).format(getTimeFormatStr(tf));
  })());

  // Payloads
  const buildMultiplePayload = (): CreateMultipleReservationsPayload => {
    const block = times as MultiServiceBlockSelection;

    // Usar el string original si existe, evita conversiones de timezone
    let startDateStr: string;
    if ((block as any).startTimeStr) {
      startDateStr = (block as any).startTimeStr;
    } else {
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
      setSubmitError(null);

      if (!hasCustomerData) {
        setCurrentStep(2);
        return;
      }

      // 🔄 Actualizar cliente si existe
      if (updateClientRef.current) {
        await updateClientRef.current();
      }

      const payload = buildMultiplePayload();

      // 💳 Pay-to-confirm: si la org exige abono, se cobra antes de crear la
      // reserva (no aplica a series recurrentes).
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

      const created: Reservation[] = Array.isArray(result) ? result : [];
      const reservationIds = created
        .map((r) => r._id)
        .filter((id): id is string => !!id);
      const confirmed =
        created.length > 0 &&
        created.every((r) => r.status === "approved" || r.status === "auto_approved");

      const servicesPerOccurrence = (times as MultiServiceBlockSelection).intervals.length;
      const isRecurring = recurrencePattern.type === 'weekly';
      const occurrenceCount = isRecurring && seriesPreview ? seriesPreview.availableCount : 1;
      const count = servicesPerOccurrence * occurrenceCount;
      const start =
        (times as MultiServiceBlockSelection).startTime ??
        (times as MultiServiceBlockSelection).intervals[0]?.from;
      const firstDateText = start ? `${dayjs(start).format("DD/MM/YYYY")} ${startTimeText}` : "";

      setFinishInfo({
        count,
        customer: customerDetails.name || "Cliente",
        dateText: firstDateText,
        reservationIds,
        confirmed,
      });

      setCompleted(true);
      setCurrentStep(FINISH_STEP);
    } catch (err) {
      if (isSlotTakenError(err)) {
        // Otra persona tomó el horario segundos antes: volver a elegir hora
        // (al montar, el paso de horarios recarga la disponibilidad).
        setTimes(null);
        setCurrentStep(1);
        setSubmitError({ message: "Ese horario ya se ocupó. Elige otro.", slotTaken: true });
      } else {
        setSubmitError({
          message: (err as Error)?.message || "No se pudo crear la reserva. Intenta de nuevo.",
          slotTaken: false,
        });
      }
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

  // Altura disponible = 100dvh - header - footer del shell
  const FULL_H = "calc(100dvh - var(--app-shell-header-offset, 0px) - var(--app-shell-footer-offset, 0px))";

  if (mode === "chat") {
    const preselectedService = preselectedServiceId
      ? services.find((s) => s._id === preselectedServiceId)
      : undefined;
    return (
      <Box
        style={{
          overflow: "hidden",
          height: FULL_H,
          display: "flex",
          flexDirection: "column",
          maxWidth: isMobile ? undefined : "var(--form-max)",
          margin: "0 auto",
          border: isMobile ? undefined : "1px solid var(--line)",
          borderRadius: isMobile ? undefined : "var(--radius-lg)",
        }}
      >
        <BookingChatPanel
          // Volver a la reserva paso a paso (si está activa)
          onBack={onlyAiEnabled ? undefined : () => setMode("manual")}
          preselectedService={preselectedService}
        />
      </Box>
    );
  }

  if (loading) {
    return <CustomLoader loadingText="Cargando servicios y profesionales" />;
  }

  const dateLong = dates[0]?.date ? capitalize(dayjs(dates[0].date).format("dddd D [de] MMMM")) : "";
  const dateShort = dates[0]?.date
    ? capitalize(dayjs(dates[0].date).format("ddd D MMM").replace(/\./g, ""))
    : "";
  const servicesCountText = `${selected.length} ${selected.length === 1 ? "servicio" : "servicios"}`;

  // ======= Barra fija de resumen: el único botón principal de cada paso =======
  const summary = (() => {
    if (currentStep === 0) {
      return {
        title: selected.length ? [servicesCountText, totalLabel].filter(Boolean).join(" · ") : "Elige uno o más servicios",
        sub: selected.length ? `${formatDuration(totalMin)} en total` : "Puedes elegir más de uno",
        action: "Continuar",
        disabled: selected.length === 0,
        onClick: () => setCurrentStep(1),
      };
    }
    if (currentStep === 1) {
      return {
        title: hasChosenTimes ? `${dateShort} · ${startTimeText}` : employeeMissing ? "Elige con quién" : "Elige día y hora",
        sub: [servicesCountText, totalLabel].filter(Boolean).join(" · "),
        action: "Continuar",
        disabled: !hasChosenTimes || employeeMissing,
        onClick: () => setCurrentStep(2),
      };
    }
    const depositLabel = depositActive && !anyHidePrice ? formatCurrency(depositTotal, currency) : null;
    return {
      title: clientPackageId ? "Incluido en tu paquete" : totalLabel ? `Total ${totalLabel}` : servicesCountText,
      sub: depositActive
        ? depositLabel ? `Abono hoy ${depositLabel}` : "Abono para confirmar"
        : `${dateShort} · ${startTimeText}`,
      action: depositActive ? "Pagar abono" : "Confirmar reserva",
      disabled: !hasCustomerData,
      onClick: handleSchedule,
    };
  })();

  // Servicios y profesionales para la pantalla final
  const assignedNames = Array.from(
    new Set(
      (times?.intervals ?? [])
        .map((iv) => employees.find((e) => e._id === iv.employeeId)?.names)
        .filter((n): n is string => !!n)
    )
  );

  function renderStepContent(step: number) {
    switch (step) {
      case 0:
        return (
          <>
            <StepHeading title="¿Qué servicio quieres?" />
            <ServicePicker services={services} value={selected} onChange={setSelected} currency={currency} />
            {aiEnabled && (
              <button
                type="button"
                className="ag-link"
                onClick={() => setMode("chat")}
                style={{
                  alignSelf: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: "var(--space-2)",
                }}
              >
                <IconMessageChatbot size={16} stroke={1.75} />
                Prefiero reservar por chat
              </button>
            )}
          </>
        );
      case 1:
        return (
          <>
            <StepHeading title="¿Con quién y cuándo?" />
            <EmployeeAvatarPicker
              services={services}
              employees={employees}
              value={selected}
              onChange={setSelected}
              employeeRequired={employeeRequired}
            />
            {employeeMissing ? (
              <div className="ag-alert ag-alert--info">
                <IconAlertCircle size={20} stroke={1.75} />
                <div>Elige un profesional para ver los días y las horas libres.</div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </>
        );
      case 2: {
        const depositPct = uniformDepositPercentage(organization, depositServices);
        return (
          <>
            <StepHeading title="Tus datos" />
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
                  setCustomerDetails(next.customerDetails as typeof customerDetails);
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

            {depositActive && (
              <MpDepositNotice
                percentage={depositPct}
                currency={organization?.currency ?? "COP"}
                amount={anyHidePrice ? undefined : depositTotal}
                objectLabel="tu reserva"
                paymentWindowMinutes={useMp ? 15 : 60}
              />
            )}
          </>
        );
      }
      default:
        return null;
    }
  }

  // ======= Listo =======
  if (currentStep === FINISH_STEP) {
    const isRecurring = recurrencePattern.type === "weekly" && !!seriesPreview;
    const confirmed = !!finishInfo?.confirmed;
    return (
      <Box maw="var(--form-max)" mx="auto" px="md" py="xl">
        <div className="ag-stack" style={{ alignItems: "center", textAlign: "center", gap: "var(--space-4)" }}>
          <span
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: confirmed ? "var(--success-soft)" : "var(--info-soft)",
              color: confirmed ? "var(--success)" : "var(--info)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {confirmed ? <IconCheck size={32} stroke={2} /> : <IconClock size={32} stroke={1.75} />}
          </span>
          <h1 className="ag-h-step">{confirmed ? "Tu cita está confirmada" : "Recibimos tu reserva"}</h1>
          <p className="ag-muted" style={{ margin: 0 }}>
            {confirmed
              ? isRecurring
                ? `${seriesPreview!.availableCount} citas programadas, ${finishInfo?.customer ?? ""}.`
                : `Te esperamos, ${finishInfo?.customer ?? ""}.`
              : "El negocio la revisará y te confirmará pronto."}
          </p>

          <div className="ag-card" style={{ width: "100%", textAlign: "left", padding: "var(--space-4)" }}>
            <dl className="ag-kv" style={{ gridTemplateColumns: "96px 1fr", margin: 0 }}>
              <dt>Fecha</dt>
              <dd><b>{dateLong || finishInfo?.dateText}</b></dd>
              <dt>Hora</dt>
              <dd className="ag-num">{endTimeText ? `${startTimeText} – ${endTimeText}` : startTimeText}</dd>
              {isRecurring && (
                <>
                  <dt>Se repite</dt>
                  <dd>{seriesPreview!.availableCount} citas, cada semana</dd>
                </>
              )}
              <dt>{selectedServiceDocs.length === 1 ? "Servicio" : "Servicios"}</dt>
              <dd>
                {selectedServiceDocs.map((s) => (
                  <div key={s._id}>{s.name}</div>
                ))}
              </dd>
              {assignedNames.length > 0 && (
                <>
                  <dt>Con</dt>
                  <dd>{assignedNames.join(", ")}</dd>
                </>
              )}
              {organization.address && (
                <>
                  <dt>Dirección</dt>
                  <dd>{organization.address}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Abono manual (negocios sin pago en línea): mismo aviso de siempre */}
          {!clientPackageId &&
            finishInfo &&
            dates.length > 0 &&
            finishInfo.reservationIds.length > 0 && (
              <Box w="100%" ta="left">
                <ReservationDepositAlert
                  reservationId={finishInfo.reservationIds[0]}
                  clientName={customerDetails.name}
                  serviceName={
                    dates.length === 1
                      ? services.find((s) => s._id === dates[0].serviceId)?.name || "Múltiples servicios"
                      : "Múltiples servicios"
                  }
                  servicePrice={dates.reduce((total, date) => {
                    const service = services.find((s) => s._id === date.serviceId);
                    return total + (service?.price || 0);
                  }, 0)}
                  depositAmount={depositTotal}
                  depositPercentage={uniformDepositPercentage(organization, depositServices)}
                  hidePrice={anyHidePrice}
                  appointmentDate={dates[0]?.date ? dayjs(dates[0].date).format("DD/MM/YYYY") : ""}
                  appointmentTime={startTimeText || undefined}
                />
              </Box>
            )}

          <Button component={Link} to="/mis-reservas" variant="default" size="lg" fullWidth>
            Ver mis reservas
          </Button>
          <button type="button" className="ag-link" onClick={handleNewBooking} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 14 }}>
            Hacer otra reserva
          </button>
          <Link className="ag-link" to="/" style={{ fontSize: 14 }}>
            Volver al inicio
          </Link>
        </div>
      </Box>
    );
  }

  return (
    <Box
      pos="relative"
      maw="var(--form-max)"
      mx="auto"
      style={{ minHeight: FULL_H, display: "flex", flexDirection: "column" }}
    >
      <LoadingOverlay visible={submitting} zIndex={1000} />
      <div ref={contentTopRef} />

      <div
        className="ag-stack"
        style={{ flex: 1, gap: "var(--space-4)", padding: "var(--space-4) var(--space-4) var(--space-5)" }}
      >
        {currentStep > 0 && (
          <button
            type="button"
            className="ag-btn ag-btn--subtle ag-btn--sm"
            onClick={() => setCurrentStep((s) => s - 1)}
            style={{ alignSelf: "flex-start", marginLeft: -12, paddingLeft: 8 }}
          >
            <IconChevronLeft size={16} /> Atrás
          </button>
        )}
        {/* Stepper de 4 pasos (ag-stepper) */}
        <div className="ag-stepper" aria-label={`Paso ${currentStep + 1} de ${STEPS.length}`}>
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`ag-step${i < currentStep ? " ag-step--done" : ""}${i === currentStep ? " ag-step--current" : ""}`}
              aria-current={i === currentStep ? "step" : undefined}
            >
              {label}
            </span>
          ))}
        </div>

        {submitError && (
          <div className={`ag-alert ${submitError.slotTaken ? "ag-alert--warning" : "ag-alert--danger"}`} role="alert">
            <IconAlertCircle size={20} stroke={1.75} />
            <div style={{ flex: 1 }}>{submitError.message}</div>
          </div>
        )}

        {renderStepContent(currentStep)}
      </div>

      {/* Barra fija de resumen (ag-summary) con el único botón principal */}
      <div
        className="ag-summary"
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 5,
          paddingBottom: "calc(var(--space-3) + env(safe-area-inset-bottom))",
          borderRadius: isMobile ? 0 : "var(--radius-lg) var(--radius-lg) 0 0",
        }}
      >
        <div className="ag-summary__text">
          <div className="ag-summary__title ag-num" style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary.title}
          </div>
          <div className="ag-summary__sub ag-num" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary.sub}
          </div>
        </div>
        <Button
          size="lg"
          h={48}
          px={isMobile ? 16 : 24}
          style={{ flex: "none" }}
          disabled={summary.disabled}
          loading={submitting && currentStep === 2}
          onClick={summary.onClick}
        >
          {summary.action}
        </Button>
      </div>
    </Box>
  );
}
