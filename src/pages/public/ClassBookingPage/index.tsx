/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Card, Stack, Stepper, Button, Group, Text, Paper, Divider,
  Center, Title, LoadingOverlay, Switch,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { DEFAULT_CLIENT_FORM_CONFIG } from "../../../services/organizationService";

import {
  ClassType, ClassSession,
  getClassesByOrganization, getAvailableSessions, createPublicEnrollment,
} from "../../../services/classService";
import { checkClientClassPackagesByIdentifier } from "../../../services/packageService";
import { createClassCheckout, createReceiptClassCheckout } from "../../../services/collectionService";
import { useNavigate } from "react-router-dom";

import StepSelectClass from "./StepSelectClass";
import StepSelectSession from "./StepSelectSession";
import StepAttendees, { AttendeeForm, emptyAttendee } from "./StepAttendees";
import StepSummary from "./StepSummary";

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

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Datos
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Selecciones
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [attendee, setAttendee] = useState<AttendeeForm>(emptyAttendee());
  const [companion, setCompanion] = useState<AttendeeForm | null>(null);

  // Info pantalla de éxito
  const [finishName, setFinishName] = useState("");

  // 📦 Paquete del cliente que cubre la inscripción
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [pkgRemaining, setPkgRemaining] = useState<number>(0);
  const [usePkg, setUsePkg] = useState(true);

  // ¿La inscripción exige pagar un depósito online (y no se cubre con paquete)?
  // Se cobra si hay MP conectado o métodos de transferencia configurados.
  const classDepositNeeded =
    !(usePkg && pkgId) &&
    !!organization?.requireClassDeposit &&
    (organization?.classDepositPercentage ?? 0) > 0 &&
    (!!organization?.mpCollect?.connected ||
      (organization?.paymentMethods?.length ?? 0) > 0);

  // Cargar clases al montar
  useEffect(() => {
    if (!organization?._id) return;
    setLoadingClasses(true);
    getClassesByOrganization(organization._id)
      .then(setClasses)
      .finally(() => setLoadingClasses(false));
  }, [organization?._id]);

  // Cargar sesiones al seleccionar clase
  useEffect(() => {
    if (!organization?._id || !selectedClass) return;
    setSelectedSession(null);
    setSessions([]);
    setLoadingSessions(true);
    getAvailableSessions(organization._id, { classId: selectedClass._id })
      .then(setSessions)
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
        for (const pkg of res.packages) {
          for (const c of pkg.classes || []) {
            const cId = typeof c.classId === "object" ? c.classId._id : c.classId;
            if (cId === selectedClass._id && c.sessionsRemaining > 0) {
              found = pkg._id;
              remaining = c.sessionsRemaining;
              break;
            }
          }
          if (found) break;
        }
        setPkgId(found);
        setPkgRemaining(remaining);
        setUsePkg(true);
      })
      .catch(() => {
        setPkgId(null);
        setPkgRemaining(0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedClass?._id, organization?._id, identifierField, attendee.phone_e164, attendee.phone, attendee.email, attendee.documentId]);

  if (!organization?._id) {
    return (
      <Center h={300}>
        <Text c="dimmed">No se encontró la organización.</Text>
      </Center>
    );
  }

  const attendeeHasIdentifier = (a: typeof attendee) => {
    if (identifierField === "phone") return !!(a.phone_e164 || a.phone);
    if (identifierField === "email") return !!a.email.trim();
    if (identifierField === "documentId") return !!a.documentId.trim();
    return false;
  };

  // ── Validaciones por paso ──────────────────────────
  const canNext: Record<number, boolean> = {
    0: !!selectedClass,
    1: !!selectedSession,
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
    if (!organization?._id || !selectedSession) return;
    setSubmitting(true);
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
      const usingPackage = usePkg && !!pkgId;
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
        sessionId: selectedSession._id,
        attendee: attendeePayload,
        companion: companionPayload,
        notes: attendee.notes || undefined,
      };

      if (useMp) {
        const checkout = await createClassCheckout(classCheckoutPayload);
        if (checkout?.checkoutUrl) {
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
        sessionId: selectedSession._id,
        clientPackageId: usePkg && pkgId ? pkgId : undefined,
        attendee: attendeePayload,
        companion: companionPayload,
      });
      setFinishName(attendee.name);
      setCompleted(true);
      setCurrentStep(4); // paso "Completado"
    } catch (err) {
      // Mostrar error al usuario (se puede mejorar con notifications)
      alert(err instanceof Error ? err.message : "Error al reservar. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBooking = () => {
    setCurrentStep(0);
    setCompleted(false);
    setSelectedClass(null);
    setSelectedSession(null);
    setAttendee(emptyAttendee());
    setCompanion(null);
    setFinishName("");
  };

  // ── Contenido de cada paso ─────────────────────────
  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <StepSelectClass
            classes={classes}
            loading={loadingClasses}
            selected={selectedClass}
            onSelect={(c) => { setSelectedClass(c); setCurrentStep(1); }}
          />
        );
      case 1:
        return (
          <StepSelectSession
            sessions={sessions}
            loading={loadingSessions}
            selected={selectedSession}
            onSelect={(s) => { setSelectedSession(s); setCurrentStep(2); }}
            selectedClass={selectedClass}
            timezone={tz}
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
            session={selectedSession}
            attendee={attendee}
            companion={companion}
            timezone={tz}
            usingPackage={usePkg && !!pkgId}
            deposit={
              classDepositNeeded
                ? {
                    percentage: organization?.classDepositPercentage ?? 0,
                    currency: organization?.currency ?? "COP",
                  }
                : null
            }
          />
        );
      default:
        return null;
    }
  };

  const progressValue = Math.min((currentStep / STEPS.length) * 100, 100);

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
        {/* ── Header / Stepper ────────────────────────── */}
        {!isMobile && currentStep < 4 ? (
          <Stepper
            active={currentStep}
            onStepClick={(i) => { if (!completed && i < currentStep) setCurrentStep(i); }}
            orientation="horizontal"
            size="sm"
            iconSize={26}
            allowNextStepsSelect={false}
          >
            {STEPS.map((s, i) => (
              <Stepper.Step key={i} label={s.label} />
            ))}
            <Stepper.Completed>Completado</Stepper.Completed>
          </Stepper>
        ) : currentStep < 4 ? (
          <Paper
            withBorder
            p="sm"
            radius="md"
            style={{ position: "sticky", top: 0, zIndex: 9, background: "var(--mantine-color-body)" }}
          >
            <Group justify="space-between">
              <Text size="sm" fw={600}>{STEPS[currentStep]?.label}</Text>
              <Text size="xs" c="dimmed">Paso {currentStep + 1} de {STEPS.length}</Text>
            </Group>
            <Divider my={6} />
            <div style={{ height: 6, borderRadius: 9999, overflow: "hidden", background: "var(--mantine-color-gray-2)" }}>
              <div style={{ width: `${progressValue}%`, height: "100%", background: "var(--mantine-color-green-6)", transition: "width 160ms ease" }} />
            </div>
          </Paper>
        ) : null}

        {/* ── Contenido ────────────────────────────────── */}
        {currentStep < 4 ? (
          renderStep(currentStep)
        ) : (
          // Pantalla de éxito
          <Stack align="center" gap="md" py="xl">
            <Center
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--mantine-color-green-1)",
              }}
            >
              <IconCheck size={32} color="var(--mantine-color-green-6)" />
            </Center>
            <Title order={3} ta="center">
              ¡Reserva realizada, {finishName}!
            </Title>
            <Text ta="center" c="dimmed" maw={400}>
              Recibirás un mensaje de WhatsApp con la confirmación y los detalles de tu inscripción.
            </Text>
            <Button onClick={handleNewBooking} variant="light" mt="md">
              Hacer otra reserva
            </Button>
          </Stack>
        )}

        {/* 📦 Opción de usar paquete (paso resumen) */}
        {currentStep === 3 && pkgId && (
          <Paper withBorder p="sm" radius="md" style={{ borderColor: "var(--mantine-color-grape-4)" }}>
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Text size="sm" fw={600} c="grape">Tienes un paquete con créditos para esta clase</Text>
                <Text size="xs" c="dimmed">
                  Créditos disponibles: {pkgRemaining}. Si lo usas, tu lugar no tendrá costo
                  (se descuenta 1 crédito). El acompañante usa su propio paquete si tiene.
                </Text>
              </div>
              <Switch
                checked={usePkg}
                onChange={(e) => setUsePkg(e.currentTarget.checked)}
                label={usePkg ? "Usar paquete" : "No usar"}
              />
            </Group>
          </Paper>
        )}

        {/* ── Botones de navegación ────────────────────── */}
        {currentStep < 4 && !completed && (
          <Group
            justify={currentStep > 0 ? "space-between" : "flex-end"}
            wrap="wrap"
            gap="sm"
          >
            {currentStep > 0 && (
              <Button variant="default" fullWidth={isMobile} onClick={() => setCurrentStep((s) => s - 1)}>
                Atrás
              </Button>
            )}

            {/* Pasos 0 y 1: auto-avanzan al seleccionar, pero también mostramos botón */}
            {currentStep === 0 && (
              <Button
                fullWidth={isMobile}
                disabled={!canNext[0]}
                onClick={() => setCurrentStep(1)}
              >
                Siguiente
              </Button>
            )}
            {currentStep === 1 && (
              <Button
                fullWidth={isMobile}
                disabled={!canNext[1]}
                onClick={() => setCurrentStep(2)}
              >
                Siguiente
              </Button>
            )}
            {currentStep === 2 && (
              <Button
                fullWidth={isMobile}
                disabled={!canNext[2]}
                onClick={() => setCurrentStep(3)}
              >
                Ver resumen
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                fullWidth={isMobile}
                loading={submitting}
                color="green"
                onClick={handleSubmit}
              >
                {classDepositNeeded ? "Pagar y confirmar" : "Confirmar inscripción"}
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
