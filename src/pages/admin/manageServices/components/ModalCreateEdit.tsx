/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Chip,
  Button,
  ActionIcon,
  Group,
  Text,
  Autocomplete,
  SimpleGrid,
  Paper,
  Box,
  Badge,
  Switch,
  Title,
  Divider,
  ThemeIcon,
  SegmentedControl,
  Select,
} from "@mantine/core";
import { BsImage, BsTrash, BsPlusCircle } from "react-icons/bs";
import { Service, ServiceCost } from "../../../../services/serviceService";
import { ImageUploadField, PdfAndVideoFields } from "../../components/MediaUploadFields";

interface ModalCreateEditProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  onSave: (service: Service) => void;
  allTypes: string[];
  allServices: Service[];
}

const ModalCreateEdit: React.FC<ModalCreateEditProps> = ({
  isOpen,
  onClose,
  service,
  onSave,
  allTypes,
  allServices,
}) => {
  const [editingService, setEditingService] = useState<Service>({
    _id: "",
    name: "",
    type: "",
    description: "",
    price: 0,
    duration: 0,
    images: [],
    hidePrice: false,
    featured: false,
    maxConcurrentAppointments: 1,
    recommendations: "",
    followUpServiceId: null,
    followUpDays: null,
    videoUrl: "",
    ctaMode: "booking",
    whatsappQuoteMessage: "",
  });
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [pdfFile, setPdfFile] = useState<File | string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFreeService, setIsFreeService] = useState(false);
  const [hasCosts, setHasCosts] = useState(false);
  const [costsMode, setCostsMode] = useState<"simple" | "detailed">("simple");
  const [costs, setCosts] = useState<ServiceCost[]>([{ concept: "", amount: 0 }]);

  useEffect(() => {
    if (service) {
      setEditingService({
        ...service,
        type: service.type ?? "",
        videoUrl: service.videoUrl ?? "",
        ctaMode: service.ctaMode ?? "booking",
        whatsappQuoteMessage: service.whatsappQuoteMessage ?? "",
      });
      setImageFiles(service.images || []);
      setPdfFile(service.pdfUrl ?? null);
      setIsFreeService(service.price === 0);
      const existingCosts = service.costs ?? [];
      if (existingCosts.length > 0) {
        setHasCosts(true);
        setCostsMode(existingCosts.length === 1 && existingCosts[0].concept === "" ? "simple" : "detailed");
        setCosts(existingCosts);
      } else {
        setHasCosts(false);
        setCostsMode("simple");
        setCosts([{ concept: "", amount: 0 }]);
      }
    } else {
      setEditingService({
        _id: "",
        name: "",
        type: "",
        description: "",
        price: 0,
        duration: 0,
        images: [],
        hidePrice: false,
        featured: false,
        maxConcurrentAppointments: 1,
        recommendations: "",
        followUpServiceId: null,
        followUpDays: null,
        videoUrl: "",
        ctaMode: "booking",
        whatsappQuoteMessage: "",
      });
      setImageFiles([]);
      setPdfFile(null);
      setIsFreeService(false);
      setHasCosts(false);
      setCostsMode("simple");
      setCosts([{ concept: "", amount: 0 }]);
    }
  }, [service]);

  const canSave =
    editingService.name.trim().length > 1 &&
    (editingService.type ?? "").trim().length > 1 &&
    (isFreeService || (editingService.price ?? 0) > 0) &&
    (editingService.duration ?? 0) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const finalCosts = hasCosts ? costs.filter((c) => c.amount > 0) : [];
      await onSave({
        ...editingService,
        images: imageFiles as any,
        costs: finalCosts,
        pdfUrl: pdfFile as any,
        videoUrl: editingService.videoUrl?.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md">
            <BsImage size={20} />
          </ThemeIcon>
          <Title order={3}>{service ? "Editar Servicio" : "Crear Nuevo Servicio"}</Title>
        </Group>
      }
      size="xl"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper withBorder p="md" radius="md" shadow="xs">
            <Title order={5} mb="sm">Información Básica</Title>
            <Divider mb="md" />
            <Stack gap="md">
              <TextInput
                label="Nombre del servicio"
                placeholder="Ej: Manicure Gel, Masaje Relajante..."
                value={editingService.name}
                onChange={(e) => setEditingService({ ...editingService, name: e.currentTarget.value })}
                required
                withAsterisk
              />
              <Autocomplete
                label="Categoría / Tipo"
                value={editingService.type}
                onChange={(type) => setEditingService({ ...editingService, type })}
                data={allTypes}
                placeholder="Ej: Uñas, Spa, Cejas…"
                limit={10}
                required
                withAsterisk
              />
              <Switch
                label="Servicio gratuito"
                description="Este servicio no tiene costo para el cliente"
                checked={isFreeService}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setIsFreeService(checked);
                  if (checked) {
                    setEditingService({ ...editingService, price: 0, hidePrice: false });
                  }
                }}
              />
              {!isFreeService && (
                <NumberInput
                  label="Precio"
                  description="Precio base del servicio"
                  prefix="$ "
                  thousandSeparator="."
                  decimalSeparator=","
                  value={editingService.price}
                  onChange={(value) => setEditingService({ ...editingService, price: typeof value === "number" ? value : 0 })}
                  required
                  withAsterisk
                  min={1}
                />
              )}
              <Box>
                <NumberInput
                  label="Duración (minutos)"
                  description="Tiempo estimado del servicio"
                  value={editingService.duration}
                  onChange={(value) => setEditingService({ ...editingService, duration: typeof value === "number" ? value : 0 })}
                  required
                  withAsterisk
                  min={1}
                />
                <Group gap="xs" mt={8} wrap="wrap">
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <Chip
                      key={d}
                      size="sm"
                      checked={editingService.duration === d}
                      onChange={() => setEditingService({ ...editingService, duration: d })}
                      variant="filled"
                    >
                      {d} min
                    </Chip>
                  ))}
                </Group>
              </Box>
              <Textarea
                label="Descripción"
                placeholder="Describe los detalles y beneficios del servicio..."
                value={editingService.description ?? ""}
                onChange={(e) => setEditingService({ ...editingService, description: e.currentTarget.value })}
                minRows={3}
                autosize
              />
              <Textarea
                label="📋 Recomendaciones para el cliente"
                description="Se incluirán en los recordatorios de WhatsApp"
                placeholder="Ej: Llegar sin maquillaje, no consumir cafeína 2h antes, traer ropa cómoda..."
                value={editingService.recommendations ?? ""}
                onChange={(e) => setEditingService({ ...editingService, recommendations: e.currentTarget.value })}
                minRows={2}
                autosize
              />
              {!isFreeService && (
                <Switch
                  label="Ocultar precio al cliente"
                  description="El precio no será visible en la vista pública"
                  checked={editingService.hidePrice ?? false}
                  onChange={(e) => setEditingService({ ...editingService, hidePrice: e.currentTarget.checked })}
                />
              )}
              <Switch
                label="⭐ Servicio destacado"
                description="Se muestra de primero en la página pública, la reserva en línea y el asistente IA"
                checked={editingService.featured ?? false}
                onChange={(e) => setEditingService({ ...editingService, featured: e.currentTarget.checked })}
              />
                <Box>
                  <NumberInput
                    label="👥 Citas simultáneas que puede atender"
                    description="Número de clientes que el profesional puede atender en el mismo horario (ej: doctor con 2 pacientes)"
                    value={editingService.maxConcurrentAppointments ?? 1}
                    onChange={(value) => setEditingService({ ...editingService, maxConcurrentAppointments: typeof value === "number" ? value : 1 })}
                    min={1}
                    max={10}
                    disabled={false}
                  />
                  <Group gap="xs" mt={8} wrap="wrap">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Chip
                        key={n}
                        size="sm"
                        checked={(editingService.maxConcurrentAppointments ?? 1) === n}
                        onChange={() => setEditingService({ ...editingService, maxConcurrentAppointments: n })}
                        variant="filled"
                      >
                        {n} {n === 1 ? "cliente" : "clientes"}
                      </Chip>
                    ))}
                  </Group>
                </Box>

                <Divider />
                <Switch
                  label="💸 Registrar gastos del servicio"
                  description="Insumos, materiales o costos internos por servicio prestado"
                  checked={hasCosts}
                  onChange={(e) => {
                    setHasCosts(e.currentTarget.checked);
                    if (!e.currentTarget.checked) {
                      setCosts([{ concept: "", amount: 0 }]);
                      setCostsMode("simple");
                    }
                  }}
                />

                {hasCosts && (
                  <Box>
                    <Group justify="space-between" align="center" mb="xs">
                      <Text size="sm" fw={500}>Tipo de registro</Text>
                      <SegmentedControl
                        size="xs"
                        value={costsMode}
                        onChange={(v) => {
                          setCostsMode(v as "simple" | "detailed");
                          if (v === "simple") {
                            const total = costs.reduce((s, c) => s + c.amount, 0);
                            setCosts([{ concept: "", amount: total }]);
                          } else if (costs.length === 1) {
                            setCosts([{ concept: costs[0].concept || "Insumos", amount: costs[0].amount }]);
                          }
                        }}
                        data={[
                          { label: "Simple", value: "simple" },
                          { label: "Detallado", value: "detailed" },
                        ]}
                      />
                    </Group>

                    {costsMode === "simple" ? (
                      <NumberInput
                        label="Gasto total por servicio"
                        description="Costo interno en insumos o materiales"
                        prefix="$ "
                        thousandSeparator="."
                        decimalSeparator=","
                        value={costs[0]?.amount ?? 0}
                        onChange={(v) => setCosts([{ concept: "", amount: typeof v === "number" ? v : 0 }])}
                        min={0}
                      />
                    ) : (
                      <Stack gap="xs">
                        {costs.map((cost, idx) => (
                          <Group key={idx} gap="xs" align="flex-end" wrap="nowrap">
                            <TextInput
                              placeholder="Concepto (ej: tinte, guantes)"
                              value={cost.concept}
                              onChange={(e) => {
                                const next = [...costs];
                                next[idx] = { ...next[idx], concept: e.currentTarget.value };
                                setCosts(next);
                              }}
                              style={{ flex: 1 }}
                            />
                            <NumberInput
                              placeholder="$ monto"
                              prefix="$ "
                              thousandSeparator="."
                              decimalSeparator=","
                              value={cost.amount}
                              onChange={(v) => {
                                const next = [...costs];
                                next[idx] = { ...next[idx], amount: typeof v === "number" ? v : 0 };
                                setCosts(next);
                              }}
                              min={0}
                              w={130}
                            />
                            {costs.length > 1 && (
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => setCosts(costs.filter((_, i) => i !== idx))}
                              >
                                <BsTrash size={14} />
                              </ActionIcon>
                            )}
                          </Group>
                        ))}
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<BsPlusCircle size={14} />}
                          onClick={() => setCosts([...costs, { concept: "", amount: 0 }])}
                        >
                          Agregar ítem
                        </Button>
                        <Text size="xs" c="dimmed" ta="right">
                          Total gastos: $ {costs.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                        </Text>
                      </Stack>
                    )}
                  </Box>
                )}
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md" shadow="xs">
            <Stack gap="md">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Title order={5}>Imágenes del Servicio</Title>
                  {imageFiles.length > 0 && (
                    <Badge variant="light" size="lg">{imageFiles.length} {imageFiles.length === 1 ? 'imagen' : 'imágenes'}</Badge>
                  )}
                </Group>
                <Divider mb="md" />
                <ImageUploadField images={imageFiles} onChange={setImageFiles} />
              </Box>
            </Stack>
          </Paper>
        </SimpleGrid>

        <Paper withBorder p="md" radius="md" shadow="xs">
          <Title order={5} mb="sm">📄 Material adicional (opcional)</Title>
          <Divider mb="md" />
          <PdfAndVideoFields
            pdfFile={pdfFile}
            onPdfChange={setPdfFile}
            videoUrl={editingService.videoUrl ?? ""}
            onVideoUrlChange={(v) => setEditingService({ ...editingService, videoUrl: v })}
            videoDescription="Se muestra incrustado en el detalle del servicio"
          />
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="xs">
          <Title order={5} mb="sm">💬 Botón de acción (CTA)</Title>
          <Divider mb="md" />
          <Stack gap="md">
            <SegmentedControl
              value={editingService.ctaMode ?? "booking"}
              onChange={(v) =>
                setEditingService({ ...editingService, ctaMode: v as "booking" | "whatsapp_quote" })
              }
              data={[
                { value: "booking", label: "Reservar en línea" },
                { value: "whatsapp_quote", label: "Cotizar por WhatsApp" },
              ]}
              fullWidth
            />
            {editingService.ctaMode === "whatsapp_quote" && (
              <Textarea
                label="Mensaje prellenado de WhatsApp (opcional)"
                description="Se abrirá el WhatsApp de la organización con este texto ya escrito"
                placeholder={`Hola, quiero cotizar ${editingService.name || "este servicio"}`}
                autosize
                minRows={2}
                value={editingService.whatsappQuoteMessage ?? ""}
                onChange={(e) =>
                  setEditingService({ ...editingService, whatsappQuoteMessage: e.currentTarget.value })
                }
              />
            )}
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="xs">
          <Title order={5} mb="sm">🔁 Recordatorio de seguimiento (opcional)</Title>
          <Divider mb="md" />
          <Stack gap="md">
            <Select
              label="Servicio de seguimiento"
              description="Si el cliente no vuelve a agendar este servicio, se le enviará un recordatorio por WhatsApp"
              placeholder="Sin seguimiento configurado"
              clearable
              searchable
              data={allServices.map((s) => ({ value: s._id, label: s.name }))}
              value={editingService.followUpServiceId ?? null}
              onChange={(value) =>
                setEditingService({
                  ...editingService,
                  followUpServiceId: value,
                  followUpDays: value ? (editingService.followUpDays ?? 20) : null,
                })
              }
            />
            {editingService.followUpServiceId && (
              <Box>
                <NumberInput
                  label="Días de espera"
                  description="Cuántos días después de esta cita se enviará el recordatorio"
                  value={editingService.followUpDays ?? 20}
                  onChange={(value) => setEditingService({ ...editingService, followUpDays: typeof value === "number" ? value : 20 })}
                  min={1}
                  max={365}
                />
                <Group gap="xs" mt={8} wrap="wrap">
                  {[15, 20, 30, 45, 60].map((d) => (
                    <Chip
                      key={d}
                      size="sm"
                      checked={editingService.followUpDays === d}
                      onChange={() => setEditingService({ ...editingService, followUpDays: d })}
                      variant="filled"
                    >
                      {d} días
                    </Chip>
                  ))}
                </Group>
              </Box>
            )}
          </Stack>
        </Paper>

        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {!canSave && "Completa todos los campos requeridos (*)"}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose} size="md">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!canSave} size="md">
              {service ? "💾 Guardar cambios" : "✨ Crear servicio"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
    </>
  );
};

export default ModalCreateEdit;
