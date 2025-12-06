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
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { BiImageAdd, BiSolidXCircle } from "react-icons/bi";
import { Service } from "../../../../services/serviceService";

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
  });
  const [imageFiles, setImageFiles] = useState<(File | string)[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (service) {
      setEditingService(service);
      setImageFiles(service.images || []);
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
      });
      setImageFiles([]);
    }
  }, [service]);

  const handleDrop = (files: File[]) => {
    setImageFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSave =
    editingService.name.trim().length > 1 &&
    editingService.type.trim().length > 1 &&
    (editingService.price ?? 0) > 0 &&
    (editingService.duration ?? 0) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ ...editingService, images: imageFiles as any });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={service ? "Editar Servicio" : "Agregar Servicio"}
      size="lg"
      centered
      radius="md"
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <TextInput
                label="Nombre del servicio"
                value={editingService.name}
                onChange={(e) => setEditingService({ ...editingService, name: e.currentTarget.value })}
                required
              />
              <Autocomplete
                label="Tipo de servicio"
                value={editingService.type}
                onChange={(type) => setEditingService({ ...editingService, type })}
                data={allTypes}
                placeholder="Ej: Uñas, Spa, Cejas…"
                limit={10}
                required
              />
              <NumberInput
                label="Precio"
                prefix="$ "
                thousandSeparator="."
                decimalSeparator=","
                value={editingService.price}
                onChange={(value) => setEditingService({ ...editingService, price: typeof value === "number" ? value : 0 })}
                required
                min={0}
              />
              <div>
                <NumberInput
                  label="Duración (minutos)"
                  value={editingService.duration}
                  onChange={(value) => setEditingService({ ...editingService, duration: typeof value === "number" ? value : 0 })}
                  required
                  min={1}
                />
                <Group gap="xs" mt={6} wrap="wrap">
                  {[15, 30, 45, 60, 90].map((d) => (
                    <Chip
                      key={d}
                      size="xs"
                      checked={editingService.duration === d}
                      onChange={() => setEditingService({ ...editingService, duration: d })}
                    >
                      {d} min
                    </Chip>
                  ))}
                </Group>
              </div>
              <Textarea
                label="Descripción"
                value={editingService.description ?? ""}
                onChange={(e) => setEditingService({ ...editingService, description: e.currentTarget.value })}
                minRows={2}
              />
              <Switch
                label="Ocultar precio al cliente"
                description="El precio se ocultará en la vista pública del cliente"
                checked={editingService.hidePrice ?? false}
                onChange={(e) => setEditingService({ ...editingService, hidePrice: e.currentTarget.checked })}
              />
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Box>
                <Text size="sm" fw={600} mb={6}>Imágenes</Text>
                <Dropzone
                  onDrop={handleDrop}
                  accept={IMAGE_MIME_TYPE}
                  multiple
                  styles={{ inner: { paddingBlock: 18 } }}
                >
                  <Group justify="center">
                    <BiImageAdd size={48} />
                    <div>
                      <Text size="sm" fw={600}>Arrastra aquí o haz clic para subir</Text>
                      <Text size="xs" c="dimmed">Formatos aceptados: jpeg, png, webp…</Text>
                    </div>
                  </Group>
                </Dropzone>
              </Box>

              {imageFiles.length > 0 && (
                <SimpleGrid cols={{ base: 3, md: 4 }} spacing="sm">
                  {imageFiles.map((file, idx) => (
                    <Box key={idx} pos="relative">
                      <Image
                        src={typeof file === "string" ? file : URL.createObjectURL(file)}
                        alt={`Imagen ${idx + 1}`}
                        radius="sm"
                        h={90}
                        w="100%"
                        fit="cover"
                      />
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size="sm"
                        radius="xl"
                        style={{ position: "absolute", top: 6, right: 6 }}
                        onClick={() => handleRemoveImage(idx)}
                        aria-label="Eliminar imagen"
                      >
                        <BiSolidXCircle />
                      </ActionIcon>
                      {idx === 0 && (
                        <Badge
                          color="blue"
                          variant="filled"
                          style={{ position: "absolute", left: 6, top: 6 }}
                        >
                          Principal
                        </Badge>
                      )}
                    </Box>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Paper>
        </SimpleGrid>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            {service ? "Guardar cambios" : "Agregar servicio"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ModalCreateEdit;
