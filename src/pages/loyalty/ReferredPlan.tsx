import React from 'react';
import { Box, Group, Text, Progress } from '@mantine/core';

interface ReferredPlanProps {
  referralsMade: number;
  totalReferrals: number;
  referredReward: string;
}

const ReferredPlan: React.FC<ReferredPlanProps> = ({ referralsMade, totalReferrals, referredReward }) => {
  return (
    <Box
      bg="#1A202C"
      p="xl"
      m="auto"
        mt="sm"
      style={{
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        color: '#E2E8F0',
      }}
    >
      <Group>
        <Text size="xl" fw={700}>
          Plan de Referidos
        </Text>
        <Text size="md" c="dimmed">
          {referralsMade} de {totalReferrals} referidos hechos
        </Text>
      </Group>

      <Progress
        value={(referralsMade / totalReferrals) * 100}
        size="lg"
        mt="md"
        color={referralsMade === totalReferrals ? 'green' : 'blue'}
      />

      {referralsMade === totalReferrals ? (
        <Text mt="md" c="green" fw={500}>
          ¡Felicidades! Has alcanzado {totalReferrals} referidos. Recibe {referredReward}.
        </Text>
      ) : (
        <Text mt="md" c="dimmed">
          Completa {totalReferrals - referralsMade} referido(s) más para obtener {referredReward}.
        </Text>
      )}
    </Box>
  );
};

export default ReferredPlan;
