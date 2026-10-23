/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/MyMembership.tsx
import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Stack,
  Paper,
  Text,
  Group,
  Badge,
  Button,
  Alert,
  Loader,
  Progress,
  SimpleGrid,
  Collapse,
  Anchor,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconSparkles,
} from "@tabler/icons-react";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  getCurrentMembership,
  getMyPlanInfo,
  Membership,
  MyPlanInfo,
} from "../../services/membershipService";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";
import { ActivatePlanModal } from "../../components/ActivatePlanModal";
import { apiPlansPublic } from "../../services/axiosConfig";
import { billingShort } from "../../utils/billingCycle";
import WhatsappQuotaUsage from "../../components/WhatsappQuotaUsage";

interface PublicPlan {
  _id: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  price: number;
  currency: string;
  characteristics: string[];
  slug: string;
  paypalPlanId: string | null;
}

const STATUS: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "green" },
  trial: { label: "Prueba gratuita", color: "blue" },
  pending: { label: "Pendiente", color: "yellow" },
  past_due: { label: "Vencida", color: "orange" },
  suspended: { label: "Suspendida", color: "red" },
  cancelled: { label: "Cancelada", color: "gray" },
  expired: { label: "Expirada", color: "red" },
};

const FEATURES: [string, string][] = [
  ["whatsappIntegration", "WhatsApp automático"],
  ["autoReminders", "Recordatorios automáticos"],
  ["campaignsWhatsapp", "Campañas WhatsApp"],
  ["loyaltyProgram", "Sistema de fidelización"],
  ["servicePackages", "Paquetes de sesiones"],
  ["classesModule", "Módulo de clases"],
  ["professionalLanding", "Landing profesional"],
  ["customBranding", "Branding personalizado"],
  ["prioritySupport", "Soporte prioritario"],
];

const DAY_MS = 1000 * 60 * 60 * 24;

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

export default function MyMembership() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [publicPlans, setPublicPlans] = useState<PublicPlan[]>([]);
  const [plansError, setPlansError] = useState(false);
  const [activatePlan, setActivatePlan] = useState<PublicPlan | null>(null);
  const [planInfo, setPlanInfo] = useState<MyPlanInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  useEffect(() => {
    loadMembership();
  }, [organization?._id]);

  const loadMembership = async () => {
    if (!organization?._id) return;
    setLoading(true);
    try {
      const [membershipData, planInfoData] = await Promise.all([
        getCurrentMembership(organization._id),
        getMyPlanInfo(),
      ]);
      setMembership(membershipData);
      setPlanInfo(planInfoData);
    } catch (error) {
      console.error("Error al cargar membresía:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setPlansError(false);
    try {
      const res = await apiPlansPublic.get("/public");
      setPublicPlans(res.data?.data || []);
    } catch (e) {
      console.error("Error cargando planes:", e);
      setPlansError(true);
    }
  };

  const scrollToPlans = () =>
    document.getElementById("planes")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const paidPlans = publicPlans.filter((p) => p.slug !== "plan-demo" && p.price > 0);

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Stack align="center" gap="md" py="xl">
          <Loader size="lg" />
          <Text c="dimmed">Cargando información de membresía...</Text>
        </Stack>
      </Container>
    );
  }

  // ── Sin membresía: solo elegir plan ─────────────────────────────────────
  if (!membership) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={2}>Mi membresía</Title>
            <Text c="dimmed" size="sm">Elige un plan para comenzar a usar AgenditApp.</Text>
          </div>
          <PlansGrid
            plans={paidPlans}
            error={plansError}
            onRetry={loadPlans}
            actionLabel="Elegir este plan"
            onSelect={setActivatePlan}
          />
        </Stack>
        <ActivatePlanModal
          opened={!!activatePlan}
          onClose={() => setActivatePlan(null)}
          plan={activatePlan}
          modalTitle="Activar mi plan"
        />
      </Container>
    );
  }

  const plan = membership.planId;
  const isTrial = membership.status === "trial";
  const isActive = membership.status === "active";
  const status = STATUS[membership.status] ?? { label: membership.status, color: "gray" };

  const now = Date.now();
  const end = new Date(membership.currentPeriodEnd);
  const daysLeft = Math.ceil((end.getTime() - now) / DAY_MS);
  const trialTotalDays = Math.max(1, Math.ceil((end.getTime() - new Date(membership.startDate).getTime()) / DAY_MS));
  const trialProgress = Math.min(100, ((trialTotalDays - Math.max(0, daysLeft)) / trialTotalDays) * 100);

  // Plan pago que puede renovarse directamente (no aplica al trial)
  const canRenewCurrent = !isTrial && plan.price > 0;
  const expiringSoon = isActive && daysLeft <= 7;

  // Mensaje de atención (solo cuando hay que hacer algo)
  let attention: { color: string; text: string } | null = null;
  if (membership.status === "past_due") {
    attention = { color: "orange", text: "Tu plan venció. Solo puedes consultar datos; renueva para recuperar el acceso completo." };
  } else if (membership.status === "suspended") {
    attention = { color: "red", text: "Tu membresía está suspendida. Renueva para reactivarla." };
  } else if (membership.status === "expired" || membership.status === "cancelled") {
    attention = { color: "red", text: "Tu membresía no está activa. Elige un plan para recuperar el acceso." };
  } else if (expiringSoon) {
    attention = {
      color: "yellow",
      text: daysLeft > 0 ? `Tu membresía vence en ${daysLeft} día${daysLeft !== 1 ? "s" : ""}.` : "Tu membresía vence hoy.",
    };
  }

  // Para activas: otros planes (cambio). Para el resto: todos los planes pagos.
  const otherPlans = isActive ? paidPlans.filter((p) => p._id !== plan._id) : paidPlans;

  const primaryAction = canRenewCurrent ? (
    <Button
      size="md"
      variant={isActive && !expiringSoon ? "light" : "filled"}
      onClick={() => setPaymentModalOpened(true)}
    >
      Renovar membresía
    </Button>
  ) : (
    <Button size="md" leftSection={<IconSparkles size={18} />} onClick={scrollToPlans}>
      Elegir un plan
    </Button>
  );

  const plansSection = otherPlans.length > 0 && (
    <Stack gap="md" id="planes" style={{ scrollMarginTop: 80 }}>
      <div>
        <Title order={3}>
          {isTrial ? "Elige tu plan" : isActive ? "Cambiar de plan" : "Reactiva tu cuenta"}
        </Title>
        <Text size="sm" c="dimmed">
          {isTrial
            ? "Elige antes de que termine tu prueba para seguir sin interrupciones."
            : isActive
              ? "El nuevo plan se activa al completar el pago."
              : "Elige un plan para recuperar el acceso completo."}
        </Text>
      </div>
      <PlansGrid
        plans={otherPlans}
        error={plansError}
        onRetry={loadPlans}
        actionLabel={isActive ? "Cambiar a este plan" : "Elegir este plan"}
        actionVariant={isActive ? "light" : "filled"}
        onSelect={setActivatePlan}
      />
    </Stack>
  );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={2}>Mi membresía</Title>

        {/* ─── Resumen ──────────────────────────────────────────────── */}
        <Paper withBorder radius="lg" p={{ base: "md", sm: "xl" }}>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text size="sm" c="dimmed">Tu plan</Text>
                <Title order={3}>{isTrial ? "Prueba gratuita" : plan.displayName}</Title>
              </div>
              <Badge size="lg" variant="light" color={status.color} style={{ flexShrink: 0 }}>
                {status.label}
              </Badge>
            </Group>

            {isTrial ? (
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {daysLeft > 0 ? `Te quedan ${daysLeft} día${daysLeft !== 1 ? "s" : ""}` : "Tu prueba termina hoy"}
                  </Text>
                  <Text size="sm" c="dimmed">Termina el {formatDate(end)}</Text>
                </Group>
                <Progress value={trialProgress} size="md" radius="xl" color={daysLeft <= 2 ? "red" : "blue"} />
                <Text size="xs" c="dimmed">
                  Al terminar pasarás al Plan Gratuito (1 profesional, 5 servicios, sin WhatsApp).
                </Text>
              </Stack>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                <Stat label="Precio" value={`$${plan.price} ${plan.currency}`} hint={plan.billingCycle !== "lifetime" ? `por ${billingShort(plan.billingCycle)}` : "pago único"} />
                <Stat
                  label={daysLeft > 0 ? "Vence el" : "Venció el"}
                  value={formatDate(end)}
                  hint={daysLeft > 0 ? `${daysLeft} día${daysLeft !== 1 ? "s" : ""} restantes` : undefined}
                  hintColor={daysLeft <= 3 ? "red" : daysLeft <= 7 ? "orange" : undefined}
                />
                {membership.lastPaymentDate && (
                  <Stat label="Último pago" value={formatDate(membership.lastPaymentDate)} />
                )}
              </SimpleGrid>
            )}

            {attention && (
              <Alert color={attention.color} variant="light" icon={<IconAlertCircle size={18} />}>
                {attention.text}
              </Alert>
            )}

            <Group>{primaryAction}</Group>
          </Stack>
        </Paper>

        {/* En prueba o sin acceso, elegir plan es lo prioritario */}
        {!isActive && plansSection}

        {/* ─── Uso e inclusiones ────────────────────────────────────── */}
        {!isTrial && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder radius="lg" p={{ base: "md", sm: "lg" }}>
              <Stack gap="md">
                <Text fw={600}>Uso del plan</Text>
                <UsageRow label="Profesionales" current={planInfo?.usage?.employees?.current} max={plan.limits?.maxEmployees} />
                <UsageRow label="Servicios" current={planInfo?.usage?.services?.current} max={plan.limits?.maxServices} />
                <WhatsappQuotaUsage usage={planInfo?.usage?.whatsappAppointmentsThisMonth} />
                <Group gap="xl">
                  <Stat
                    label="Almacenamiento"
                    value={plan.limits?.maxStorageGB != null ? `${plan.limits.maxStorageGB} GB` : "Ilimitado"}
                    size="sm"
                  />
                  <Stat
                    label="Recordatorios por cita"
                    value={plan.limits?.maxRemindersPerAppointment > 0 ? String(plan.limits.maxRemindersPerAppointment) : "—"}
                    size="sm"
                  />
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder radius="lg" p={{ base: "md", sm: "lg" }}>
              <Stack gap="md">
                <Text fw={600}>Qué incluye</Text>
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing={8}>
                  {[...FEATURES]
                    .sort(([a], [b]) => Number(!!(plan.limits as any)?.[b]) - Number(!!(plan.limits as any)?.[a]))
                    .map(([key, label]) => {
                      const included = !!(plan.limits as any)?.[key];
                      return (
                        <Group key={key} gap={8} wrap="nowrap">
                          {included ? (
                            <IconCheck size={16} color="var(--mantine-color-green-6)" style={{ flexShrink: 0 }} />
                          ) : (
                            <IconX size={16} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0 }} />
                          )}
                          <Text size="sm" c={included ? undefined : "dimmed"} td={included ? undefined : "line-through"}>
                            {label}
                          </Text>
                        </Group>
                      );
                    })}
                </SimpleGrid>
                {plan.characteristics?.length > 0 && (
                  <>
                    <Anchor component="button" size="sm" onClick={() => setShowDetails((v) => !v)} style={{ alignSelf: "flex-start" }}>
                      {showDetails ? "Ocultar detalle" : "Ver detalle del plan"}
                    </Anchor>
                    <Collapse in={showDetails}>
                      <List size="sm" spacing={4}>
                        {plan.characteristics.map((c, i) => (
                          <List.Item key={i}>{c}</List.Item>
                        ))}
                      </List>
                    </Collapse>
                  </>
                )}
              </Stack>
            </Paper>
          </SimpleGrid>
        )}

        {isActive && plansSection}
      </Stack>

      {/* Modal de renovación del plan actual */}
      <PaymentMethodsModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        membership={membership}
      />

      {/* Modal de activación / cambio de plan */}
      <ActivatePlanModal
        opened={!!activatePlan}
        onClose={() => setActivatePlan(null)}
        plan={activatePlan}
        modalTitle={isActive ? "Cambiar de plan" : "Activar mi plan"}
      />
    </Container>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  hintColor,
  size = "md",
}: {
  label: string;
  value: string;
  hint?: string;
  hintColor?: string;
  size?: "sm" | "md";
}) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size={size === "md" ? "lg" : "md"} fw={700}>{value}</Text>
      {hint && <Text size="xs" c={hintColor ?? "dimmed"} fw={hintColor ? 600 : undefined}>{hint}</Text>}
    </Stack>
  );
}

function UsageRow({ label, current, max }: { label: string; current?: number; max?: number | null }) {
  const used = current ?? 0;
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm">{label}</Text>
        <Text size="sm" fw={600}>
          {current ?? "—"} / {max != null ? max : "Ilimitados"}
        </Text>
      </Group>
      {max != null && (
        <Progress value={pct} size="sm" radius="xl" color={used >= max ? "red" : pct >= 80 ? "orange" : "blue"} />
      )}
    </Stack>
  );
}

function PlansGrid({
  plans,
  error,
  onRetry,
  actionLabel,
  actionVariant = "filled",
  onSelect,
}: {
  plans: PublicPlan[];
  error: boolean;
  onRetry: () => void;
  actionLabel: string;
  actionVariant?: "filled" | "light";
  onSelect: (p: PublicPlan) => void;
}) {
  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={18} />} title="No se pudieron cargar los planes" color="red">
        <Button size="xs" variant="light" onClick={onRetry}>Reintentar</Button>
      </Alert>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
      {plans.map((p) => (
        <Paper key={p._id} withBorder radius="lg" p="lg">
          <Stack gap="md" h="100%">
            <div>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Text size="lg" fw={700}>{p.displayName}</Text>
                {p.domainType === "custom_domain" && (
                  <Badge variant="light" color="grape" style={{ flexShrink: 0 }}>Dominio propio</Badge>
                )}
              </Group>
              <Text size="xl" fw={800}>
                ${p.price}{" "}
                <Text span size="sm" c="dimmed" fw={500}>
                  {p.currency}{p.billingCycle !== "lifetime" && ` / ${billingShort(p.billingCycle)}`}
                </Text>
              </Text>
            </div>

            {p.characteristics?.length > 0 && (
              <List
                size="sm"
                spacing={6}
                icon={
                  <ThemeIcon color="green" variant="light" size={18} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                }
                style={{ flex: 1 }}
              >
                {p.characteristics.slice(0, 5).map((c, i) => (
                  <List.Item key={i}>{c}</List.Item>
                ))}
                {p.characteristics.length > 5 && (
                  <Text size="xs" c="dimmed" mt={4}>+{p.characteristics.length - 5} más</Text>
                )}
              </List>
            )}

            <Button fullWidth variant={actionVariant} onClick={() => onSelect(p)}>
              {actionLabel}
            </Button>
          </Stack>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
