import React from "react";
import { useSelector } from "react-redux";
import { Avatar, Badge, Box, Group, Paper, Text, Tooltip, ActionIcon } from "@mantine/core";
import { IconChevronRight, IconGift, IconUserPlus, IconCirclePlus } from "@tabler/icons-react";
import { RootState } from "../../../app/store";
import { selectOrganization } from "../../../features/organization/sliceOrganization";
import { Client } from "../../../services/clientService";
import { getCountryFlag } from "../../../utils/countryHelper";

interface ClientListItemProps {
  client: Client;
  isMobile: boolean;
  onOpenDetail: (clientId: string) => void;
  onRegisterService: (clientId: string) => void;
  onReferral: (clientId: string) => void;
}

const ClientListItem: React.FC<ClientListItemProps> = React.memo(
  ({ client, isMobile, onOpenDetail, onRegisterService, onReferral }) => {
    const organization = useSelector((state: RootState) => selectOrganization(state));
    const loyaltyEnabled = organization?.showLoyaltyProgram !== false;
    const rewardReady = loyaltyEnabled && !!(client.hasServiceDiscount || client.hasReferralBenefit);
    const iconSize = isMobile ? "lg" : "md";

    return (
      <Paper
        withBorder
        radius="md"
        p="sm"
        onClick={() => onOpenDetail(client._id)}
        style={{
          cursor: "pointer",
          borderLeft: rewardReady ? "4px solid var(--mantine-color-yellow-5)" : undefined,
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <Avatar radius="xl" color={rewardReady ? "yellow" : "blue"}>
              {client.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Group gap={4} wrap="nowrap">
                <Text fw={600} size="sm" truncate>
                  {client.name}
                </Text>
                {rewardReady && (
                  <Tooltip label="Tiene un premio listo para canjear">
                    <IconGift size={14} color="var(--mantine-color-yellow-7)" style={{ flexShrink: 0 }} />
                  </Tooltip>
                )}
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {client.phone_country && `${getCountryFlag(client.phone_country)} `}
                {client.phoneNumber}
              </Text>
            </Box>
          </Group>

          {!isMobile && loyaltyEnabled && (
            <Group gap={6} wrap="nowrap">
              <Badge variant="light" color="dark" size="sm">
                {client.servicesTaken} servicios
              </Badge>
              <Badge variant="light" color="dark" size="sm">
                {client.referralsMade} referidos
              </Badge>
            </Group>
          )}

          <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
            <Tooltip label="Registrar servicio">
              <ActionIcon radius="xl" variant="light" color="green" size={iconSize} onClick={() => onRegisterService(client._id)}>
                <IconCirclePlus size={isMobile ? 20 : 16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Registrar referido">
              <ActionIcon radius="xl" variant="light" color="grape" size={iconSize} onClick={() => onReferral(client._id)}>
                <IconUserPlus size={isMobile ? 20 : 16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <IconChevronRight size={16} color="var(--mantine-color-gray-5)" style={{ flexShrink: 0 }} />
        </Group>

        {isMobile && loyaltyEnabled && (
          <Group gap={6} mt="xs">
            <Badge variant="light" color="dark" size="sm">
              {client.servicesTaken} servicios
            </Badge>
            <Badge variant="light" color="dark" size="sm">
              {client.referralsMade} referidos
            </Badge>
          </Group>
        )}
      </Paper>
    );
  }
);

ClientListItem.displayName = "ClientListItem";

export default ClientListItem;
