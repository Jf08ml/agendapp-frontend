/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Stepper, Button, Switch } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { DEFAULT_CLIENT_FORM_CONFIG } from "../../../services/organizationService";

import {
  ClassType, ClassSession,
  getClassesByOrganization, getAvailableSessions, createPublicEnrollment,
} from "../../../services/classService";
import {
  checkClientClassPackagesByIdentifier,
  ClientPackage,
} from "../../../services/packageService";
import { createClassCheckout, createReceiptClassCheckout } from "../../../services/collectionService";
import { useNavigate, useSearchParams } from "react-router-dom";
import AddToCalendarButton from "../../../components/AddToCalendarButton";
import { savePendingCalendar, type CalendarEvent } from "../../../utils/addToCalendar";

import StepSelectClass from "./StepSelectClass";
import StepSelectSession from "./StepSelectSession";
import StepAttendees, { AttendeeForm, emptyAttendee } from "./StepAttendees";
import StepSummary from "./StepSummary";
import StepBookingMode, { BookingMode } from "./StepBookingMode";
import StepPackageLookup from "./StepPackageLookup";

const STEPS = [
  { label: "Clase" },
  { label: "Sesión" },
  { label: "Tus datos" },
  { label: "Resumen" },
];

export default function ClassBookingWizard() {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const navigate = useNavigate();
  const contentTopRef = useRef<HTMLDivElement | null>(null);
  const organization = useSelector((s: RootState) => s.organization.organization);
  const tz = organization?.timezone || "America/Bogota";

  // Deep-link desde el landing: "Reservar" en una sesión específica preselecciona
  // la clase/sesión y salta directo al paso correspondiente del wizard.
  const [searchParams] = useSearchParams();
  const preselectClassId = searchParams.get("classId");
  const preselectSessionId = searchParams.get("sessionId");
  const preselectSessionAppliedRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 🔀 Paso previo opcional (configurable por organización): elegir entre
  // pagar una clase individual o usar un paquete ya comprado, antes de
  // elegir la clase. Cuando la org no lo activa, arranca directo en "wizard"
  // = comportamiento histórico, sin cambios.
  const [phase, setPhase] = useState<"mode" | "lookup" | "wizard">(
    organization?.enablePackageChoiceStep ? "mode" : "wizard"
  );
  const [bookingMode, setBookingMode] = useState<BookingMode | null>(null);
  const [packageClassIds, setPackageClassIds] = useState<string[]>([]);
  // Créditos disponibles por clase (modo "usar mi paquete"): tope de sesiones a marcar.
  const [packageCredits, setPackageCredits] = useState<Record<string, number>>({});

  // Datos
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Selecciones
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<ClassSession[]>([]);
  const [attendee, setAttendee] = useState<AttendeeForm>(emptyAttendee());
  const [companion, setCompanion] = useState<AttendeeForm | null>(null);

  // Info pantalla de éxito
  const [finishName, setFinishName] = useState("");

  // 📦 Paquete del cliente que cubre la inscripción
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [pkgRemaining, setPkgRemaining] = useState<number>(0);
  const [usePkg, setUsePkg] = useState(true);
  // Con varias sesiones el paquete debe cubrirlas todas (el backend lo exige).
  // «Agregar a mi calendario»: cada sesión elegida (las fechas llegan con zona).
  const calendarEvents = (): CalendarEvent[] =>
    selectedSessions.map((ses) => {
      const room = typeof ses.roomId === "object" ? ses.roomId?.name : undefined;
      const teacher = typeof ses.employeeId === "object" ? ses.employeeId?.names : undefined;
      return {
        title: [selectedClass?.name || "Clase", organization?.name].filter(Boolean).join(" · "),
        start: ses.startDate,
        end: ses.endDate,
        timezone: organization?.timezone,
        location: organization?.address,
        description: [teacher && `Con ${teacher}`, room && `Salón: ${room}`].filter(Boolean).join(" · ") || undefined,
        uid: ses._id,
      };
    });
  const pkgCoversAll = !!pkgId && pkgRemaining >= selectedSessions.length;
  const usingPackage = usePkg && pkgCoversAll;

  // ¿La inscripción exige pagar un depósito online (y no se cubre con paquete)?
  // Se cobra si hay MP conectado o métodos de transferencia configurados.
  const classDepositNeeded =
    !usingPackage &&
    !!organization?.requireClassDeposit &&
    (organization?.classDepositPercentage ?? 0) > 0 &&
    (!!organization?.mpCollect?.connected ||
      (organization?.paymentMethods?.length ?? 0) > 0);

  // Cargar clases al montar
  useEffect(() => {
    if (!organization?._id) return;
    setLoadingClasses(true);
    getClassesByOrganization(organization._id)
      .then((data) => {
        setClasses(data);
        if (preselectClassId) {
          const match = data.find((c) => c._id === preselectClassId);
          if (match) {
            setSelectedClass(match);
            setCurrentStep(1);
          }
        }
      })
      .finally(() => setLoadingClasses(false));
  }, [organization?._id]);

  // Cargar sesiones al seleccionar clase
  useEffect(() => {
    if (!organization?._id || !selectedClass) return;
    setSelectedSessions([]);
    setSessions([]);
    setLoadingSessions(true);
    getAvailableSessions(organization._id, { classId: selectedClass._id, includeFull: true })
      .then((data) => {
        setSessions(data);
        if (preselectSessionId && !preselectSessionAppliedRef.current) {
          preselectSessionAppliedRef.current = true;
          const match = data.find((s) => s._id === preselectSessionId && s.status === "open");
          if (match) {
            setSelectedSessions([match]);
            setCurrentStep(2);
          }
        }
      })
      .finally(() => setLoadingSessions(false));
  }, [selectedClass?._id, organization?._id]);

  // Scroll al cambiar paso
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [currentStep]);

  // Identificador configurado por la organización (phone | email | documentId)
  const identifierField = organization?.clientFormConfig?.identifierField
    ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;

  // 📦 Al llegar al resumen, detectar paquete del cliente (por el identificador configurado)
  useEffect(() => {
    const idValue =
      identifierField === "phone" ? (attendee.phone_e164 || attendee.phone)
      : identifierField === "email" ? attendee.email.trim()
      : attendee.documentId.trim();
    if (currentStep !== 3 || !selectedClass || !organization?._id || !idValue) {
      setPkgId(null);
      setPkgRemaining(0);
      return;
    }
    checkClientClassPackagesByIdentifier(identifierField, idValue, [selectedClass._id], organization._id)
      .then((res) => {
        let found: string | null = null;
        let remaining = 0;
        // El que más créditos tenga para la clase: con varias sesiones debe
        // cubrirlas todas.
        for (const pkg of res.packages) {
          for (const c of pkg.classes || []) {
            const cId = typeof c.classId === "object" ? c.classId._id : c.classId;
            if (cId === selectedClass._id && c.sessionsRemaining > remaining) {
              found = pkg._id;
              remaining = c.sessionsRemaining;
            }
          }
        }
        setPkgId(found);
        setPkgRemaining(remaining);
        setUsePkg(true);
      })
      .catch(() => {
        setPkgId(null);
        setPkgRemaining(0);
      });
     
  }, [currentStep, selectedClass?._id, organization?._id, identifierField, attendee.phone_e164, attendee.phone, attendee.email, attendee.documentId]);

  if (!organization?._id) {
    return (
      <div style={{ padding: 48, textAlign: "center" }} className="ag-muted">
        No encontramos este negocio.
      </div>
    );
  }

  // ── Paso previo: elegir clase paga vs. paquete ─────
  const handleSelectBookingMode = (mode: BookingMode) => {
    setBookingMode(mode);
    setPackageClassIds([]);
    setPackageCredits({});
    setPhase(mode === "package" ? "lookup" : "wizard");
  };

  const handleFallbackToSingle = () => {
    setBookingMode("single");
    setPackageClassIds([]);
    setPackageCredits({});
    setPhase("wizard");
  };

  const handlePackageFound = (identifierValue: string, packages: ClientPackage[]) => {
    const credits: Record<string, number> = {};
    for (const pkg of packages) {
      for (const c of pkg.classes || []) {
        if (c.sessionsRemaining > 0) {
          const cId = typeof c.classId === "object" ? c.classId._id : c.classId;
          credits[cId] = Math.max(credits[cId] ?? 0, c.sessionsRemaining);
        }
      }
    }
    setPackageClassIds(Object.keys(credits));
    setPackageCredits(credits);
    if (identifierField === "phone") {
      setAttendee((prev) => ({ ...prev, phone_e164: identifierValue, phone: identifierValue }));
    } else if (identifierField === "email") {
      setAttendee((prev) => ({ ...prev, email: identifierValue }));
    } else {
      setAttendee((prev) => ({ ...prev, documentId: identifierValue }));
    }
    setPhase("wizard");
  };

  const visibleClasses = bookingMode === "package" && packageClassIds.length > 0
    ? classes.filter((c) => packageClassIds.includes(c._id))
    : classes;

  const attendeeHasIdentifier = (a: typeof attendee) => {
    if (identifierField === "phone") return !!(a.phone_e164 || a.phone);
    if (identifierField === "email") return !!a.email.trim();
    if (identifierField === "documentId") return !!a.documentId.trim();
    return false;
  };

  // ── Validaciones por paso ──────────────────────────
  const canNext: Record<number, boolean> = {
    0: !!selectedClass,
    1: selectedSessions.length > 0,
    2: !!attendee.name.trim() && attendeeHasIdentifier(attendee) &&
       (!companion || (!!companion.name.trim() && attendeeHasIdentifier(companion))),
    3: true,
  };

  // ── Helpers de formulario ──────────────────────────
  const handleAttendeeChange = (field: keyof AttendeeForm, value: string) =>
    setAttendee((prev) => ({ ...prev, [field]: value }));

  const handleCompanionChange = (field: keyof AttendeeForm, value: string) =>
    setCompanion((prev) => prev ? { ...prev, [field]: value } : emptyAttendee());

  const handleCompanionToggle = (enabled: boolean) =>
    setCompanion(enabled ? emptyAttendee() : null);

  // ── Envío ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!organization?._id || selectedSessions.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const attendeePayload = {
        name: attendee.name,
        phone: attendee.phone_e164 || attendee.phone,
        phone_e164: attendee.phone_e164 || undefined,
        phone_country: attendee.phone_country || undefined,
        email: attendee.email || undefined,
        documentId: attendee.documentId || undefined,
        notes: attendee.notes || undefined,
      };
      const companionPayload = companion
        ? {
            name: companion.name,
            phone: companion.phone_e164 || companion.phone,
            phone_e164: companion.phone_e164 || undefined,
            phone_country: companion.phone_country || undefined,
            email: companion.email || undefined,
            documentId: companion.documentId || undefined,
          }
        : undefined;

      // Pay-to-confirm: si la org exige depósito de clase y tiene MP conectado
      // (y el cupo NO se cubre con un paquete), redirigir al checkout de Mercado
      // Pago en vez de crear la inscripción directamente.
      const depositConfigured =
        !usingPackage &&
        !!organization.requireClassDeposit &&
        (organization.classDepositPercentage ?? 0) > 0;
      const hasMp = !!organization.mpCollect?.connected;
      const hasReceipt = (organization.paymentMethods?.length ?? 0) > 0;
      const prefersReceipt = organization.depositPreferredMethod === "receipt";
      const useReceipt = depositConfigured && hasReceipt && (prefersReceipt || !hasMp);
      const useMp = depositConfigured && hasMp && !useReceipt;

      const classCheckoutPayload = {
        organizationId: organization._id,
        sessionIds: selectedSessions.map((s) => s._id),
        attendee: attendeePayload,
        companion: companionPayload,
        notes: attendee.notes || undefined,
      };

      if (useMp) {
        const checkout = await createClassCheckout(classCheckoutPayload);
        if (checkout?.checkoutUrl) {
          savePendingCalendar(checkout.externalReference, calendarEvents());
          window.location.href = checkout.checkoutUrl;
          return; // navegamos fuera; el webhook confirma la inscripción
        }
        // Si no se pudo crear el checkout, no creamos la inscripción gratis.
        return;
      }

      if (useReceipt) {
        const checkout = await createReceiptClassCheckout(classCheckoutPayload);
        if (checkout) {
          navigate("/pago/comprobante", {
            state: {
              externalReference: checkout.externalReference,
              amount: checkout.amount,
              currency: checkout.currency,
              paymentMethods: checkout.paymentMethods,
              orderType: "class",
            },
          });
          return;
        }
        return;
      }

      await createPublicEnrollment({
        organizationId: organization._id,
        sessionIds: selectedSessions.map((s) => s._id),
        clientPackageId: usingPackage && pkgId ? pkgId : undefined,
        attendee: attendeePayload,
        companion: companionPayload,
      });
      setFinishName(attendee.name);
      setCompleted(true);
      setCurrentStep(4); // paso "Completado"
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // Si la sesión se llenó mientras tanto, volver a elegir sesión
      if (/cupo|lleno|llena|full|capacidad/i.test(msg)) {
        setSubmitError("Una de las sesiones se llenó mientras reservabas. Elige otra.");
        setCurrentStep(1);
      } else {
        setSubmitError(msg || "No se pudo completar la inscripción. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setCurrentStep(0);
    setCompleted(false);
    setSelectedClass(null);
    setSelectedSessions([]);
    setAttendee(emptyAttendee());
    setCompanion(null);
    setFinishName("");
    setBookingMode(null);
    setPackageClassIds([]);
    setPackageCredits({});
    setPhase(organization?.enablePackageChoiceStep ? "mode" : "wizard");
  };

  // ── Contenido de cada paso ─────────────────────────
  const currency = organization?.currency ?? "COP";
  const timeFormat = (organization as any)?.timeFormat as string | undefined;
  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <StepSelectClass
            classes={visibleClasses}
            loading={loadingClasses}
            selected={selectedClass}
            currency={currency}
            packageOnly={bookingMode === "package" && packageClassIds.length > 0}
            onSelect={(c) => {
              setSelectedClass(c);
              setCurrentStep(1);
            }}
          />
        );
      case 1:
        return (
          <StepSelectSession
            sessions={sessions}
            loading={loadingSessions}
            selected={selectedSessions}
            onChange={setSelectedSessions}
            selectedClass={selectedClass}
            timezone={tz}
            timeFormat={timeFormat}
            onChooseOtherClass={() => setCurrentStep(0)}
            maxSelectable={bookingMode === "package" && selectedClass ? packageCredits[selectedClass._id] ?? null : null}
          />
        );
      case 2:
        return (
          <StepAttendees
            classDoc={selectedClass}
            attendee={attendee}
            companion={companion}
            onAttendeeChange={handleAttendeeChange}
            onCompanionChange={handleCompanionChange}
            onCompanionToggle={handleCompanionToggle}
            organizationCountry={(organization as any)?.default_country || "CO"}
          />
        );
      case 3:
        return (
          <StepSummary
            classDoc={selectedClass}
            sessions={selectedSessions}
            attendee={attendee}
            companion={companion}
            timezone={tz}
            currency={currency}
            timeFormat={timeFormat}
            usingPackage={usingPackage}
            deposit={classDepositNeeded ? { percentage: organization?.classDepositPercentage ?? 0, currency } : null}
          />
        );
      default:
        return null;
    }
  };

  const page = { maxWidth: 760, margin: "0 auto", padding: isMobile ? "16px 16px 120px" : "24px 16px 48px" } as const;
  const heading = (
    <h1 style={{ margin: "0 0 16px", font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Reservar clase</h1>
  );

  // ── Fases previas al wizard (clase paga vs. paquete) ──
  if (phase === "mode" || phase === "lookup") {
    return (
      <div style={page}>
        <div ref={contentTopRef} />
        {heading}
        <div className="ag-card" style={{ padding: isMobile ? 16 : 24 }}>
          {phase === "mode" ? (
            <StepBookingMode onSelect={handleSelectBookingMode} />
          ) : (
            <StepPackageLookup
              identifierField={identifierField}
              organizationCountry={(organization as any)?.default_country || "CO"}
              organizationId={organization._id}
              classes={classes}
              loadingClasses={loadingClasses}
              onBack={() => setPhase("mode")}
              onFallbackSingle={handleFallbackToSingle}
              onFound={handlePackageFound}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Listo ──
  if (currentStep >= 4) {
    return (
      <div style={page}>
        <div ref={contentTopRef} />
        <div className="ag-card" style={{ padding: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "var(--success-soft)", color: "var(--success)" }}>
            <IconCheck size={28} />
          </span>
          <h1 style={{ margin: 0, font: "600 22px/28px var(--mantine-font-family)" }}>Inscripción confirmada</h1>
          <div className="ag-muted" style={{ fontSize: 14, maxWidth: 400 }}>
            {finishName ? `${finishName.split(" ")[0]}, te` : "Te"} enviamos por WhatsApp la confirmación y los detalles de tu clase.
          </div>
          <div className="ag-row" style={{ gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 4 }}>
            <AddToCalendarButton events={calendarEvents()} fileName={organization?.name} />
            <Button variant="default" onClick={() => navigate("/mis-reservas")}>Ver mis reservas</Button>
            <Button variant="subtle" color="gray" onClick={handleNewBooking}>
              Hacer otra reserva
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Barra inferior: resumen + el único botón del paso
  const nextLabel = currentStep === 2 ? "Ver resumen" : currentStep === 3 ? (classDepositNeeded ? "Pagar y confirmar" : "Confirmar inscripción") : "Continuar";
  const onNext = () => {
    if (currentStep === 3) handleSubmit();
    else setCurrentStep((s) => s + 1);
  };
  const missing =
    currentStep === 0 && !canNext[0]
      ? "Elige una clase para continuar."
      : currentStep === 1 && !canNext[1]
        ? "Elige al menos una sesión."
        : currentStep === 2 && !canNext[2]
          ? "Completa tu nombre y tu contacto."
          : null;
  const barSummary = [
    selectedClass?.name,
    selectedSessions.length ? (selectedSessions.length === 1 ? "1 sesión" : `${selectedSessions.length} sesiones`) : null,
    companion ? "2 personas" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const actionBar = (
    <div
      style={
        isMobile
          ? {
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
              background: "var(--surface-raised)",
              borderTop: "1px solid var(--line)",
              padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
            }
          : { borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 8 }
      }
    >
      <div className="ag-row" style={{ gap: 12, alignItems: "center", flexWrap: "nowrap" }}>
        {currentStep > 0 && (
          <Button variant="subtle" color="gray" onClick={() => setCurrentStep((s) => s - 1)} disabled={submitting} px={isMobile ? 8 : undefined}>
            Atrás
          </Button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {barSummary && <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{barSummary}</div>}
          {missing && <div className="ag-subtle">{missing}</div>}
        </div>
        <Button onClick={onNext} disabled={currentStep < 3 && !canNext[currentStep]} loading={submitting}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div style={page}>
      <div ref={contentTopRef} />
      {heading}
      <div className="ag-card" style={{ padding: isMobile ? 16 : 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {isMobile ? (
          <div>
            <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
              <b>{STEPS[currentStep]?.label}</b>
              <span className="ag-subtle">
                Paso {currentStep + 1} de {STEPS.length}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: "var(--surface-hover)", marginTop: 6, overflow: "hidden" }}>
              <div style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, height: "100%", background: "var(--ink)", transition: "width 160ms ease" }} />
            </div>
          </div>
        ) : (
          <Stepper
            active={currentStep}
            onStepClick={(i) => {
              if (!completed && i < currentStep) setCurrentStep(i);
            }}
            size="sm"
            allowNextStepsSelect={false}
          >
            {STEPS.map((s, i) => (
              <Stepper.Step key={i} label={s.label} />
            ))}
          </Stepper>
        )}

        {renderStep(currentStep)}

        {/* Usar paquete (resumen) */}
        {currentStep === 3 && pkgId && (
          <div className="ag-card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: 14 }}>Tienes un paquete para esta clase</b>
              <div className="ag-subtle">
                {pkgCoversAll
                  ? `Te ${pkgRemaining === 1 ? "queda 1 crédito" : `quedan ${pkgRemaining} créditos`}. Si lo usas se descuenta 1 por sesión y no pagas tu lugar.`
                  : `Te ${pkgRemaining === 1 ? "queda 1 crédito" : `quedan ${pkgRemaining} créditos`} y elegiste ${selectedSessions.length} sesiones. Para usarlo, vuelve a «Sesión» y deja máximo ${pkgRemaining}.`}
              </div>
            </div>
            <Switch disabled={!pkgCoversAll} checked={usingPackage} onChange={(e) => setUsePkg(e.currentTarget.checked)} aria-label="Usar paquete" />
          </div>
        )}

        {submitError && (
          <div className="ag-alert ag-alert--danger">
            <IconInfoCircle size={20} />
            <div>{submitError}</div>
          </div>
        )}

        {actionBar}
      </div>
    </div>
  );
}
