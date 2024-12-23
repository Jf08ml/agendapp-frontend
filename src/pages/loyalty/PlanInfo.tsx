import React from "react";
import LoyaltyPlan from "./LoyaltyPlan";
import ReferredPlan from "./ReferredPlan";
import {
  Box,
  Card,
  Flex,
  Group,
  Text,
  Avatar,
  Divider,
  Badge,
  Button,
} from "@mantine/core";
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
  return (
    <Box p="md">
      <Group justify="center" grow>
        <Flex direction="column" align="center" style={{ width: "100%" }}>
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ maxWidth: 400, width: "100%" }}
          >
            {/* Sección de perfil */}
            <Card.Section withBorder inheritPadding py="xs">
              <Flex justify="center" align="center" direction="column">
                <Avatar
                  radius="xl"
                  size="lg"
                  mb="sm"
                  color="blue"
                  variant="filled"
                >
                  {client.name?.[0]?.toUpperCase() || "?"}
                </Avatar>
                <Text size="xl" fw={700}>
                  {client.name || "Cliente desconocido"}
                </Text>
                <Text c="dimmed" size="sm">
                  {client.phoneNumber || "Teléfono no disponible"}
                </Text>
                {client.email && (
                  <Text c="dimmed" size="xs" mt="xs">
                    {client.email}
                  </Text>
                )}
              </Flex>
            </Card.Section>

            <Divider my="sm" variant="dashed" />

            {/* Sección de servicios tomados */}
            <Card.Section inheritPadding py="xs">
              <Badge color="teal" variant="light" size="lg">
                Servicios Tomados: {client.servicesTaken || 0}
              </Badge>
              <LoyaltyPlan
                servicesTaken={client.servicesTaken || 0}
                totalServices={organization?.serviceCount as number}
                serviceReward={organization?.serviceReward as string}
              />
            </Card.Section>

            <Divider my="sm" variant="dashed" />

            {/* Sección de referidos */}
            <Card.Section inheritPadding py="xs">
              <Badge color="indigo" variant="light" size="lg">
                Referidos Hechos: {client.referralsMade || 0}
              </Badge>
              <ReferredPlan
                referralsMade={client.referralsMade || 0}
                totalReferrals={organization?.referredCount as number}
                referredReward={organization?.referredReward as string}
              />
            </Card.Section>

            <Divider my="sm" variant="dashed" />

            {/* Botón de logout */}
            <Card.Section inheritPadding py="xs" mt="md">
              <Button fullWidth color="red" variant="light" onClick={onLogout}>
                Salir
              </Button>
            </Card.Section>
          </Card>
        </Flex>
      </Group>
    </Box>
  );
};

export default PlanInfo;
