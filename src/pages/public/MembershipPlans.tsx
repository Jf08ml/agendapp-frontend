/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode, useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text, Title, Badge, Modal, List } from "@mantine/core";
import { apiGeneral } from "../../services/axiosConfig";
import { createMembershipCheckout } from "../../services/paymentsService";
import { getPublicBillingInfo, PublicBillingInfo } from "../../services/platformBillingService";

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
  prices?: { USD?: number; COP?: number };
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState<PlanPublic[]>([]);
  const [orgId, setOrgId] = useState<string>("");
  const [billing, setBilling] = useState<PublicBillingInfo | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [plansRes, orgRes, billingRes] = await Promise.all([
        apiGeneral.get("/plans/public"),
        apiGeneral.get("/organization-config"),
        getPublicBillingInfo(),
      ]);
      setPlans(plansRes.data.data || []);
      setOrgId(orgRes.data._id);
      setBilling(billingRes);
    })();
  }, []);

  const startCheckout = async (planSlug: string) => {
    if (!orgId) return;
    const { checkoutUrl } = await createMembershipCheckout({
      organizationId: orgId,
      planSlug,
      currency: "USD",
    });
    window.location.href = checkoutUrl;
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
              <Group>
                <Button onClick={() => startCheckout(p.slug)}>Pagar con tarjeta (USD)</Button>
                <Button variant="light" onClick={() => setTransferOpen(true)}>
                  Transferencia (COP)
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </Group>

      <Modal opened={transferOpen} onClose={() => setTransferOpen(false)} title="Pago por transferencia (COP)" centered>
        {billing ? (
          <Stack>
            {billing.copTransfers.accounts.length === 0 ? (
              <Text c="dimmed">Pronto habilitaremos los datos para transferencia.</Text>
            ) : (
              billing.copTransfers.accounts.map((a, idx) => (
                <Card key={idx} withBorder>
                  <Text fw={600}>{a.label}</Text>
                  <Text>Nombre: {a.accountName}</Text>
                  {a.bank ? <Text>Banco: {a.bank}</Text> : null}
                  <Text>Número: {a.accountNumber}</Text>
                </Card>
              ))
            )}
            {billing.copTransfers.whatsapp ? (
              <Text>
                Soporte por WhatsApp: <b>{billing.copTransfers.whatsapp}</b>
              </Text>
            ) : null}
            {billing.copTransfers.note ? <Text c="dimmed">{billing.copTransfers.note}</Text> : null}
          </Stack>
        ) : (
          <Text c="dimmed">Cargando información...</Text>
        )}
      </Modal>
    </Stack>
  );
}
