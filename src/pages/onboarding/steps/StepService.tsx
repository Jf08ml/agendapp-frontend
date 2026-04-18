/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  Stack, TextInput, NumberInput, Textarea, Chip,
  Button, Image, ActionIcon, Group, Text, Autocomplete,
  SimpleGrid, Paper, Box, Badge, Switch, Divider,
  Tooltip, Center, ThemeIcon, SegmentedControl, Alert, Loader,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { showNotification } from "@mantine/notifications";
import { BiImageAdd, BiSolidXCircle, BiStar } from "react-icons/bi";
import { BsArrowLeft, BsArrowRight, BsTrash, BsPlusCircle } from "react-icons/bs";
import { IconInfoCircle } from "@tabler/icons-react";

import { createService, getServicesByOrganizationId, ServiceCost } from "../../../services/serviceService";
import { uploadImage } from "../../../services/imageService";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

interface Props {
  onDone: (serviceId: string) => void;
}

export default function StepService({ onDone }: Props) {
  const organizationId = useSelector((s: RootState) => s.auth.organizationId) ?? "";
  const [existingServices, setExistingServices] = useState<{ _id: string; name: string }[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFreeService, setIsFreeService] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState<number>(1);
  const [hasCosts, setHasCosts] = useState(false);
  const [costsMode, setCostsMode] = useState<"simple" | "detailed">("simple");
  const [costs, setCosts] = useState<ServiceCost[]>([{ concept: "", amount: 0 }]);
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getServicesByOrganizationId(organizationId).then((svcs) => {
      setExistingServices(svcs.map((s: any) => ({ _id: s._id, name: s.name })));
    }).finally(() => setLoadingExisting(false));
  }, [organizationId]);

  const canSave =
    name.trim().length > 1 &&
    type.trim().length > 1 &&
    (isFreeService || price > 0) &&
    duration > 0;

  const handleDrop = (files: File[]) => setImageFiles((prev) => [...prev, ...files]);
  const handleRemoveImage = (i: number) => setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
  const moveLeft = (i: number) => {
    if (i === 0) return;
    setImageFiles((prev) => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  };
  const moveRight = (i: number) => {
    if (i === imageFiles.length - 1) return;
    setImageFiles((prev) => { const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; });
  };
  const setAsMain = (i: number) => {
    if (i === 0) return;
    setImageFiles((prev) => { const a = [...prev]; const [item] = a.splice(i, 1); a.unshift(item); return a; });
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      // Upload images
      const files = imageFiles.filter((f) => f instanceof File) as File[];
      const existingUrls = imageFiles.filter((f) => typeof f === "string") as string[];
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        const results = await Promise.all(files.map((f) => uploadImage(f)));
        uploadedUrls = results.filter(Boolean) as string[];
      }
      const finalImages = [...existingUrls, ...uploadedUrls];
      const finalCosts = hasCosts ? costs.filter((c) => c.amount > 0) : [];

      const created = await createService({
        name,
        type,
        description,
        recommendations,
        price: isFreeService ? 0 : price,
        duration,
        hidePrice: isFreeService ? false : hidePrice,
        maxConcurrentAppointments: maxConcurrent,
        images: finalImages as any,
        costs: finalCosts,
        organizationId,
      } as any);

      if (!created?._id) throw new Error("No se recibió ID del servicio");
      showNotification({ title: "Servicio creado", message: `"${name}" listo`, color: "green" });
      onDone(created._id);
    } catch {
      showNotification({ title: "Error", message: "No se pudo crear el servicio", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) {
    return <Center py="xl"><Loader /></Center>;
  }

  return (
    <Stack gap="lg">
      {existingServices.length > 0 ? (
        <Alert icon={<IconInfoCircle size={16} />} color="green" variant="light" radius="md">
          <Stack gap="xs">
            <Text size="sm" fw={600}>Ya tienes {existingServices.length} servicio{existingServices.length > 1 ? "s" : ""} creado{existingServices.length > 1 ? "s" : ""}:</Text>
            {existingServices.map((s) => (
              <Text key={s._id} size="sm" c="dimmed">• {s.name}</Text>
            ))}
            <Button
              size="xs"
              variant="filled"
              color="green"
              mt="xs"
              onClick={() => onDone(existingServices[0]._id)}
            >
              Continuar con estos servicios →
            </Button>
          </Stack>
        </Alert>
      ) : (
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
          Crea el primer servicio que ofrecerás a tus clientes. Podrás agregar más después desde el panel de administración.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {/* ── Columna izquierda: campos ── */}
        <Paper withBorder p="md" radius="md">
          <Text fw={700} size="sm" mb="sm">Información del servicio</Text>
          <Divider mb="md" />
          <Stack gap="md">
            <TextInput
              label="Nombre del servicio"
              placeholder="Ej: Manicure Gel, Masaje Relajante..."
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              withAsterisk
            />
            <Autocomplete
              label="Categoría / Tipo"
              value={type}
              onChange={setType}
              data={[]}
              placeholder="Ej: Uñas, Spa, Cejas…"
              limit={10}
              required
              withAsterisk
            />

            <Switch
              label="Servicio gratuito"
              description="No tiene costo para el cliente"
              checked={isFreeService}
              onChange={(e) => {
                setIsFreeService(e.currentTarget.checked);
                if (e.currentTarget.checked) { setPrice(0); setHidePrice(false); }
              }}
            />
            {!isFreeService && (
              <NumberInput
                label="Precio"
                description="Precio base del servicio"
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
                value={price}
                onChange={(v) => setPrice(typeof v === "number" ? v : 0)}
                required
                withAsterisk
                min={1}
              />
            )}

            <Box>
              <NumberInput
                label="Duración (minutos)"
                description="Tiempo estimado"
                value={duration}
                onChange={(v) => setDuration(typeof v === "number" ? v : 0)}
                required
                withAsterisk
                min={1}
              />
              <Group gap="xs" mt={8} wrap="wrap">
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <Chip key={d} size="sm" checked={duration === d} onChange={() => setDuration(d)} variant="filled">
                    {d} min
                  </Chip>
                ))}
              </Group>
            </Box>

            <Textarea
              label="Descripción"
              placeholder="Describe los detalles y beneficios del servicio..."
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              minRows={2}
              autosize
            />

            <Textarea
              label="Recomendaciones para el cliente"
              description="Se incluirán en los recordatorios de WhatsApp"
              placeholder="Ej: Llegar sin maquillaje, traer ropa cómoda..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.currentTarget.value)}
              minRows={2}
              autosize
            />

            {!isFreeService && (
              <Switch
                label="Ocultar precio al cliente"
                description="El precio no será visible en la vista pública"
                checked={hidePrice}
                onChange={(e) => setHidePrice(e.currentTarget.checked)}
              />
            )}

            <Box>
              <NumberInput
                label="Citas simultáneas"
                description="Cuántos clientes puede atender el profesional al mismo tiempo"
                value={maxConcurrent}
                onChange={(v) => setMaxConcurrent(typeof v === "number" ? v : 1)}
                min={1}
                max={10}
              />
              <Group gap="xs" mt={8} wrap="wrap">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} size="sm" checked={maxConcurrent === n} onChange={() => setMaxConcurrent(n)} variant="filled">
                    {n} {n === 1 ? "cliente" : "clientes"}
                  </Chip>
                ))}
              </Group>
            </Box>

            <Divider />

            <Switch
              label="Registrar gastos del servicio"
              description="Insumos, materiales o costos internos"
              checked={hasCosts}
              onChange={(e) => {
                setHasCosts(e.currentTarget.checked);
                if (!e.currentTarget.checked) { setCosts([{ concept: "", amount: 0 }]); setCostsMode("simple"); }
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
                      }
                    }}
                    data={[{ label: "Simple", value: "simple" }, { label: "Detallado", value: "detailed" }]}
                  />
                </Group>
                {costsMode === "simple" ? (
                  <NumberInput
                    label="Gasto total por servicio"
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
                          placeholder="Concepto (ej: tinte)"
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
                          <ActionIcon color="red" variant="light" onClick={() => setCosts(costs.filter((_, i) => i !== idx))}>
                            <BsTrash size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                    <Button size="xs" variant="light" leftSection={<BsPlusCircle size={14} />} onClick={() => setCosts([...costs, { concept: "", amount: 0 }])}>
                      Agregar ítem
                    </Button>
                    <Text size="xs" c="dimmed" ta="right">
                      Total: $ {costs.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                    </Text>
                  </Stack>
                )}
              </Box>
            )}
          </Stack>
        </Paper>

        {/* ── Columna derecha: imágenes ── */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="sm">
            <Text fw={700} size="sm">Imágenes del servicio</Text>
            {imageFiles.length > 0 && (
              <Badge variant="light" size="sm">{imageFiles.length} {imageFiles.length === 1 ? "imagen" : "imágenes"}</Badge>
            )}
          </Group>
          <Divider mb="md" />
          <Dropzone onDrop={handleDrop} accept={IMAGE_MIME_TYPE} multiple styles={{ inner: { paddingBlock: 16 } }}>
            <Center>
              <Stack align="center" gap="xs">
                <ThemeIcon size={48} radius="md" variant="light">
                  <BiImageAdd size={28} />
                </ThemeIcon>
                <Text size="sm" fw={600} ta="center">Arrastra imágenes aquí</Text>
                <Text size="xs" c="dimmed" ta="center">JPEG, PNG, WebP — opcional</Text>
              </Stack>
            </Center>
          </Dropzone>

          {imageFiles.length > 0 && (
            <Box mt="md">
              <Text size="xs" c="dimmed" mb="xs">
                La primera imagen es la principal. Usa las flechas para reordenar.
              </Text>
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                {imageFiles.map((file, idx) => (
                  <Paper key={idx} pos="relative" withBorder radius="md" p={4}>
                    <Image
                      src={typeof file === "string" ? file : URL.createObjectURL(file)}
                      alt={`Imagen ${idx + 1}`}
                      radius="sm"
                      h={100}
                      fit="cover"
                    />
                    {idx === 0 && (
                      <Badge color="yellow" variant="filled" leftSection={<BiStar size={10} />}
                        style={{ position: "absolute", left: 6, top: 6 }} size="xs">
                        Principal
                      </Badge>
                    )}
                    <Group gap={4} style={{ position: "absolute", top: 6, right: 6 }}>
                      <Tooltip label="Eliminar" withArrow>
                        <ActionIcon variant="filled" color="red" size="sm" radius="xl" onClick={() => handleRemoveImage(idx)}>
                          <BiSolidXCircle size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Group gap={4} justify="center" style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)" }}>
                      {idx !== 0 && (
                        <Tooltip label="Mover izquierda" withArrow>
                          <ActionIcon variant="filled" size="sm" radius="xl" onClick={() => moveLeft(idx)}>
                            <BsArrowLeft size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {idx !== 0 && (
                        <Tooltip label="Marcar como principal" withArrow>
                          <ActionIcon variant="filled" color="yellow" size="sm" radius="xl" onClick={() => setAsMain(idx)}>
                            <BiStar size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      {idx !== imageFiles.length - 1 && (
                        <Tooltip label="Mover derecha" withArrow>
                          <ActionIcon variant="filled" size="sm" radius="xl" onClick={() => moveRight(idx)}>
                            <BsArrowRight size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Paper>
                ))}
              </SimpleGrid>
            </Box>
          )}
        </Paper>
      </SimpleGrid>

      <Divider />
      <Group justify="flex-end">
        {!canSave && (
          <Text size="sm" c="dimmed">Completa los campos obligatorios (*)</Text>
        )}
        <Button
          size="md"
          onClick={handleSave}
          loading={saving}
          disabled={!canSave}
        >
          Crear servicio y continuar →
        </Button>
      </Group>
    </Stack>
  );
}
