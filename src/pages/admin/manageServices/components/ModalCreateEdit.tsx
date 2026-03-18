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
  Image,
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
  Tooltip,
  Center,
  ThemeIcon,
  SegmentedControl,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { BiImageAdd, BiSolidXCircle, BiStar } from "react-icons/bi";
import { BsImage, BsArrowLeft, BsArrowRight, BsTrash, BsPlusCircle } from "react-icons/bs";
import { Service, ServiceCost } from "../../../../services/serviceService";

interface ModalCreateEditProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  onSave: (service: Service) => void;
  allTypes: string[];
}

const ModalCreateEdit: React.FC<ModalCreateEditProps> = ({
  isOpen,
  onClose,
  service,
  onSave,
  allTypes,
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
    maxConcurrentAppointments: 1,
    recommendations: "",
  });
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [saving, setSaving] = useState(false);
  const [isFreeService, setIsFreeService] = useState(false);
  const [hasCosts, setHasCosts] = useState(false);
  const [costsMode, setCostsMode] = useState<"simple" | "detailed">("simple");
  const [costs, setCosts] = useState<ServiceCost[]>([{ concept: "", amount: 0 }]);

  useEffect(() => {
    if (service) {
      setEditingService(service);
      setImageFiles(service.images || []);
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
        maxConcurrentAppointments: 1,
        recommendations: "",
      });
      setImageFiles([]);
      setIsFreeService(false);
      setHasCosts(false);
      setCostsMode("simple");
      setCosts([{ concept: "", amount: 0 }]);
    }
  }, [service]);

  const handleDrop = (files: File[]) => {
    setImageFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImageLeft = (index: number) => {
    if (index === 0) return;
    setImageFiles((prev) => {
      const newArr = [...prev];
      [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
      return newArr;
    });
  };

  const moveImageRight = (index: number) => {
    if (index === imageFiles.length - 1) return;
    setImageFiles((prev) => {
      const newArr = [...prev];
      [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
      return newArr;
    });
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    setImageFiles((prev) => {
      const newArr = [...prev];
      const [item] = newArr.splice(index, 1);
      newArr.unshift(item);
      return newArr;
    });
  };

  const canSave =
    editingService.name.trim().length > 1 &&
    editingService.type.trim().length > 1 &&
    (isFreeService || (editingService.price ?? 0) > 0) &&
    (editingService.duration ?? 0) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const finalCosts = hasCosts ? costs.filter((c) => c.amount > 0) : [];
      await onSave({ ...editingService, images: imageFiles as any, costs: finalCosts });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
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
                <Dropzone
                  onDrop={handleDrop}
                  accept={IMAGE_MIME_TYPE}
                  multiple
                  styles={{ inner: { paddingBlock: 20 } }}
                >
                  <Center>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size={60} radius="md" variant="light">
                        <BiImageAdd size={32} />
                      </ThemeIcon>
                      <div>
                        <Text size="sm" fw={600} ta="center">Arrastra imágenes aquí o haz clic</Text>
                        <Text size="xs" c="dimmed" ta="center">Formatos: JPEG, PNG, WebP</Text>
                      </div>
                    </Stack>
                  </Center>
                </Dropzone>
              </Box>

              {imageFiles.length > 0 && (
                <Box>
                  <Text size="sm" c="dimmed" mb="xs">
                    💡 La primera imagen es la principal. Usa las flechas para reordenar o la estrella para marcar como principal.
                  </Text>
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                    {imageFiles.map((file, idx) => (
                      <Paper key={idx} pos="relative" withBorder radius="md" p={4}>
                        <Image
                          src={typeof file === "string" ? file : URL.createObjectURL(file)}
                          alt={`Imagen ${idx + 1}`}
                          radius="sm"
                          h={120}
                          w="100%"
                          fit="cover"
                        />
                        
                        {/* Badge de imagen principal */}
                        {idx === 0 && (
                          <Badge
                            color="yellow"
                            variant="filled"
                            leftSection={<BiStar size={12} />}
                            style={{ position: "absolute", left: 8, top: 8 }}
                            size="sm"
                          >
                            Principal
                          </Badge>
                        )}

                        {/* Botones de control */}
                        <Group
                          gap={4}
                          style={{ position: "absolute", top: 8, right: 8 }}
                        >
                          <Tooltip label="Eliminar" withArrow>
                            <ActionIcon
                              variant="filled"
                              color="red"
                              size="sm"
                              radius="xl"
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <BiSolidXCircle size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>

                        {/* Controles de reordenamiento */}
                        <Group
                          gap={4}
                          justify="center"
                          style={{ position: "absolute", bottom: 8, left: '50%', transform: 'translateX(-50%)' }}
                        >
                          {idx !== 0 && (
                            <Tooltip label="Mover a la izquierda" withArrow>
                              <ActionIcon
                                variant="filled"
                                size="sm"
                                radius="xl"
                                onClick={() => moveImageLeft(idx)}
                              >
                                <BsArrowLeft size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {idx !== 0 && (
                            <Tooltip label="Marcar como principal" withArrow>
                              <ActionIcon
                                variant="filled"
                                color="yellow"
                                size="sm"
                                radius="xl"
                                onClick={() => setAsMain(idx)}
                              >
                                <BiStar size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {idx !== imageFiles.length - 1 && (
                            <Tooltip label="Mover a la derecha" withArrow>
                              <ActionIcon
                                variant="filled"
                                size="sm"
                                radius="xl"
                                onClick={() => moveImageRight(idx)}
                              >
                                <BsArrowRight size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Box>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

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
  );
};

export default ModalCreateEdit;
