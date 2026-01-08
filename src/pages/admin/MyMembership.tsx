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
  Timeline,
  Divider,
  Alert,
  Loader,
  CheckIcon,
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
import { apiGeneral } from "../../services/axiosConfig";
import { createMembershipCheckout, getPaymentHistory, PaymentSession } from "../../services/paymentsService";
import { IoAlertCircle } from "react-icons/io5";
import { BiCalendar, BiCreditCard, BiX } from "react-icons/bi";
import { CgCreditCard } from "react-icons/cg";
import { notifications } from "@mantine/notifications";
import { Link } from "react-router-dom";

export default function MyMembership() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpened, setPaymentModalOpened] = useState(false);
  const [publicPlans, setPublicPlans] = useState<any[]>([]);
  const [transferOpened, setTransferOpened] = useState(false);
  const [transferPlan, setTransferPlan] = useState<{ name: string; amount: number } | null>(null);
  const [lastPayment, setLastPayment] = useState<PaymentSession | null>(null);
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
      const [membershipData, statusData, paymentHistory] = await Promise.all([
        getCurrentMembership(organization._id),
        getMembershipStatus(organization._id),
        getPaymentHistory({ organizationId: organization._id, limit: 1 }),
      ]);
      setMembership(membershipData);
      setStatus(statusData);
      if (paymentHistory && paymentHistory.length > 0) {
        setLastPayment(paymentHistory[0]);
      }
    } catch (error) {
      console.error("Error al cargar membresía:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar planes públicos para permitir selección si no hay membresía
    (async () => {
      try {
        const res = await apiGeneral.get("/plans/public");
        setPublicPlans(res.data?.data || []);
      } catch (e) {
        // noop
      }
    })();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "green",
      trial: "blue",
      grace_period: "orange",
      suspended: "red",
      cancelled: "gray",
      expired: "red",
    };
    return colors[status] || "gray";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Activa",
      trial: "Período de Prueba",
      grace_period: "Período de Gracia",
      suspended: "Suspendida",
      cancelled: "Cancelada",
      expired: "Expirada",
    };
    return labels[status] || status;
  };

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
    const startUSDCheckout = async (planSlug: string) => {
      if (!organization?._id) return;
      try {
        const { checkoutUrl } = await createMembershipCheckout({
          organizationId: organization._id,
          planSlug,
          currency: "USD",
        });
        window.location.href = checkoutUrl;
      } catch (error: any) {
        notifications.show({
          title: "No se pudo iniciar el pago",
          message: error.response?.data?.message || "Intenta de nuevo",
          color: "red",
        });
      }
    };

    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Alert
            icon={<IoAlertCircle size={18} />}
            title="Sin membresía"
            color="yellow"
          >
            No se encontró una membresía activa para tu organización. Elige un plan para comenzar.
          </Alert>

          <Grid>
            {publicPlans.map((p) => (
              <Grid.Col key={p._id} span={{ base: 12, md: 6, lg: 4 }}>
                <Card withBorder shadow="sm" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text size="lg" fw={700}>{p.displayName}</Text>
                      <Badge>{p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}</Badge>
                    </Group>
                    <Text c="dimmed">{p.billingCycle === "monthly" ? "Mensual" : p.billingCycle}</Text>
                    <Text fw={700} size="lg">
                      ${p.price} {p.currency}
                    </Text>
                    <Group>
                      <Button onClick={() => startUSDCheckout(p.slug)} leftSection={<CgCreditCard size={18} />}>Pagar con tarjeta</Button>
                      <Button variant="light" onClick={() => {
                        setTransferPlan({ name: p.displayName, amount: p.price });
                        setTransferOpened(true);
                      }}>Transferencia (COP)</Button>
                    </Group>
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>

          <PaymentMethodsModal
            opened={transferOpened}
            onClose={() => setTransferOpened(false)}
            membership={null}
            planName={transferPlan?.name}
            planPrice={transferPlan?.amount}
          />
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title order={2}>Mi Membresía</Title>
            <Text c="dimmed" size="sm">
              Gestiona tu suscripción y pagos
            </Text>
          </div>
          <Group gap="md">
            <Badge
              size="xl"
              variant="filled"
              color={getStatusColor(membership.status)}
            >
              {getStatusLabel(membership.status)}
            </Badge>
            <Button
              size="lg"
              leftSection={<CgCreditCard size={20} />}
              onClick={() => setPaymentModalOpened(true)}
              variant="filled"
              color="blue"
            >
              Renovar Membresía
            </Button>
          </Group>
        </Group>

        {/* Alerta de estado */}
        {status?.ui && (
          <Alert
            icon={<IoAlertCircle size={18} />}
            color={status.ui.statusColor as any}
            variant="light"
          >
            <Text size="sm" fw={600}>
              {status.ui.statusMessage}
            </Text>
            {status.ui.showRenewalButton && (
              <Button
                size="xs"
                mt="sm"
                onClick={() => setPaymentModalOpened(true)}
              >
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
                  <Text size="lg" fw={600}>
                    Plan Actual
                  </Text>
                </Group>
                <Divider />
                <div>
                  <Text size="xl" fw={700} c="blue">
                    {membership.planId.displayName}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {membership.planId.billingCycle === "monthly"
                      ? "Mensual"
                      : "Anual"}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Precio
                  </Text>
                  <Text size="xl" fw={700}>
                    ${membership.planId.price} {membership.planId.currency}
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Stack gap="md">
                <Group>
                  <BiCalendar size={24} color="var(--mantine-color-green-6)" />
                  <Text size="lg" fw={600}>
                    Fechas
                  </Text>
                </Group>
                <Divider />
                <div>
                  <Text size="xs" c="dimmed">
                    Fecha de Vencimiento
                  </Text>
                  <Text size="lg" fw={600}>
                    {new Date(membership.currentPeriodEnd).toLocaleDateString(
                      "es-CO",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
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
                <div>
                  <Text size="xs" c="dimmed">
                    Próximo Pago
                  </Text>
                  <Text size="sm">
                    {membership.nextPaymentDue
                      ? new Date(membership.nextPaymentDue).toLocaleDateString(
                          "es-CO"
                        )
                      : "No programado"}
                  </Text>
                </div>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Características del Plan */}
        <Paper withBorder p="lg" radius="md">
          <Text size="lg" fw={600} mb="md">
            Características de tu Plan
          </Text>
          <Grid>
            {membership.planId.characteristics.map((char, index) => (
              <Grid.Col key={index} span={{ base: 12, md: 6 }}>
                <Group gap="xs">
                  <CheckIcon size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">{char}</Text>
                </Group>
              </Grid.Col>
            ))}
          </Grid>
        </Paper>

        {/* Historial de Pagos */}
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Text size="lg" fw={600}>
              Historial de Pagos
            </Text>
            <Button variant="light" size="sm" component={Link} to="/payment-history">
              Ver Historial Completo
            </Button>
          </Group>
          
          {lastPayment ? (
            <Card withBorder padding="md" radius="md" bg="#f8f9fa">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Último Pago Registrado
                  </Text>
                  <Badge 
                    color={lastPayment.status === "succeeded" ? "green" : lastPayment.status === "failed" ? "red" : "blue"}
                    variant="filled"
                  >
                    {lastPayment.status === "succeeded" ? "✓ Exitoso" : lastPayment.status === "failed" ? "✗ Fallido" : "Pendiente"}
                  </Badge>
                </Group>

                <Divider />

                <Grid>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Text size="xs" c="dimmed">
                      Fecha
                    </Text>
                    <Text size="sm" fw={500}>
                      {new Date(lastPayment.createdAt).toLocaleDateString(
                        "es-CO",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Text size="xs" c="dimmed">
                      Monto
                    </Text>
                    <Text size="sm" fw={500}>
                      {lastPayment.amount ? `$${lastPayment.amount}` : "-"}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Text size="xs" c="dimmed">
                      Procesado
                    </Text>
                    <Badge size="sm" color={lastPayment.processed ? "green" : "gray"}>
                      {lastPayment.processed ? "✓ Sí" : "No"}
                    </Badge>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>
          ) : (
            <Alert icon={<IoAlertCircle size={16} />} color="gray">
              <Text size="sm">No hay pagos registrados aún</Text>
            </Alert>
          )}
        </Paper>

        {/* Límites del Plan */}
        <Paper withBorder p="lg" radius="md">
          <Text size="lg" fw={600} mb="md">
            Límites y Restricciones
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <div>
                <Text size="xs" c="dimmed">
                  Empleados Máximos
                </Text>
                <Text size="lg" fw={600}>
                  {membership.planId.limits?.maxEmployees || "Ilimitado"}
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <div>
                <Text size="xs" c="dimmed">
                  Servicios Máximos
                </Text>
                <Text size="lg" fw={600}>
                  {membership.planId.limits?.maxServices || "Ilimitado"}
                </Text>
              </div>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <div>
                <Text size="xs" c="dimmed">
                  Almacenamiento
                </Text>
                <Text size="lg" fw={600}>
                  {membership.planId.limits?.maxStorageGB || "Ilimitado"} GB
                </Text>
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
      </Stack>

      {/* Modal de Pago */}
      <PaymentMethodsModal
        opened={paymentModalOpened}
        onClose={() => setPaymentModalOpened(false)}
        membership={membership}
      />
    </Container>
  );
}
