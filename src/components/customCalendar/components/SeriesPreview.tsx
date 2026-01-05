import { FC } from 'react';
import {
  Stack,
  Paper,
  Text,
  Badge,
  Group,
  ScrollArea,
  Alert,
  Divider,
  Box,
  Flex
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconX, IconBan } from '@tabler/icons-react';
import { SeriesPreview as SeriesPreviewType } from '../../../services/appointmentService';

interface SeriesPreviewProps {
  preview: SeriesPreviewType;
  loading?: boolean;
}

const STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    color: 'green',
    icon: IconCheck,
    description: 'Se creará esta cita'
  },
  no_work: {
    label: 'No disponible',
    color: 'yellow',
    icon: IconClock,
    description: 'Fuera del horario de trabajo'
  },
  conflict: {
    label: 'Conflicto',
    color: 'red',
    icon: IconX,
    description: 'Ya existe una cita en este horario'
  },
  error: {
    label: 'Error',
    color: 'gray',
    icon: IconBan,
    description: 'Error al validar'
  }
};

const SeriesPreview: FC<SeriesPreviewProps> = ({ preview, loading = false }) => {
  const { occurrences, totalOccurrences, availableCount } = preview;

  if (loading) {
    return (
      <Paper p="md" withBorder>
        <Text size="sm" c="dimmed" ta="center">
          Generando preview...
        </Text>
      </Paper>
    );
  }

  if (!occurrences || occurrences.length === 0) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="blue">
        No se generaron ocurrencias con los parámetros seleccionados
      </Alert>
    );
  }

  // Calcular estadísticas desde las ocurrencias
  const stats = occurrences.reduce((acc, occ) => {
    acc[occ.status] = (acc[occ.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const noWorkCount = stats.no_work || 0;
  const conflictCount = stats.conflict || 0;
  const errorCount = stats.error || 0;

  return (
    <Paper p="md" withBorder>
      <Stack gap="md">
        {/* Header con resumen */}
        <Box>
          <Text size="sm" fw={700} mb="xs">
            Preview de citas ({totalOccurrences} ocurrencias)
          </Text>
          
          <Group gap="xs">
            <Badge color="green" variant="light" size="sm">
              ✓ {availableCount} disponibles
            </Badge>
            {noWorkCount > 0 && (
              <Badge color="yellow" variant="light" size="sm">
                ⏰ {noWorkCount} fuera de horario
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge color="red" variant="light" size="sm">
                ✕ {conflictCount} en conflicto
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge color="gray" variant="light" size="sm">
                ⚠ {errorCount} con error
              </Badge>
            )}
          </Group>

          <Divider my="sm" />

          <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
            Se crearán <strong>{availableCount}</strong> de {totalOccurrences} citas.
            Las citas fuera de horario o en conflicto serán omitidas automáticamente.
          </Alert>
        </Box>

        {/* Lista de ocurrencias */}
        <ScrollArea h={300} type="auto">
          <Stack gap="xs">
            {occurrences.map((occurrence, index) => {
              const config = STATUS_CONFIG[occurrence.status] || STATUS_CONFIG.error;
              const Icon = config.icon;
              const willBeCreated = occurrence.status === 'available';

              return (
                <Paper
                  key={index}
                  p="sm"
                  withBorder
                  style={{
                    borderLeft: `4px solid var(--mantine-color-${config.color}-6)`,
                    opacity: willBeCreated ? 1 : 0.7,
                    backgroundColor: willBeCreated ? '#f8f9fa' : 'white'
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Group gap="sm">
                      <Icon size={18} color={`var(--mantine-color-${config.color}-6)`} />
                      
                      <Box>
                        <Text size="sm" fw={600}>
                          {new Date(occurrence.startDate).toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {new Date(occurrence.startDate).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          {occurrence.endDate && ` - ${new Date(occurrence.endDate).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}`}
                        </Text>
                      </Box>
                    </Group>

                    <Box>
                      <Badge color={config.color} variant="light" size="sm">
                        {config.label}
                      </Badge>
                      {occurrence.reason && (
                        <Text size="xs" c="dimmed" ta="right" mt={4}>
                          {occurrence.reason}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                </Paper>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
};

export default SeriesPreview;
