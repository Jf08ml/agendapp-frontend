/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
import { Text, Stack, Progress, Loader, Center, Button } from "@mantine/core";
import { IconRobotFace, IconListDetails, IconCompass, IconInfoCircle } from "@tabler/icons-react";
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
import { updateOrganization, seedDemoData } from "../../services/organizationService";
import { getServicesByOrganizationId } from "../../services/serviceService";
import { getEmployeesByOrganizationId } from "../../services/employeeService";
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
  { id: "service",       label: "Primer servicio",     description: "Lo que tus clientes podrán reservar.",                       icon: <IconTool size={16} /> },
  { id: "employee",      label: "Primer profesional",  description: "Quién atiende las citas y qué servicios hace.",              icon: <IconUser size={16} /> },
  { id: "booking",       label: "Reserva en línea",    description: "Si las reservas se confirman solas o las apruebas tú.",      icon: <IconCalendar size={16} /> },
  { id: "welcome",       label: "Presentación",        description: "Cómo se ve tu página y el mensaje de bienvenida.",           icon: <IconLayout size={16} /> },
  { id: "schedule",      label: "Horario",             description: "Los días y horas en que atiendes.",                           icon: <IconClock size={16} /> },
  { id: "social",        label: "Redes sociales",      description: "Enlaces a tus perfiles para que te sigan.",                  icon: <IconWorldWww size={16} />, optional: true },
  { id: "location",      label: "Ubicación",           description: "Dónde te encuentran tus clientes.",                           icon: <IconMapPin size={16} />, optional: true },
  { id: "branding",      label: "Marca",               description: "Logo y colores de tu página y tu app.",                       icon: <IconPalette size={16} /> },
  { id: "cancellation",  label: "Cancelación",         description: "Hasta cuándo pueden cancelar tus clientes.",                  icon: <IconBan size={16} /> },
  { id: "reminders",     label: "Recordatorios",       description: "Los avisos por WhatsApp antes de cada cita.",                 icon: <IconBell size={16} /> },
  { id: "finish",        label: "Listo",               description: "Resumen de lo que configuraste.",                             icon: <IconRocket size={16} /> },
];

// ── Componente principal ─────────────────────────────────────────────────────

type SetupMode = "choice" | "manual" | "ai";

const iconBubble: React.CSSProperties = {
  width: 40,
  height: 40,
  flex: "none",
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "var(--surface-hover)",
  color: "var(--ink)",
};

export default function SetupWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<SetupMode>("choice");
  const isMobile = useMediaQuery("(max-width: 62rem)");

  const organizationId = useSelector((s: RootState) => s.auth.organizationId);
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [skippingSetup, setSkippingSetup] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // Progreso parcial de una configuración anterior (típico: onboarding con IA
  // que quedó a medias — los servicios/profesionales SÍ se crearon pero el
  // setup nunca se marcó completo, y el usuario rebota aquí en cada login).
  const [partialProgress, setPartialProgress] = useState<{
    serviceNames: string[];
    employeeNames: string[];
  } | null>(null);
  const [finishingPartial, setFinishingPartial] = useState(false);

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

  // Detectar progreso parcial para ofrecer "continuar donde quedaste" en vez
  // de la pantalla de elección desde cero.
  useEffect(() => {
    if (!organizationId) return;
    let alive = true;
    (async () => {
      const [services, employees] = await Promise.all([
        getServicesByOrganizationId(organizationId),
        getEmployeesByOrganizationId(organizationId),
      ]);
      if (!alive) return;
      const serviceNames = services.filter((s) => s.isActive !== false).map((s) => s.name);
      const employeeNames = employees.filter((e) => e.isActive !== false).map((e) => e.names);
      if (serviceNames.length > 0 || employeeNames.length > 0) {
        setPartialProgress({ serviceNames, employeeNames });
      }
    })();
    return () => {
      alive = false;
    };
  }, [organizationId]);

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
      showNotification({ title: "Archivo muy grande", message: "La imagen puede pesar máximo 2 MB.", color: "red" });
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
      showNotification({ title: "Imagen subida", message: "Guardada correctamente.", color: "green" });
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

  // skipSave solo se usa en «Saltar este paso» (pasos opcionales)
  const goNext = useCallback(async (skipSave = false) => {
    if (!skipSave) {
      try { await saveOrgStep(); } catch { return; }
      markDone(currentStep);
    } else {
      setSkippedSteps((prev) => new Set([...prev, currentStep]));
    }
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
      // Aterrizar en la agenda (primer momento de valor), no en una página técnica
      navigate("/gestionar-agenda", { replace: true });
      showNotification({
        title: "Tu negocio está listo",
        message: "Toca un día del calendario y luego la columna de tu profesional para crear tu primera cita.",
        color: "green",
        autoClose: 12000,
      });
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

  // Explorar sin configurar: siembra servicios y profesionales de ejemplo,
  // activa el horario por defecto y deja entrar a una agenda ya funcional.
  const handleExploreFirst = async () => {
    if (!organizationId || skippingSetup) return;
    setSkippingSetup(true);
    try {
      const result = await seedDemoData(organizationId);
      // Reflejar setupCompleted en Redux para que ProtectedRoute deje pasar
      dispatch(updateOrganizationState({ ...(organization as any), setupCompleted: true }));
      navigate("/gestionar-agenda", { replace: true });
      showNotification({
        title: "Listo para explorar",
        message: result.seeded
          ? "Creamos servicios y profesionales de ejemplo. Toca un día del calendario y crea una cita de prueba — puedes editar o eliminar los ejemplos cuando quieras."
          : "Bienvenido a tu agenda. Crea tus servicios y profesionales cuando quieras.",
        color: "green",
        autoClose: 12000,
      });
    } catch {
      // Fallback: dejar entrar sin datos demo para no bloquear al usuario
      try {
        const updated = await updateOrganization(organizationId, { setupCompleted: true } as any);
        if (updated) dispatch(updateOrganizationState(updated));
        navigate("/gestionar-agenda", { replace: true });
      } catch {
        showNotification({ title: "Error", message: "No se pudo abrir la plataforma. Intenta de nuevo.", color: "red" });
        setSkippingSetup(false);
      }
    }
  };

  // Onboarding con IA: flag para que ProtectedRoute no rebote la agenda
  const startAiOnboarding = () => {
    sessionStorage.setItem("ai_onboarding_active", "1");
    navigate("/gestionar-agenda?asistente=onboarding");
  };

  // Finalizar con el progreso parcial existente: marca setupCompleted (el
  // backend registra el milestone del funnel) y aterriza en la agenda.
  const handleFinishPartial = async () => {
    if (!organizationId || finishingPartial) return;
    setFinishingPartial(true);
    try {
      const updated = await updateOrganization(organizationId, { setupCompleted: true } as any);
      dispatch(updateOrganizationState(updated ?? { ...(organization as any), setupCompleted: true }));
      navigate("/gestionar-agenda", { replace: true });
      showNotification({
        title: "Configuración finalizada",
        message:
          "Retomamos lo que ya habías creado. Toca un día del calendario para crear tu primera cita. Puedes ajustar tu horario y demás detalles en Configuración del negocio.",
        color: "green",
        autoClose: 12000,
      });
    } catch {
      showNotification({ title: "Error", message: "No se pudo finalizar. Intenta de nuevo.", color: "red" });
      setFinishingPartial(false);
    }
  };

  const canFinishPartial =
    !!partialProgress &&
    partialProgress.serviceNames.length > 0 &&
    partialProgress.employeeNames.length > 0;

  const partialSummary = partialProgress
    ? [
        partialProgress.serviceNames.length > 0
          ? `${partialProgress.serviceNames.length} ${
              partialProgress.serviceNames.length === 1 ? "servicio" : "servicios"
            } (${partialProgress.serviceNames.slice(0, 4).join(", ")}${
              partialProgress.serviceNames.length > 4 ? "…" : ""
            })`
          : null,
        partialProgress.employeeNames.length > 0
          ? `${partialProgress.employeeNames.length} ${
              partialProgress.employeeNames.length === 1 ? "profesional" : "profesionales"
            } (${partialProgress.employeeNames.slice(0, 3).join(", ")}${
              partialProgress.employeeNames.length > 3 ? "…" : ""
            })`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  // Pantalla de bienvenida: tres caminos iguales, cada uno con su tiempo estimado
  if (mode === "choice") {
    const paths = [
      {
        key: "ai",
        icon: <IconRobotFace size={22} />,
        title: "Con el asistente IA",
        time: "5 min",
        desc: "Le cuentas tu negocio en una conversación y él lo configura.",
        action: "Empezar con el asistente",
        onClick: startAiOnboarding,
        loading: false,
      },
      {
        key: "manual",
        icon: <IconListDetails size={22} />,
        title: "Paso a paso",
        time: "10 min",
        desc: "Completas cada parte en un formulario corto, a tu ritmo.",
        action: "Configurar paso a paso",
        onClick: () => setMode("manual"),
        loading: false,
      },
      {
        key: "explore",
        icon: <IconCompass size={22} />,
        title: "Explorar primero",
        time: "1 min",
        desc: "Creamos servicios y profesionales de ejemplo y abres la agenda. Los borras cuando quieras.",
        action: "Explorar con ejemplos",
        onClick: handleExploreFirst,
        loading: skippingSetup,
      },
    ];
    return (
      <div style={{ minHeight: "100vh", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
        <div className="ag-stack" style={{ gap: 20, width: "100%", maxWidth: 880 }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ margin: 0, font: "600 28px/34px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Bienvenido a {organization.name}</h1>
            <div className="ag-muted" style={{ fontSize: 15, marginTop: 6 }}>Vamos a dejar tu agenda lista para recibir citas. ¿Cómo prefieres hacerlo?</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
            {paths.map((p) =>
              isMobile ? (
                <button
                  key={p.key}
                  type="button"
                  className="ag-card"
                  onClick={p.onClick}
                  disabled={p.loading}
                  style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", textAlign: "left", cursor: "pointer", width: "100%", font: "inherit", color: "inherit" }}
                >
                  <span style={iconBubble}>{p.icon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: 15 }}>{p.title}</b>
                    <span className="ag-muted" style={{ fontSize: 13 }}>{p.desc}</span>
                  </span>
                  <span className="ag-badge">{p.time}</span>
                </button>
              ) : (
                <div key={p.key} className="ag-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="ag-row" style={{ justifyContent: "space-between" }}>
                    <span style={iconBubble}>{p.icon}</span>
                    <span className="ag-badge">{p.time}</span>
                  </div>
                  <b style={{ fontSize: 16 }}>{p.title}</b>
                  <div className="ag-muted" style={{ fontSize: 14, flex: 1 }}>{p.desc}</div>
                  <Button variant="outline" fullWidth onClick={p.onClick} loading={p.loading}>
                    {p.action}
                  </Button>
                </div>
              )
            )}
          </div>

          {partialProgress && (
            <div className="ag-alert ag-alert--info" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <IconInfoCircle size={20} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <b style={{ display: "block" }}>Ya tienes avances guardados</b>
                {partialSummary}
              </div>
              <div className="ag-row" style={{ gap: 8 }}>
                <Button variant="default" size="xs" leftSection={<IconRobotFace size={14} />} onClick={startAiOnboarding}>
                  Continuar donde quedaste
                </Button>
                {canFinishPartial && (
                  <Button size="xs" loading={finishingPartial} onClick={handleFinishPartial}>
                    Finalizar e ir a mi agenda
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
        return (
          <StepFinish
            onFinish={handleFinish}
            saving={saving}
            configured={STEPS.filter((_, i) => completedSteps.has(i)).map((x) => x.label)}
            skipped={STEPS.filter((_, i) => skippedSteps.has(i)).map((x) => x.label)}
          />
        );
      default:
        return null;
    }
  };

  // ── Layout: riel de pasos (escritorio) o barra de progreso (móvil) ──
  const optionalTag = <span className="ag-badge" style={{ height: 20, fontSize: 11 }}>Opcional</span>;
  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--surface-raised)",
          borderBottom: "1px solid var(--line)",
          padding: "12px 20px",
        }}
      >
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12 }}>
          <div>
            <b style={{ display: "block", fontSize: 14 }}>Configuración inicial</b>
            <span className="ag-subtle">{organization.name}</span>
          </div>
          <span className="ag-subtle ag-num">
            Paso {currentStep + 1} de {STEPS.length}
          </span>
        </div>
        {isMobile && <Progress value={progress} size="xs" mt={10} color="dark" />}
      </header>

      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
        {!isMobile && (
          <aside
            style={{
              width: 260,
              flex: "none",
              background: "var(--surface-raised)",
              borderRight: "1px solid var(--line)",
              position: "sticky",
              top: 64,
              height: "calc(100vh - 64px)",
              overflowY: "auto",
              padding: "16px 12px",
            }}
          >
            <div style={{ padding: "0 8px 12px" }}>
              <div className="ag-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                <span className="ag-muted">Progreso</span>
                <b className="ag-num">{progress} %</b>
              </div>
              <Progress value={progress} size="xs" mt={6} color="dark" />
            </div>
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {STEPS.map((st, i) => {
                const done = completedSteps.has(i);
                const skipped = skippedSteps.has(i);
                const current = i === currentStep;
                return (
                  <li
                    key={st.id}
                    aria-current={current ? "step" : undefined}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: "8px",
                      borderRadius: "var(--radius-md)",
                      background: current ? "var(--brand-soft)" : undefined,
                      color: done || current ? "var(--ink)" : "var(--ink-muted)",
                      fontSize: 14,
                      fontWeight: current ? 600 : 500,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        flex: "none",
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        background: done ? "var(--success)" : current ? "var(--ink)" : "var(--surface-hover)",
                        color: done || current ? "#fff" : "var(--ink-muted)",
                      }}
                    >
                      {done ? <IconCheck size={13} /> : i + 1}
                    </span>
                    <span style={{ flex: 1 }}>{st.label}</span>
                    {skipped ? <span className="ag-subtle" style={{ fontSize: 11 }}>Saltado</span> : st.optional ? optionalTag : null}
                  </li>
                );
              })}
            </ol>
          </aside>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? 16 : 32 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {step.id !== "finish" && (
              <div style={{ marginBottom: 20 }}>
                <div className="ag-row" style={{ gap: 8 }}>
                  <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>{step.label}</h1>
                  {step.optional && optionalTag}
                </div>
                <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>{step.description}</div>
              </div>
            )}
            {renderStep()}
          </div>
        </main>
      </div>
    </div>
  );
}
