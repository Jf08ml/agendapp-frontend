import React from "react";
import LoyaltyPlan from "./LoyaltyPlan";
import ReferredPlan from "./ReferredPlan";
import { Card, Flex, Group, Text, Avatar, Button, Center, Stack } from "@mantine/core";
import { Client as ClientType } from "../../services/clientService";
import { Organization } from "../../services/organizationService";

interface PlanInfoProps {
  client: ClientType;
  organization: Organization | null;
  onLogout: () => void;
}

const PlanInfo: React.FC<PlanInfoProps> = ({
  client,
  organization,
  onLogout,
}) => {
  // Defaults para evitar NaN/undefined en props de componentes hijos
  const totalServices = organization?.serviceCount ?? 0;
  const serviceReward = organization?.serviceReward ?? "Sin recompensa";
  const totalReferrals = organization?.referredCount ?? 0;
  const referredReward = organization?.referredReward ?? "Sin recompensa";

  // Branding: color de fondo para avatar, si existe
  const avatarBg =
    organization?.branding?.primaryColor ||
    organization?.branding?.secondaryColor ||
    "blue";

  // Si organization no existe, muestra mensaje amigable
  if (!organization) {
    return (
      <Center mih={300}>
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text size="xl" fw={700} ta="center" mb="md">
            Organización no encontrada
          </Text>
          <Text c="dimmed" ta="center">
            Hubo un problema cargando los datos de la organización.
          </Text>
          <Button mt="xl" color="red" fullWidth onClick={onLogout}>
            Salir
          </Button>
        </Card>
      </Center>
    );
  }

  return (
    <>
      <Group justify="center" grow>
        <Flex direction="column" align="center" style={{ width: "100%" }}>
          <Card
            shadow="lg"
            padding="xl"
            radius="2xl"
            withBorder
            style={{
              width: "100%",
              margin: "auto",
            }}
          >
            {/* Sección de perfil */}
            <Card.Section withBorder inheritPadding py={10}>
              <Stack align="center" gap={4}>
                <Avatar
                  radius="xl"
                  size={64}
                  color={avatarBg}
                  style={{ fontSize: 24 }}
                >
                  {client.name?.[0]?.toUpperCase() || "?"}
                </Avatar>
                <Text size="lg" fw={700} ta="center" mt={2}>
                  {client.name || "Cliente desconocido"}
                </Text>
                <Group gap={8} justify="center">
                  <Text c="dimmed" size="sm">
                    {client.phoneNumber || "Sin teléfono"}
                  </Text>
                  {client.email && (
                    <>
                      <Text c="dimmed" size="xs">
                        •
                      </Text>
                      <Text
                        c="dimmed"
                        size="xs"
                        style={{ maxWidth: 140 }}
                        truncate="end"
                      >
                        {client.email}
                      </Text>
                    </>
                  )}
                </Group>
              </Stack>
            </Card.Section>

            {/* Sección de servicios tomados */}
            <Card.Section inheritPadding>
              <LoyaltyPlan
                servicesTaken={client.servicesTaken || 0}
                totalServices={totalServices}
                serviceReward={serviceReward}
              />
            </Card.Section>

            {/* Sección de referidos */}
            <Card.Section inheritPadding>
              <ReferredPlan
                referralsMade={client.referralsMade || 0}
                totalReferrals={totalReferrals}
                referredReward={referredReward}
              />
            </Card.Section>

            {/* Botón de logout */}
            <Card.Section p="lg" ta="center">
              <Button fullWidth color="red" variant="light" onClick={onLogout}>
                Salir
              </Button>
            </Card.Section>
          </Card>
        </Flex>
      </Group>
    </>
  );
};

export default PlanInfo;
