/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text, Title, Badge, List } from "@mantine/core";
import { apiPlansPublic } from "../../services/axiosConfig";
import { PaymentMethodsModal } from "../../components/PaymentMethodsModal";

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
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number } | null>(null);

  useEffect(() => {
    (async () => {
      const plansRes = await apiPlansPublic.get("/public");
      setPlans(plansRes.data?.data || []);
    })();
  }, []);

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
              <Button
                variant="light"
                onClick={() => {
                  setSelectedPlan({ name: p.displayName, price: p.price || 0 });
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
