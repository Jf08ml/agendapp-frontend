/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text, Title, Badge, List, Loader } from "@mantine/core";
import { apiPlansPublic, apiGeneral } from "../../services/axiosConfig";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface PlanPublic {
  currency: ReactNode;
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  characteristics: string[];
  limits: Record<string, any>;
  price?: number;
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ _id: string; name: string; price: number } | null>(null);
  const [lsLoading, setLsLoading] = useState<string | null>(null); // planId en carga

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);

  useEffect(() => {
    (async () => {
      const plansRes = await apiPlansPublic.get("/public");
      setPlans(plansRes.data?.data || []);
    })();
  }, []);

  const handleCardCheckout = async (plan: PlanPublic) => {
    if (!organizationId) return;
    setLsLoading(plan._id);
    try {
      const res = await apiGeneral.post("/payments/checkout", {
        provider: "lemonsqueezy",
        planId: plan._id,
        organizationId,
        successUrl: `${window.location.origin}/payment-success`,
        cancelUrl: `${window.location.origin}/plans`,
      });
      const checkoutUrl = res.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (err: any) {
      console.error("Error al crear checkout:", err);
    } finally {
      setLsLoading(null);
    }
  };

  return (
    <Stack align="center" mt="xl" maw={1100} mx="auto">
      <Title order={2}>Elige tu plan</Title>
      <Group justify="center" align="stretch">
        {plans.map((p) => (
          <Card key={p._id} withBorder shadow="sm" radius="md" style={{ width: 340 }}>
            <Stack>
              <Group justify="space-between">
                <Title order={4}>{p.displayName}</Title>
                <Badge>{p.domainType === "custom_domain" ? "Dominio propio" : "Subdominio"}</Badge>
              </Group>
              <Text c="dimmed">{p.billingCycle === "monthly" ? "Mensual" : p.billingCycle}</Text>
              <Text fw={700}>
                ${p.price} {p.currency}
              </Text>
              <List size="sm">
                {p.characteristics.slice(0, 6).map((c, i) => (
                  <List.Item key={i}>{c}</List.Item>
                ))}
              </List>

              {/* Pago con tarjeta vía Lemon Squeezy */}
              {organizationId && (
                <Button
                  onClick={() => handleCardCheckout(p)}
                  loading={lsLoading === p._id}
                  disabled={lsLoading !== null && lsLoading !== p._id}
                  leftSection={lsLoading === p._id ? <Loader size="xs" color="white" /> : undefined}
                >
                  Pagar con tarjeta
                </Button>
              )}

              {/* Pago manual (transferencia) */}
              <Button
                variant="light"
                onClick={() => {
                  setSelectedPlan({ _id: p._id, name: p.displayName, price: p.price || 0 });
                  setTransferOpen(true);
                }}
              >
                Pagar por transferencia
              </Button>
            </Stack>
          </Card>
        ))}
      </Group>

      <PaymentMethodsModal
        opened={transferOpen}
        onClose={() => setTransferOpen(false)}
        membership={null}
        planName={selectedPlan?.name}
        planPrice={selectedPlan?.price}
      />
    </Stack>
  );
}
