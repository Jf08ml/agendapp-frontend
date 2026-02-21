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
  Grid,
  Card,
  Divider,
  Alert,
  Loader,
  CheckIcon,
  List,
  ThemeIcon,
  Progress,
} from "@mantine/core";

import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  getCurrentMembership,
  getMembershipStatus,
  Membership,
  MembershipStatus,
} from "../../services/membershipService";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";
import { ActivatePlanModal } from "../../components/ActivatePlanModal";
import { apiPlansPublic } from "../../services/axiosConfig";
import { IoAlertCircle } from "react-icons/io5";
import { BiCalendar, BiCreditCard, BiX } from "react-icons/bi";

interface PublicPlan {
  _id: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  price: number;
  currency: string;
  characteristics: string[];
  limits: Record<string, any>;
  slug: string;
}

export default function MyMembership() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [publicPlans, setPublicPlans] = useState<PublicPlan[]>([]);
  const [plansError, setPlansError] = useState(false);
  const [activatePlan, setActivatePlan] = useState<PublicPlan | null>(null);

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
      const [membershipData, statusData] = await Promise.all([
        getCurrentMembership(organization._id),
        getMembershipStatus(organization._id),
      ]);
      setMembership(membershipData);
      setStatus(statusData);
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

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      active: "green",
      trial: "blue",
      past_due: "orange",
      suspended: "red",
      cancelled: "gray",
      expired: "red",
    };
    return colors[s] || "gray";
  };

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      active: "Activa",
      trial: "Período de Prueba",
      past_due: "Vencida (Solo lectura)",
      suspended: "Suspendida",
      cancelled: "Cancelada",
      expired: "Expirada",
    };
    return labels[s] || s;
  };

  const getTrialInfo = () => {
    if (!membership || membership.status !== "trial") return null;
    const now = new Date();
    const end = new Date(membership.currentPeriodEnd);
    const start = new Date(membership.startDate);
    const totalDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const progress = Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100);
    return { totalDays, daysRemaining, progress, endDate: end };
  };

  const isTrial = membership?.status === "trial";
  const showPlans =
    isTrial ||
    membership?.status === "past_due" ||
    membership?.status === "suspended" ||
    membership?.status === "expired";
  const paidPlans = publicPlans.filter(
    (p) => p.slug !== "plan-demo" && p.price > 0
  );

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

  if (!membership) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Alert icon={<IoAlertCircle size={18} />} title="Sin membresía" color="yellow">
            No se encontró una membresía activa para tu organización. Elige un
            plan para comenzar.
          </Alert>

          {plansError ? (
            <Alert icon={<IoAlertCircle size={18} />} title="Error al cargar planes" color="red">
              <Stack gap="sm">
                <Text size="sm">No se pudieron cargar los planes disponibles.</Text>
                <Button size="xs" variant="light" onClick={loadPlans}>Reintentar</Button>
              </Stack>
            </Alert>
          ) : (
            <Grid>
              {publicPlans.map((p) => (
                <Grid.Col key={p._id} span={{ base: 12, md: 6, lg: 4 }}>
                  <Card withBorder shadow="sm" radius="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Text size="lg" fw={700}>{p.displayName}</Text>
                        <Badge>
                          {p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}
                        </Badge>
                      </Group>
                      <Text c="dimmed">
                        {p.billingCycle === "monthly" ? "Mensual" : p.billingCycle}
                      </Text>
                      <Text fw={700} size="lg">${p.price} {p.currency}</Text>
                      <Button onClick={() => setActivatePlan(p)}>
                        Activar mi plan
                      </Button>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Stack>

        <ActivatePlanModal
          opened={!!activatePlan}
          onClose={() => setActivatePlan(null)}
          plan={activatePlan}
        />
      </Container>
    );
  }

  const trialInfo = getTrialInfo();

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title order={2}>Mi Membresía</Title>
            <Text c="dimmed" size="sm">
              {isTrial
                ? "Estás en período de prueba gratuita"
                : "Gestiona tu suscripción y pagos"}
            </Text>
          </div>
          <Group gap="md">
            <Badge size="xl" variant="filled" color={getStatusColor(membership.status)}>
              {getStatusLabel(membership.status)}
            </Badge>
            {!isTrial && (
              <Button size="lg" onClick={() => setPaymentModalOpened(true)} variant="filled" color="blue">
                Renovar Membresía
              </Button>
            )}
          </Group>
        </Group>

        {/* Trial alert */}
        {isTrial && trialInfo && (
          <Alert
            icon={<IoAlertCircle size={18} />}
            color="blue"
            variant="light"
            title={`Te quedan ${trialInfo.daysRemaining} día${trialInfo.daysRemaining !== 1 ? "s" : ""} de prueba`}
          >
            <Stack gap="sm">
              <Progress
                value={trialInfo.progress}
                size="sm"
                color={trialInfo.daysRemaining <= 2 ? "red" : "blue"}
              />
              <Text size="sm">
                Tu período de prueba termina el{" "}
                <strong>
                  {trialInfo.endDate.toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
                . Después de esa fecha, tu cuenta pasará a modo de solo lectura
                y no podrás crear ni modificar citas, clientes o servicios.
              </Text>
              <Text size="sm" c="dimmed">
                Elige un plan a continuación para seguir usando la plataforma
                sin interrupciones.
              </Text>
            </Stack>
          </Alert>
        )}

        {/* Alerta de estado (non-trial) */}
        {!isTrial && status?.ui && (
          <Alert icon={<IoAlertCircle size={18} />} color={status.ui.statusColor as any} variant="light">
            <Text size="sm" fw={600}>{status.ui.statusMessage}</Text>
            {status.ui.showRenewalButton && (
              <Button size="xs" mt="sm" onClick={() => setPaymentModalOpened(true)}>
                Renovar Ahora
              </Button>
            )}
          </Alert>
        )}

        {/* Cards principales */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group>
                  <BiCreditCard size={24} color="var(--mantine-color-blue-6)" />
                  <Text size="lg" fw={600}>Plan Actual</Text>
                </Group>
                <Divider />
                <div>
                  <Text size="xl" fw={700} c="blue">
                    {isTrial ? "Trial (Prueba Gratuita)" : membership.planId.displayName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {isTrial
                      ? `${trialInfo?.totalDays || 7} días de acceso completo`
                      : membership.planId.billingCycle === "monthly" ? "Mensual" : "Anual"}
                  </Text>
                </div>
                {!isTrial && (
                  <div>
                    <Text size="xs" c="dimmed">Precio</Text>
                    <Text size="xl" fw={700}>
                      ${membership.planId.price} {membership.planId.currency}
                    </Text>
                  </div>
                )}
                {isTrial && (
                  <div>
                    <Text size="xs" c="dimmed">Precio</Text>
                    <Text size="xl" fw={700} c="green">Gratis</Text>
                  </div>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group>
                  <BiCalendar size={24} color="var(--mantine-color-green-6)" />
                  <Text size="lg" fw={600}>
                    {isTrial ? "Período de Prueba" : "Fechas"}
                  </Text>
                </Group>
                <Divider />
                <div>
                  <Text size="xs" c="dimmed">
                    {isTrial ? "Fecha de expiración del trial" : "Fecha de Vencimiento"}
                  </Text>
                  <Text size="lg" fw={600}>
                    {new Date(membership.currentPeriodEnd).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                  {status?.membership?.daysUntilExpiration !== undefined && (
                    <Badge
                      mt="xs"
                      color={
                        status.membership.daysUntilExpiration <= 3
                          ? "red"
                          : status.membership.daysUntilExpiration <= 7
                            ? "yellow"
                            : "gray"
                      }
                    >
                      {status.membership.daysUntilExpiration > 0
                        ? `${status.membership.daysUntilExpiration} días restantes`
                        : "Vencida"}
                    </Badge>
                  )}
                </div>
                {!isTrial && (
                  <div>
                    <Text size="xs" c="dimmed">Próximo Pago</Text>
                    <Text size="sm">
                      {membership.nextPaymentDue
                        ? new Date(membership.nextPaymentDue).toLocaleDateString("es-CO")
                        : "No programado"}
                    </Text>
                  </div>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Planes disponibles (trial, past_due, suspended, expired) */}
        {showPlans && (
          <Paper withBorder p="lg" radius="md">
            <Stack gap="md">
              <div>
                <Text size="lg" fw={600}>
                  {isTrial ? "Elige tu plan para continuar" : "Reactiva tu cuenta"}
                </Text>
                <Text size="sm" c="dimmed">
                  {isTrial
                    ? "Selecciona un plan antes de que termine tu período de prueba"
                    : "Elige un plan para recuperar el acceso completo"}
                </Text>
              </div>

              {plansError ? (
                <Alert icon={<IoAlertCircle size={18} />} title="Error al cargar planes" color="red">
                  <Stack gap="sm">
                    <Text size="sm">No se pudieron cargar los planes disponibles.</Text>
                    <Button size="xs" variant="light" onClick={loadPlans}>Reintentar</Button>
                  </Stack>
                </Alert>
              ) : (
                <Grid>
                  {paidPlans.map((p) => (
                    <Grid.Col key={p._id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card withBorder shadow="sm" radius="md" padding="lg">
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Text size="lg" fw={700}>{p.displayName}</Text>
                            <Badge variant="light" color={p.domainType === "custom_domain" ? "grape" : "blue"}>
                              {p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}
                            </Badge>
                          </Group>

                          <div>
                            <Text size="xl" fw={700} c="blue">
                              ${p.price}{" "}
                              <Text span size="sm" c="dimmed" fw={400}>
                                {p.currency} / {p.billingCycle === "monthly" ? "mes" : p.billingCycle}
                              </Text>
                            </Text>
                          </div>

                          {p.characteristics?.length > 0 && (
                            <>
                              <Divider />
                              <List
                                size="sm"
                                spacing="xs"
                                icon={
                                  <ThemeIcon color="green" size={18} radius="xl">
                                    <CheckIcon size={12} />
                                  </ThemeIcon>
                                }
                              >
                                {p.characteristics.slice(0, 5).map((c: string, i: number) => (
                                  <List.Item key={i}>{c}</List.Item>
                                ))}
                                {p.characteristics.length > 5 && (
                                  <Text size="xs" c="dimmed" mt={4}>
                                    +{p.characteristics.length - 5} más
                                  </Text>
                                )}
                              </List>
                            </>
                          )}

                          <Button fullWidth mt="sm" onClick={() => setActivatePlan(p)}>
                            Activar mi plan
                          </Button>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Stack>
          </Paper>
        )}

        {/* Características del Plan (solo para planes activos, no trial) */}
        {!isTrial && (
          <Paper withBorder p="lg" radius="md">
            <Text size="lg" fw={600} mb="md">Características de tu Plan</Text>
            <Grid>
              {membership.planId.characteristics.map((char: string, index: number) => (
                <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                  <Group gap="xs">
                    <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                    <Text size="sm">{char}</Text>
                  </Group>
                </Grid.Col>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Límites del Plan (solo para planes activos, no trial) */}
        {!isTrial && (
          <Paper withBorder p="lg" radius="md">
            <Text size="lg" fw={600} mb="md">Límites y Restricciones</Text>
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <div>
                  <Text size="xs" c="dimmed">Empleados Máximos</Text>
                  <Text size="lg" fw={600}>{membership.planId.limits?.maxEmployees || "Ilimitado"}</Text>
                </div>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <div>
                  <Text size="xs" c="dimmed">Servicios Máximos</Text>
                  <Text size="lg" fw={600}>{membership.planId.limits?.maxServices || "Ilimitado"}</Text>
                </div>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <div>
                  <Text size="xs" c="dimmed">Almacenamiento</Text>
                  <Text size="lg" fw={600}>{membership.planId.limits?.maxStorageGB || "Ilimitado"} GB</Text>
                </div>
              </Grid.Col>
            </Grid>

            <Divider my="md" />

            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Group gap="xs">
                  {membership.planId.limits?.customBranding ? (
                    <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <BiX size={16} color="var(--mantine-color-red-6)" />
                  )}
                  <Text size="sm">Branding Personalizado</Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Group gap="xs">
                  {membership.planId.limits?.whatsappIntegration ? (
                    <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <BiX size={16} color="var(--mantine-color-red-6)" />
                  )}
                  <Text size="sm">Integración WhatsApp</Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Group gap="xs">
                  {membership.planId.limits?.analyticsAdvanced ? (
                    <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <BiX size={16} color="var(--mantine-color-red-6)" />
                  )}
                  <Text size="sm">Analíticas Avanzadas</Text>
                </Group>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Group gap="xs">
                  {membership.planId.limits?.prioritySupport ? (
                    <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <BiX size={16} color="var(--mantine-color-red-6)" />
                  )}
                  <Text size="sm">Soporte Prioritario</Text>
                </Group>
              </Grid.Col>
            </Grid>
          </Paper>
        )}
      </Stack>

      {/* Modal de renovación (plan ya activo) */}
      <PaymentMethodsModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        membership={membership}
      />

      {/* Modal de activación de plan (trial / suspended / etc.) */}
      <ActivatePlanModal
        opened={!!activatePlan}
        onClose={() => setActivatePlan(null)}
        plan={activatePlan}
      />
    </Container>
  );
}
