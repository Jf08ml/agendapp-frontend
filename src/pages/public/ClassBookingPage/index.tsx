/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import {
  Card, Stack, Stepper, Button, Group, Text, Paper, Divider,
  Center, Title, LoadingOverlay,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

import {
  ClassType, ClassSession,
  getClassesByOrganization, getAvailableSessions, createPublicEnrollment,
} from "../../../services/classService";

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

  if (!organization?._id) {
    return (
      <Center h={300}>
        <Text c="dimmed">No se encontró la organización.</Text>
      </Center>
    );
  }

  // ── Validaciones por paso ──────────────────────────
  const canNext: Record<number, boolean> = {
    0: !!selectedClass,
    1: !!selectedSession,
    2: !!attendee.name.trim() && !!(attendee.phone_e164 || attendee.phone) &&
       (!companion || (!!companion.name.trim() && !!(companion.phone_e164 || companion.phone))),
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
      await createPublicEnrollment({
        organizationId: organization._id,
        sessionId: selectedSession._id,
        attendee: {
          name: attendee.name,
          phone: attendee.phone_e164 || attendee.phone,
          phone_e164: attendee.phone_e164,
          phone_country: attendee.phone_country,
          email: attendee.email || undefined,
        },
        companion: companion
          ? {
              name: companion.name,
              phone: companion.phone_e164 || companion.phone,
              phone_e164: companion.phone_e164,
              phone_country: companion.phone_country,
              email: companion.email || undefined,
            }
          : undefined,
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
            organizationCountry={(organization as any)?.country || "CO"}
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
                Confirmar inscripción
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
