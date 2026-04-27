/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import {
  Box, Group, Text, Stack, Title, Progress, Badge,
  ScrollArea, Loader, Center, Stepper,
  ThemeIcon, useMantineTheme, rem, Button, Paper, SimpleGrid,
} from "@mantine/core";
import { IconRobotFace, IconListDetails } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  IconTool, IconUser, IconCalendar, IconLayout,
  IconClock, IconWorldWww, IconMapPin, IconPalette,
  IconBan, IconBell, IconRocket, IconCheck,
} from "@tabler/icons-react";

import { RootState } from "../../app/store";
import { updateOrganization } from "../../services/organizationService";
import { updateOrganizationState } from "../../features/organization/sliceOrganization";
import { zodResolver } from "../../utils/zodResolver";
import { schema, FormValues } from "../admin/OrganizationInfo/schema";
import { normalizeOrg } from "../admin/OrganizationInfo/utils";
import { uploadImage } from "../../services/imageService";

import StepService from "./steps/StepService";
import StepEmployee from "./steps/StepEmployee";
import StepOnlineBooking from "./steps/StepOnlineBooking";
import StepWelcomeMessage from "./steps/StepWelcomeMessage";
import StepSchedule from "./steps/StepSchedule";
import StepSocialMedia from "./steps/StepSocialMedia";
import StepLocation from "./steps/StepLocation";
import StepBranding from "./steps/StepBranding";
import StepCancellation from "./steps/StepCancellation";
import StepReminders from "./steps/StepReminders";
import StepFinish from "./steps/StepFinish";

// ── Definición de pasos ──────────────────────────────────────────────────────

interface StepDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  optional?: boolean;
}

const STEPS: StepDef[] = [
  { id: "service",       label: "Primer servicio",     description: "Qué ofrecerás a tus clientes",           icon: <IconTool size={16} /> },
  { id: "employee",      label: "Primer profesional",  description: "Quién atenderá las citas",                icon: <IconUser size={16} /> },
  { id: "booking",       label: "Reserva en línea",    description: "Cómo aprobarás las reservas",             icon: <IconCalendar size={16} /> },
  { id: "welcome",       label: "Presentación",        description: "Cómo verán tu negocio los clientes",      icon: <IconLayout size={16} /> },
  { id: "schedule",      label: "Horario y reservas",  description: "Horario de atención e intervalo",          icon: <IconClock size={16} /> },
  { id: "social",        label: "Redes sociales",      description: "Opcional — enlaza tus perfiles",          icon: <IconWorldWww size={16} />, optional: true },
  { id: "location",      label: "Ubicación",           description: "Opcional — dónde te encuentran",          icon: <IconMapPin size={16} />, optional: true },
  { id: "branding",      label: "Branding",            description: "Logo, colores e identidad visual",        icon: <IconPalette size={16} /> },
  { id: "cancellation",  label: "Cancelación",         description: "Política de cancelación de citas",        icon: <IconBan size={16} /> },
  { id: "reminders",     label: "Recordatorios",       description: "Notificaciones automáticas a clientes",   icon: <IconBell size={16} /> },
  { id: "finish",        label: "¡Listo!",             description: "Resumen y próximos pasos",                icon: <IconRocket size={16} /> },
];

// ── Componente principal ─────────────────────────────────────────────────────

type SetupMode = "choice" | "manual" | "ai";

export default function SetupWizard() {
  const theme = useMantineTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SetupMode>("choice");
  const isMobile = useMediaQuery("(max-width: 62rem)");

  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // IDs creados en pasos 0 y 1
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);

  // Upload handlers para branding
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingPwaIcon, setUploadingPwaIcon] = useState(false);

  // Form compartido para los pasos de configuración de organización
  const form = useForm<FormValues>({
    validate: zodResolver(schema),
    initialValues: {} as any,
    validateInputOnChange: true,
  });

  // Cargar valores iniciales cuando la organización esté disponible
  useEffect(() => {
    if (organization) {
      const normalized = normalizeOrg(organization as any);
      form.setValues(normalized as any);
      form.resetDirty(normalized as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?._id]);

  // Upload helper para branding (igual que en OrganizationInfo)
  const onUpload = useCallback(async (
    file: File | null,
    key: "logoUrl" | "faviconUrl" | "pwaIcon"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotification({ title: "Archivo inválido", message: "Debe ser una imagen", color: "red" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification({ title: "Archivo muy grande", message: "Máximo 2MB", color: "red" });
      return;
    }
    key === "logoUrl"   && setUploadingLogo(true);
    key === "faviconUrl" && setUploadingFavicon(true);
    key === "pwaIcon"   && setUploadingPwaIcon(true);
    try {
      const url = await uploadImage(file);
      form.setFieldValue("branding", {
        ...form.values.branding,
        [key]: url,
        ...(key === "logoUrl" && {
          faviconUrl: form.values.branding?.faviconUrl ?? url,
          pwaIcon:    form.values.branding?.pwaIcon    ?? url,
        }),
      } as any);
      showNotification({ title: "Imagen subida", message: "✅ Guardada correctamente", color: "green" });
    } catch {
      showNotification({ title: "Error", message: "No se pudo subir la imagen", color: "red" });
    } finally {
      key === "logoUrl"   && setUploadingLogo(false);
      key === "faviconUrl" && setUploadingFavicon(false);
      key === "pwaIcon"   && setUploadingPwaIcon(false);
    }
  }, [form]);

  // Guarda los campos de organización del paso actual
  const saveOrgStep = useCallback(async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const updated = await updateOrganization(organizationId, form.values as any);
      if (updated) {
        dispatch(updateOrganizationState(updated));
        const normalized = normalizeOrg(updated);
        form.setValues(normalized as any);
        form.resetDirty(normalized as any);
      }
    } catch {
      showNotification({ title: "Error al guardar", message: "Intenta de nuevo", color: "red" });
      throw new Error("save_failed");
    } finally {
      setSaving(false);
    }
  }, [organizationId, form, dispatch]);

  const markDone = (step: number) =>
    setCompletedSteps((prev) => new Set([...prev, step]));

  const goNext = useCallback(async (skipSave = false) => {
    if (!skipSave) {
      try { await saveOrgStep(); } catch { return; }
    }
    markDone(currentStep);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, saveOrgStep]);

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleFinish = useCallback(async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const updated = await updateOrganization(organizationId, {
        ...form.values as any,
        setupCompleted: true,
      });
      if (updated) dispatch(updateOrganizationState(updated));
      navigate("/gestionar-whatsapp", { replace: true });
    } catch {
      showNotification({ title: "Error", message: "No se pudo finalizar la configuración", color: "red" });
    } finally {
      setSaving(false);
    }
  }, [organizationId, form.values, dispatch, navigate]);

  if (!organization) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader size="lg" />
          <Text c="dimmed">Cargando tu cuenta...</Text>
        </Stack>
      </Center>
    );
  }

  // Pantalla de elección
  if (mode === "choice") {
    return (
      <Center h="100vh" bg="gray.0">
        <Stack align="center" gap="xl" maw={580} px="md">
          <Stack align="center" gap="xs">
            <ThemeIcon size={56} radius="xl" variant="light" color="blue">
              <IconRocket size={28} />
            </ThemeIcon>
            <Title order={2} ta="center">¡Bienvenido a {organization.name}!</Title>
            <Text c="dimmed" ta="center" size="sm">
              Vamos a configurar tu cuenta. ¿Cómo prefieres hacerlo?
            </Text>
          </Stack>

          <SimpleGrid cols={2} spacing="md" w="100%">
            <Paper
              withBorder
              p="xl"
              radius="lg"
              style={{ cursor: "pointer", transition: "box-shadow .15s" }}
              onClick={() => navigate("/gestionar-agenda?asistente=onboarding")}
              styles={{ root: { "&:hover": { boxShadow: theme.shadows.md } } }}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon size={48} radius="xl" variant="light" color="violet">
                  <IconRobotFace size={24} />
                </ThemeIcon>
                <Text fw={700} ta="center">Configurar con IA</Text>
                <Text size="xs" c="dimmed" ta="center">
                  Un asistente te guía paso a paso en una conversación. Más fácil y rápido.
                </Text>
                <Badge color="violet" variant="light" size="sm">Recomendado</Badge>
              </Stack>
            </Paper>

            <Paper
              withBorder
              p="xl"
              radius="lg"
              style={{ cursor: "pointer", transition: "box-shadow .15s" }}
              onClick={() => setMode("manual")}
              styles={{ root: { "&:hover": { boxShadow: theme.shadows.md } } }}
            >
              <Stack align="center" gap="sm">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <IconListDetails size={24} />
                </ThemeIcon>
                <Text fw={700} ta="center">Configurar manualmente</Text>
                <Text size="xs" c="dimmed" ta="center">
                  Sigue el asistente paso a paso completando cada formulario.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Center>
    );
  }

  const progress = Math.round(((currentStep) / (STEPS.length - 1)) * 100);
  const step = STEPS[currentStep];

  // ── Render del paso activo ──────────────────────────────────────────────
  const renderStep = () => {
    switch (step.id) {
      case "service":
        return (
          <StepService
            onDone={(serviceId) => {
              setCreatedServiceId(serviceId);
              markDone(currentStep);
              setCurrentStep((s) => s + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        );
      case "employee":
        return (
          <StepEmployee
            createdServiceId={createdServiceId}
            onDone={() => {
              markDone(currentStep);
              setCurrentStep((s) => s + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onBack={goBack}
          />
        );
      case "booking":
        return <StepOnlineBooking form={form} onNext={() => goNext()} onBack={goBack} saving={saving} />;
      case "welcome":
        return <StepWelcomeMessage form={form} onNext={() => goNext()} onBack={goBack} saving={saving} />;
      case "schedule":
        return <StepSchedule form={form} onNext={() => goNext()} onBack={goBack} saving={saving} />;
      case "social":
        return (
          <StepSocialMedia
            form={form}
            onNext={() => goNext()}
            onSkip={() => goNext(true)}
            onBack={goBack}
            saving={saving}
          />
        );
      case "location":
        return (
          <StepLocation
            form={form}
            onNext={() => goNext()}
            onSkip={() => goNext(true)}
            onBack={goBack}
            saving={saving}
          />
        );
      case "branding":
        return (
          <StepBranding
            form={form}
            onNext={() => goNext()}
            onBack={goBack}
            saving={saving}
            uploadingLogo={uploadingLogo}
            uploadingFavicon={uploadingFavicon}
            uploadingPwaIcon={uploadingPwaIcon}
            onUpload={onUpload}
          />
        );
      case "cancellation":
        return <StepCancellation form={form} onNext={() => goNext()} onBack={goBack} saving={saving} />;
      case "reminders":
        return <StepReminders form={form} onNext={() => goNext()} onBack={goBack} saving={saving} />;
      case "finish":
        return <StepFinish onFinish={handleFinish} saving={saving} />;
      default:
        return null;
    }
  };

  // ── Layout ──────────────────────────────────────────────────────────────
  return (
    <Box style={{ minHeight: "100vh", background: theme.colors.gray[0] }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <Box
        px={{ base: "md", md: "xl" }}
        py="sm"
        style={{
          background: theme.white,
          borderBottom: `1px solid ${theme.colors.gray[2]}`,
          position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light">
              <IconRocket size={18} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" lh={1.2}>Configuración inicial</Text>
              <Text size="xs" c="dimmed">{organization.name}</Text>
            </div>
          </Group>
          <Group gap="sm">
            {step.optional && (
              <Badge variant="light" color="gray" size="sm">Paso opcional</Badge>
            )}
            <Text size="xs" c="dimmed" fw={500}>
              {currentStep + 1} / {STEPS.length}
            </Text>
          </Group>
        </Group>
        <Progress value={progress} size="xs" mt="xs" radius="xl" color="green" />
      </Box>

      {/* ── Cuerpo ───────────────────────────────────────────────────────── */}
      <Box style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>

        {/* Sidebar de pasos — solo desktop */}
        {!isMobile && (
          <Box
            w={260}
            style={{
              flexShrink: 0,
              background: theme.white,
              borderRight: `1px solid ${theme.colors.gray[2]}`,
              position: "sticky",
              top: 64,
              height: "calc(100vh - 64px)",
              overflowY: "auto",
            }}
          >
            <ScrollArea h="100%" p="md">
              <Stepper
                orientation="vertical"
                active={currentStep}
                size="sm"
                styles={{
                  step: { cursor: "default" },
                  stepLabel: { fontSize: rem(13), fontWeight: 600 },
                  stepDescription: { fontSize: rem(11) },
                }}
              >
                {STEPS.map((s, i) => (
                  <Stepper.Step
                    key={s.id}
                    label={s.label}
                    description={s.description}
                    icon={completedSteps.has(i) ? <IconCheck size={14} /> : s.icon}
                    completedIcon={<IconCheck size={14} />}
                    color={completedSteps.has(i) ? "green" : undefined}
                  />
                ))}
              </Stepper>
            </ScrollArea>
          </Box>
        )}

        {/* Contenido del paso */}
        <Box style={{ flex: 1, overflowY: "auto" }} p={{ base: "md", md: "xl" }}>
          <Box maw={720} mx="auto">

            {/* Título del paso */}
            <Stack gap={4} mb="xl">
              <Group gap="xs">
                <ThemeIcon size="md" radius="md" variant="light">
                  {step.icon}
                </ThemeIcon>
                <Title order={isMobile ? 3 : 2}>{step.label}</Title>
                {step.optional && (
                  <Badge variant="light" color="gray" size="xs">Opcional</Badge>
                )}
              </Group>
              <Text c="dimmed" size="sm">{step.description}</Text>
            </Stack>

            {renderStep()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
