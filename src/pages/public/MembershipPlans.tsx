/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text, Title, Badge, List } from "@mantine/core";
import { apiPlansPublic } from "../../services/axiosConfig";
import { billingLabel } from "../../utils/billingCycle";
import { ActivatePlanModal } from "../../components/ActivatePlanModal";

interface PlanPublic {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  billingCycle: string;
  domainType: string;
  characteristics: string[];
  limits: Record<string, any>;
  price?: number;
  currency?: string;
  paypalPlanId?: string | null;
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanPublic | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const plansRes = await apiPlansPublic.get("/public");
      setPlans(plansRes.data?.data || []);
    })();
  }, []);

  const handleSelectPlan = (plan: PlanPublic) => {
    setSelectedPlan(plan);
    setModalOpen(true);
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
              <Text c="dimmed">{billingLabel(p.billingCycle)}</Text>
              <Text fw={700}>
                ${p.price} {p.currency}
              </Text>
              <List size="sm">
                {p.characteristics.slice(0, 6).map((c, i) => (
                  <List.Item key={i}>{c}</List.Item>
                ))}
              </List>

              <Button onClick={() => handleSelectPlan(p)}>
                Activar plan
              </Button>
            </Stack>
          </Card>
        ))}
      </Group>

      <ActivatePlanModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        plan={
          selectedPlan
            ? {
                _id: selectedPlan._id,
                displayName: selectedPlan.displayName,
                price: selectedPlan.price ?? 0,
                currency: String(selectedPlan.currency ?? "USD"),
                billingCycle: selectedPlan.billingCycle,
                paypalPlanId: selectedPlan.paypalPlanId ?? null,
              }
            : null
        }
      />
    </Stack>
  );
}
