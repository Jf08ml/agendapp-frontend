/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
import {
  Container,
  Title,
  Text,
  Paper,
  Tabs,
  Textarea,
  Button,
  Alert,
  Badge,
  Stack,
  Group,
  ActionIcon,
  Tooltip,
  Divider,
  Card,
  Loader,
  Box,
  rem,
  Modal,
  Switch,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconRestore,
  IconEye,
  IconCopy,
  IconInfoCircle,
  IconArrowLeft,
  IconDotsVertical,
  IconPhone,
  IconVideo,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import whatsappTemplateService, {
  WhatsappTemplates,
  WhatsappTemplateSettings,
} from "../../services/whatsappTemplateService";
import { handleAxiosError } from "../../utils/handleAxiosError";

const templateInfo = {
  scheduleAppointment: {
    title: "Confirmación de Cita (No utilizado)",
    description: "Mensaje enviado cuando se agenda una cita individual",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha y hora de la cita" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar la cita" },
    ],
  },
  scheduleAppointmentBatch: {
    title: "Confirmación de Citas",
    description: "Mensaje enviado cuando se agendan varias citas juntas",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{dateRange}}", desc: "Rango de fechas de las citas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{servicesList}}", desc: "Lista de servicios agendados" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar las citas" },
    ],
  },
  recurringAppointmentSeries: {
    title: "Mensaje de citas recurrentes",
    description: "Mensaje enviado cuando se crea una serie de citas recurrentes (semanal, quincenal, etc.)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{employee}}", desc: "Nombre del profesional" },
      { name: "{{appointmentsList}}", desc: "Lista completa de citas con fechas y horarios" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar todas o algunas citas" },
    ],
  },
  reminder: {
    title: "Primer recordatorio",
    description: "Mensaje de recordatorio enviado antes de la cita (ej: 24 horas antes)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{count}}", desc: "Número de citas (1, 2, 3...)" },
      { name: "{{cita_pal}}", desc: "'cita' o 'citas' (automático)" },
      { name: "{{agendada_pal}}", desc: "'agendada' o 'agendadas' (automático)" },
      { name: "{{date_range}}", desc: "Fecha o rango de fechas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{services_list}}", desc: "Lista de servicios" },
      { name: "{{employee}}", desc: "Nombre del profesional o profesionales" },
      { name: "{{manage_block}}", desc: "Enlace para confirmar o cancelar la cita" },
      { name: "{{recommendations}}", desc: "Recomendaciones del servicio (si existen)" },
    ],
  },
  secondReminder: {
    title: "Segundo Recordatorio",
    description: "Mensaje de segundo recordatorio enviado poco antes de la cita (ej: 2 horas antes)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{count}}", desc: "Número de citas (1, 2, 3...)" },
      { name: "{{cita_pal}}", desc: "'cita' o 'citas' (automático)" },
      { name: "{{agendada_pal}}", desc: "'agendada' o 'agendadas' (automático)" },
      { name: "{{date_range}}", desc: "Fecha o rango de fechas" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{services_list}}", desc: "Lista de servicios" },
      { name: "{{employee}}", desc: "Nombre del profesional o profesionales" },
      { name: "{{manage_block}}", desc: "Enlace para confirmar o cancelar la cita" },
      { name: "{{recommendations}}", desc: "Recomendaciones del servicio (si existen)" },
    ],
  },
  statusReservationApproved: {
    title: "Reserva Aprobada",
    description: "Mensaje cuando una reserva es aprobada",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha de la reserva" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
      { name: "{{address}}", desc: "Dirección del negocio" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{cancellationLink}}", desc: "Enlace para cancelar" },
    ],
  },
  statusReservationRejected: {
    title: "Reserva Rechazada",
    description: "Mensaje cuando una reserva no puede ser confirmada",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{date}}", desc: "Fecha de la reserva" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  clientConfirmationAck: {
    title: "Agradecimiento por Confirmación",
    description: "Mensaje enviado al cliente cuando confirma su asistencia",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{appointments_list}}", desc: "Lista de citas con fecha/hora" },
    ],
  },
  clientCancellationAck: {
    title: "Aviso de Cancelación al Cliente",
    description: "Mensaje enviado al cliente cuando cancela su(s) cita(s)",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{appointments_list}}", desc: "Lista de citas con fecha/hora" },
    ],
  },
  clientNoShowAck: {
    title: "Aviso de No Asistencia",
    description: "Mensaje enviado al cliente cuando se marca que no asistió a su cita",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{service}}", desc: "Nombre del servicio" },
      { name: "{{date}}", desc: "Fecha y hora de la cita" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  loyaltyServiceReward: {
    title: "🏆 Premio de Fidelidad (Servicios)",
    description: "Mensaje enviado al cliente cuando completa su meta de servicios y gana una recompensa",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{reward}}", desc: "Descripción de la recompensa ganada" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
  loyaltyReferralReward: {
    title: "🎁 Premio de Referidos",
    description: "Mensaje enviado al cliente cuando completa su meta de referidos y gana una recompensa",
    variables: [
      { name: "{{names}}", desc: "Nombre del cliente" },
      { name: "{{reward}}", desc: "Descripción de la recompensa ganada" },
      { name: "{{organization}}", desc: "Nombre del negocio" },
    ],
  },
};

type TemplateType = keyof WhatsappTemplates;

// Mover templateKeys fuera del componente para que sea constante
const templateKeys = Object.keys(templateInfo) as TemplateType[];

export default function WhatsappTemplateEditor() {
  const { organization } = useSelector((state: RootState) => state.organization);

  // CSS para layout responsive
  const responsiveStyles = `
    .template-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: ${rem(20)};
      align-items: start;
    }
    
    .variables-panel {
      position: relative;
    }
    
    @media (min-width: 769px) {
      .template-layout {
        grid-template-columns: 1fr 320px;
      }
      
      .variables-panel {
        position: sticky;
        top: ${rem(20)};
      }
    }
  `;
  
  const [activeTab, setActiveTab] = useState<string | null>("scheduleAppointmentBatch");
  const [templates, setTemplates] = useState<WhatsappTemplates | null>(null);
  const [defaultTemplates, setDefaultTemplates] = useState<Record<string, string>>({});
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");
  const [, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  
  // 🆕 Estado para configuración de envíos
  const [templateSettings, setTemplateSettings] = useState<WhatsappTemplateSettings>({
    scheduleAppointment: true,
    scheduleAppointmentBatch: true,
    recurringAppointmentSeries: true,
    reminder: true,
    secondReminder: true,
    statusReservationApproved: false,
    statusReservationRejected: false,
    clientConfirmationAck: true,
    clientCancellationAck: true,
    clientNoShowAck: true,
    loyaltyServiceReward: true,
    loyaltyReferralReward: true,
  });

  const loadTemplates = useCallback(async () => {
    if (!organization?._id) return;

    try {
      setLoading(true);
      const data = await whatsappTemplateService.getTemplates(organization._id);
      setTemplates(data.templates);
      setDefaultTemplates(data.defaultTemplates);
      
      // 🆕 Cargar configuración de envíos
      const settings = await whatsappTemplateService.getTemplateSettings(organization._id);
      setTemplateSettings(settings);
      
      // Inicializar templates editados con los actuales
      const edited: Record<string, string> = {};
      templateKeys.forEach((key) => {
        edited[key] = data.templates[key].content;
      });
      setEditedTemplates(edited);
    } catch (error) {
      try {
        handleAxiosError(error, "Error al cargar plantillas");
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  }, [organization?._id]); // Remover templateKeys de las dependencias

  useEffect(() => {
    if (organization?._id) {
      loadTemplates();
    }
  }, [loadTemplates]); // Ahora loadTemplates solo cambia cuando organization._id cambia

  const handleTemplateChange = (templateKey: string, value: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [templateKey]: value,
    }));
    setShowPreview(false);
  };

  const handleSave = async (templateKey: string) => {
    if (!organization?._id) return;

    try {
      setSaving(true);
      await whatsappTemplateService.updateTemplate(
        organization._id,
        templateKey,
        editedTemplates[templateKey]
      );
      
      setMessage({ type: "success", text: "Plantilla guardada correctamente" });
      await loadTemplates();
    } catch (error) {
      try {
        handleAxiosError(error, "Error al guardar plantilla");
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (templateKey: string) => {
    if (!organization?._id) return;

    try {
      setSaving(true);
      await whatsappTemplateService.resetTemplate(organization._id, templateKey);
      
      setMessage({ type: "success", text: "Plantilla restaurada a versión por defecto" });
      await loadTemplates();
    } catch (error) {
      try {
        handleAxiosError(error, "Error al restaurar plantilla");
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async (templateKey: string) => {
    try {
      const previewText = await whatsappTemplateService.previewTemplate(
        templateKey,
        editedTemplates[templateKey]
      );
      setPreview(previewText);
      setPreviewModalOpen(true);
    } catch (error) {
      try {
        handleAxiosError(error, "Error al generar preview");
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      }
    }
  };

  // 🆕 Guardar configuración de envíos
  const handleSaveSettings = async () => {
    if (!organization?._id) return;

    try {
      setSaving(true);
      
      // Filtrar solo los campos válidos (sin _id, __v, etc.)
      const validSettings: WhatsappTemplateSettings = {
        scheduleAppointment: templateSettings.scheduleAppointment,
        scheduleAppointmentBatch: templateSettings.scheduleAppointmentBatch,
        recurringAppointmentSeries: templateSettings.recurringAppointmentSeries,
        reminder: templateSettings.reminder,
        secondReminder: templateSettings.secondReminder,
        statusReservationApproved: templateSettings.statusReservationApproved,
        statusReservationRejected: templateSettings.statusReservationRejected,
        clientConfirmationAck: templateSettings.clientConfirmationAck,
        clientCancellationAck: templateSettings.clientCancellationAck,
      };
      
      await whatsappTemplateService.updateTemplateSettings(
        organization._id,
        validSettings
      );
      
      setMessage({ type: "success", text: "Configuración de envíos actualizada correctamente" });
    } catch (error) {
      try {
        handleAxiosError(error, "Error al guardar configuración");
      } catch (err) {
        setMessage({ type: "error", text: (err as Error).message });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopyDefault = (templateKey: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [templateKey]: defaultTemplates[templateKey],
    }));
    setMessage({ type: "success", text: "Plantilla por defecto copiada al editor" });
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
          <Loader size="lg" />
        </Box>
      </Container>
    );
  }

  if (!templates) {
    return (
      <Container size="lg" py="xl">
        <Alert color="red" title="Error">
          Error al cargar las plantillas
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <style>{responsiveStyles}</style>
      <Container size="xl" py="md">
        <Stack gap="md">
        <Box>
          <Title order={2} mb="xs">📱 Editor de Mensajes de WhatsApp</Title>
          <Text c="dimmed" size="sm">
            Personaliza los mensajes que se envían automáticamente a tus clientes
          </Text>
        </Box>

        {message && (
          <Alert
            color={message.type === "error" ? "red" : "green"}
            title={message.type === "error" ? "Error" : "Éxito"}
            withCloseButton
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Paper withBorder radius="md" p={0}>
          <Tabs value={activeTab} onChange={setActiveTab} orientation="horizontal" variant="default">
            <Tabs.List 
              px="md" 
              pt="sm"
              style={{ 
                overflowX: 'auto', 
                flexWrap: 'nowrap',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {templateKeys.map((key) => {
                const isDisabled = key === 'scheduleAppointment' || key === 'statusReservationApproved' || key === 'statusReservationRejected';
                return (
                  <Tabs.Tab 
                    key={key} 
                    value={key}
                    disabled={isDisabled}
                    style={{
                      whiteSpace: 'nowrap',
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    styles={{
                      tab: {
                        '@media (max-width: 768px)': {
                          padding: `${rem(12)} ${rem(16)}`,
                          fontSize: rem(15),
                        },
                      },
                    }}
                  >
                    <Text size="sm" fw={500}>{templateInfo[key].title}</Text>
                  </Tabs.Tab>
                );
              })}
              {/* 🆕 Nueva pestaña de configuración */}
              <Tabs.Tab 
                value="settings"
                style={{ whiteSpace: 'nowrap' }}
                styles={{
                  tab: {
                    '@media (max-width: 768px)': {
                      padding: `${rem(12)} ${rem(16)}`,
                      fontSize: rem(15),
                    },
                  },
                }}
              >
                <Text size="sm" fw={500}>⚙️ Configuración</Text>
              </Tabs.Tab>
            </Tabs.List>

            {templateKeys.map((key) => (
              <Tabs.Panel 
                key={key} 
                value={key}
                styles={{
                  panel: {
                    '@media (max-width: 768px)': {
                      padding: 'var(--mantine-spacing-sm)',
                    },
                  },
                }}
                p="md"
              >
                <Stack gap="lg">
                  {/* Descripción */}
                  <Alert icon={<IconInfoCircle size={20} />} color="blue" variant="light" radius="md">
                    <Text size="sm" fw={500}>
                      {templateInfo[key].description}
                    </Text>
                  </Alert>

                  {/* Layout Principal: Editor + Variables */}
                  <Box className="template-layout">
                    {/* Columna Izquierda: Editor y Preview */}
                    <Stack gap="md">
                      {/* Editor */}
                      <Box>
                        <Group justify="space-between" mb="sm">
                          <Group gap="xs">
                            <Text fw={600} size="lg">✏️ Editor de Mensaje</Text>
                            {templates[key].isCustom ? (
                              <Badge color="green" variant="light" size="sm">
                                Personalizado
                              </Badge>
                            ) : (
                              <Badge color="gray" variant="light" size="sm">
                                Por Defecto
                              </Badge>
                            )}
                          </Group>
                          <Tooltip label="Copiar plantilla por defecto como punto de partida">
                            <Button
                              variant="subtle"
                              size="xs"
                              leftSection={<IconCopy size={16} />}
                              onClick={() => handleCopyDefault(key)}
                            >
                              Copiar plantilla original
                            </Button>
                          </Tooltip>
                        </Group>

                        <Textarea
                          value={editedTemplates[key] || ""}
                          onChange={(e) => handleTemplateChange(key, e.target.value)}
                          placeholder="Escribe tu mensaje aquí..."
                          minRows={16}
                          autosize
                          maxRows={25}
                          styles={{
                            input: {
                              fontFamily: "'Courier New', monospace",
                              fontSize: rem(14),
                              lineHeight: 1.6,
                              '@media (max-width: 768px)': {
                                fontSize: rem(15),
                                padding: rem(12),
                                minHeight: rem(300),
                              },
                            },
                          }}
                        />

                        <Group 
                          gap="xs" 
                          mt="md"
                          styles={{
                            root: {
                              '@media (max-width: 768px)': {
                                flexDirection: 'column',
                                gap: rem(12),
                                '& > button': {
                                  width: '100%',
                                  height: rem(48),
                                  fontSize: rem(15),
                                },
                              },
                            },
                          }}
                        >
                          <Button
                            size="md"
                            leftSection={<IconDeviceFloppy size={20} />}
                            onClick={() => handleSave(key)}
                            loading={saving}
                          >
                            Guardar Cambios
                          </Button>
                          <Button
                            size="md"
                            variant="light"
                            leftSection={<IconEye size={20} />}
                            onClick={() => handlePreview(key)}
                          >
                            Vista Previa
                          </Button>
                          {templates[key].isCustom && (
                            <Button
                              size="md"
                              variant="outline"
                              color="orange"
                              leftSection={<IconRestore size={20} />}
                              onClick={() => handleRestore(key)}
                              loading={saving}
                            >
                              Restaurar Original
                            </Button>
                          )}
                        </Group>
                      </Box>
                    </Stack>

                    {/* Columna Derecha: Variables Disponibles (sticky en desktop, accordion en mobile) */}
                    <Box className="variables-panel">
                      <Card withBorder radius="md" p="md">
                        <Box>
                          <Text fw={600} size="md" mb="sm">🏷️ Variables Disponibles</Text>
                          <Text size="xs" c="dimmed" mb="md" display={{ base: 'block', md: 'block' }}>
                            Haz clic en una variable para copiarla. Se reemplazarán automáticamente con datos reales.
                          </Text>
                        </Box>
                        <Divider mb="md" />
                        <Stack gap="sm">
                          {templateInfo[key].variables.map((v) => (
                            <Box
                              key={v.name}
                              p="xs"
                              style={{
                                borderRadius: rem(6),
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                              onClick={() => {
                                navigator.clipboard.writeText(v.name);
                                setMessage({ type: "success", text: `Copiado: ${v.name}` });
                                setTimeout(() => setMessage(null), 2000);
                              }}
                            >
                              <Badge
                                variant="light"
                                color="blue"
                                size="md"
                                fullWidth
                                style={{ 
                                  fontFamily: "monospace",
                                  cursor: "pointer",
                                }}
                              >
                                {v.name}
                              </Badge>
                              <Text size="xs" c="dimmed" mt={4} pl={4}>
                                {v.desc}
                              </Text>
                            </Box>
                          ))}
                        </Stack>
                      </Card>
                    </Box>
                  </Box>
                </Stack>
              </Tabs.Panel>
            ))}

            {/* 🆕 Panel de Configuración de Envíos */}
            <Tabs.Panel value="settings" p="md">
              <Stack gap="lg">
                <Alert icon={<IconInfoCircle size={20} />} color="blue" variant="light" radius="md">
                  <Text size="sm" fw={500}>
                    Aquí puedes habilitar o deshabilitar el envío automático de confirmación 
                    para cada tipo de cita. Los recordatorios siempre se enviarán.
                  </Text>
                </Alert>

                <Stack gap="md">
                  {/* Confirmación Única */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Confirmación de Cita Única</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando se crea una cita individual
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.scheduleAppointment ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            scheduleAppointment: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Confirmación Múltiple */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Confirmación de Citas Múltiples</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando se crean varias citas juntas
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.scheduleAppointmentBatch ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            scheduleAppointmentBatch: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Confirmación Recurrente */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Confirmación de Citas Recurrentes</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando se crea una serie de citas recurrentes
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.recurringAppointmentSeries ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            recurringAppointmentSeries: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Recordatorio (Siempre activo) */}
                  <Alert icon={<IconAlertCircle size={20} />} color="green" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Recordatorio de Citas</Text>
                        <Text size="sm" c="dimmed">
                          Siempre activo - se envía automáticamente 24h antes de cada cita
                        </Text>
                      </Box>
                      <Badge color="green" variant="filled">
                        Siempre Activo
                      </Badge>
                    </Group>
                  </Alert>

                  {/* Agradecimiento por Confirmación */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Agradecimiento por Confirmación</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando el cliente confirma su asistencia
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.clientConfirmationAck ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            clientConfirmationAck: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Aviso de Cancelación al Cliente */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Aviso de Cancelación al Cliente</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando el cliente cancela su(s) cita(s)
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.clientCancellationAck ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            clientCancellationAck: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Aviso de No Asistencia */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>Aviso de No Asistencia</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando se marca que el cliente no asistió a su cita
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.clientNoShowAck ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            clientNoShowAck: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  <Divider label="Plan de Fidelidad" labelPosition="center" />

                  {/* Premio de Fidelidad - Servicios */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>🏆 Premio de Fidelidad (Servicios)</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando el cliente completa su meta de servicios
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.loyaltyServiceReward ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            loyaltyServiceReward: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Premio de Referidos */}
                  <Paper withBorder p="md" radius="md">
                    <Group justify="space-between">
                      <Box>
                        <Text fw={600}>🎁 Premio de Referidos</Text>
                        <Text size="sm" c="dimmed">
                          Se envía cuando el cliente completa su meta de referidos
                        </Text>
                      </Box>
                      <Switch
                        checked={templateSettings.loyaltyReferralReward ?? true}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          setTemplateSettings(prev => ({
                            ...prev,
                            loyaltyReferralReward: checked
                          }));
                        }}
                        size="lg"
                      />
                    </Group>
                  </Paper>

                  {/* Botón de guardar */}
                  <Group gap="xs" mt="md">
                    <Button
                      size="md"
                      leftSection={<IconDeviceFloppy size={20} />}
                      onClick={handleSaveSettings}
                      loading={saving}
                    >
                      💾 Guardar Configuración
                    </Button>
                  </Group>
                </Stack>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Stack>

      {/* Modal de Vista Previa estilo WhatsApp */}
      <Modal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        size="md"
        padding={0}
        radius="lg"
        centered
        withCloseButton={false}
        styles={{
          body: { padding: 0 },
          content: { overflow: "hidden" },
        }}
      >
        {/* Simulación de Teléfono */}
        <Box
          style={{
            background: "linear-gradient(180deg, #1e1e1e 0%, #2d2d2d 100%)",
            padding: rem(16),
            borderRadius: rem(12),
          }}
        >
          {/* Pantalla del Teléfono */}
          <Box
            style={{
              background: "white",
              borderRadius: rem(32),
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              position: "relative",
            }}
          >
            {/* Notch del teléfono */}
            <Box
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: rem(120),
                height: rem(24),
                background: "black",
                borderRadius: `0 0 ${rem(16)} ${rem(16)}`,
                zIndex: 10,
              }}
            />

            {/* Header de WhatsApp */}
            <Box
              style={{
                background: "#075E54",
                padding: `${rem(40)} ${rem(16)} ${rem(12)}`,
                color: "white",
              }}
            >
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ActionIcon variant="transparent" color="white" size="lg">
                    <IconArrowLeft size={24} />
                  </ActionIcon>
                  <Box
                    style={{
                      width: rem(40),
                      height: rem(40),
                      borderRadius: "50%",
                      background: "#25D366",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: rem(18),
                    }}
                  >
                    {organization?.name?.charAt(0).toUpperCase() || "A"}
                  </Box>
                  <Box>
                    <Text fw={600} size="md" c="white">
                      {organization?.name || "Mi Negocio"}
                    </Text>
                    <Text size="xs" c="rgba(255,255,255,0.7)">
                      en línea
                    </Text>
                  </Box>
                </Group>
                <Group gap="md">
                  <ActionIcon variant="transparent" color="white">
                    <IconVideo size={22} />
                  </ActionIcon>
                  <ActionIcon variant="transparent" color="white">
                    <IconPhone size={22} />
                  </ActionIcon>
                  <ActionIcon variant="transparent" color="white">
                    <IconDotsVertical size={22} />
                  </ActionIcon>
                </Group>
              </Group>
            </Box>

            {/* Área de Conversación */}
            <Box
              style={{
                background: "#ECE5DD",
                backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMGw0MCA0ME0wIDQwbDQwLTQwIiBzdHJva2U9IiNkZGQ3Y2UiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjMiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')",
                padding: rem(16),
                minHeight: rem(400),
                maxHeight: rem(500),
                overflowY: "auto",
              }}
            >
              {/* Burbuja del Mensaje */}
              <Box style={{ display: "flex", justifyContent: "flex-start", marginBottom: rem(8) }}>
                <Box
                  style={{
                    background: "white",
                    borderRadius: `${rem(8)} ${rem(8)} ${rem(8)} ${rem(2)}`,
                    padding: rem(10),
                    maxWidth: "80%",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                    position: "relative",
                  }}
                >
                  <Text
                    size="sm"
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      lineHeight: 1.5,
                      color: "#303030",
                    }}
                  >
                    {preview}
                  </Text>
                  <Group gap={4} justify="flex-end" mt={4}>
                    <Text size="xs" c="dimmed" style={{ fontSize: rem(11) }}>
                      {new Date().toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </Group>
                </Box>
              </Box>

              {/* Nota informativa */}
              <Box mt="xl" style={{ textAlign: "center" }}>
                <Paper
                  p="xs"
                  radius="md"
                  bg="rgba(255,255,255,0.8)"
                  style={{ display: "inline-block" }}
                >
                  <Text size="xs" c="dimmed">
                    💡 Vista previa con datos de ejemplo
                  </Text>
                </Paper>
              </Box>
            </Box>

            {/* Barra de Input (simulada) */}
            <Box
              style={{
                background: "#F0F0F0",
                padding: rem(8),
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <Group gap="xs">
                <Box
                  style={{
                    flex: 1,
                    background: "white",
                    borderRadius: rem(20),
                    padding: `${rem(8)} ${rem(16)}`,
                    border: "1px solid #ddd",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    Escribe un mensaje...
                  </Text>
                </Box>
                <ActionIcon
                  size="lg"
                  radius="xl"
                  variant="filled"
                  color="teal"
                  style={{ background: "#25D366" }}
                >
                  <Text size="lg">🎤</Text>
                </ActionIcon>
              </Group>
            </Box>
          </Box>

          {/* Botón para cerrar */}
          <Button
            fullWidth
            mt="md"
            variant="light"
            onClick={() => setPreviewModalOpen(false)}
          >
            Cerrar Vista Previa
          </Button>
        </Box>
      </Modal>
      </Container>
    </>
  );
}
