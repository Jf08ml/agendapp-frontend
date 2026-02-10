/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Button,
  Group,
  Text,
  Paper,
  Box,
  Switch,
  Title,
  Divider,
  ThemeIcon,
  Chip,
  ActionIcon,
  Badge,
  Tooltip,
} from "@mantine/core";
import { IconPackage, IconTrash } from "@tabler/icons-react";
import { Service } from "../../../../services/serviceService";
import { ServicePackage, PackageServiceItem } from "../../../../services/packageService";
import { Autocomplete } from "@mantine/core";

interface ModalCreateEditPackageProps {
  isOpen: boolean;
  onClose: () => void;
  servicePackage: ServicePackage | null;
  onSave: (data: any) => void;
  availableServices: Service[];
}

interface EditingPackageService {
  serviceId: string;
  serviceName: string;
  sessionsIncluded: number;
}

const ModalCreateEditPackage: React.FC<ModalCreateEditPackageProps> = ({
  isOpen,
  onClose,
  servicePackage,
  onSave,
  availableServices,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<EditingPackageService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (servicePackage) {
      setName(servicePackage.name);
      setDescription(servicePackage.description || "");
      setPrice(servicePackage.price);
      setValidityDays(servicePackage.validityDays);
      setIsActive(servicePackage.isActive);
      setSelectedServices(
        servicePackage.services.map((svc: any) => ({
          serviceId: typeof svc.serviceId === "object" ? svc.serviceId._id : svc.serviceId,
          serviceName: typeof svc.serviceId === "object" ? svc.serviceId.name :
            availableServices.find((s) => s._id === svc.serviceId)?.name || "Servicio",
          sessionsIncluded: svc.sessionsIncluded,
        }))
      );
    } else {
      setName("");
      setDescription("");
      setPrice(0);
      setValidityDays(30);
      setIsActive(true);
      setSelectedServices([]);
    }
    setServiceSearch("");
  }, [servicePackage, isOpen]);

  const handleAddService = (serviceName: string) => {
    const service = availableServices.find((s) => s.name === serviceName);
    if (!service) return;
    if (selectedServices.some((s) => s.serviceId === service._id)) return;

    setSelectedServices((prev) => [
      ...prev,
      { serviceId: service._id, serviceName: service.name, sessionsIncluded: 1 },
    ]);
    setServiceSearch("");
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices((prev) => prev.filter((s) => s.serviceId !== serviceId));
  };

  const handleSessionsChange = (serviceId: string, sessions: number) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.serviceId === serviceId ? { ...s, sessionsIncluded: sessions } : s
      )
    );
  };

  const canSave = name.trim().length > 0 && price >= 0 && validityDays > 0 && selectedServices.length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const services: PackageServiceItem[] = selectedServices.map((s) => ({
        serviceId: s.serviceId,
        sessionsIncluded: s.sessionsIncluded,
      }));

      await onSave({
        _id: servicePackage?._id,
        name: name.trim(),
        description: description.trim(),
        price,
        validityDays,
        isActive,
        services,
      });
    } finally {
      setSaving(false);
    }
  };

  const availableForSelect = availableServices
    .filter((s) => s.isActive && !selectedServices.some((sel) => sel.serviceId === s._id))
    .map((s) => s.name);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md">
            <IconPackage size={20} />
          </ThemeIcon>
          <Title order={3}>
            {servicePackage ? "Editar Paquete" : "Crear Nuevo Paquete"}
          </Title>
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md" shadow="xs">
          <Title order={5} mb="sm">Información del Paquete</Title>
          <Divider mb="md" />
          <Stack gap="md">
            <TextInput
              label="Nombre del paquete"
              placeholder="Ej: Paquete Mensual Premium"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
              required
              withAsterisk
            />
            <Textarea
              label="Descripción"
              placeholder="Describe los beneficios del paquete..."
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <NumberInput
              label="Precio"
              description="Precio total del paquete"
              prefix="$ "
              thousandSeparator="."
              decimalSeparator=","
              value={price}
              onChange={(value) => setPrice(typeof value === "number" ? value : 0)}
              required
              withAsterisk
              min={0}
            />
            <Box>
              <NumberInput
                label="Vigencia (días)"
                description="Tiempo de validez desde la compra"
                value={validityDays}
                onChange={(value) => setValidityDays(typeof value === "number" ? value : 30)}
                required
                withAsterisk
                min={1}
              />
              <Group gap="xs" mt={8} wrap="wrap">
                {[7, 15, 30, 60, 90].map((d) => (
                  <Chip
                    key={d}
                    size="sm"
                    checked={validityDays === d}
                    onChange={() => setValidityDays(d)}
                    variant="filled"
                  >
                    {d} días
                  </Chip>
                ))}
              </Group>
            </Box>
            <Switch
              label="Paquete activo"
              description="Los paquetes inactivos no se pueden asignar a clientes"
              checked={isActive}
              onChange={(e) => setIsActive(e.currentTarget.checked)}
            />
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md" shadow="xs">
          <Group justify="space-between" mb="sm">
            <Title order={5}>Servicios Incluidos</Title>
            {selectedServices.length > 0 && (
              <Badge variant="light" size="lg">
                {selectedServices.length} servicio{selectedServices.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </Group>
          <Divider mb="md" />

          <Autocomplete
            label="Agregar servicio"
            placeholder="Busca un servicio para agregar..."
            data={availableForSelect}
            value={serviceSearch}
            onChange={setServiceSearch}
            onOptionSubmit={handleAddService}
            mb="md"
          />

          {selectedServices.length === 0 ? (
            <Text c="dimmed" ta="center" py="md" size="sm">
              Agrega al menos un servicio al paquete
            </Text>
          ) : (
            <Stack gap="sm">
              {selectedServices.map((svc) => (
                <Paper key={svc.serviceId} withBorder p="sm" radius="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={500} style={{ flex: 1 }}>{svc.serviceName}</Text>
                    <Group gap="xs" align="center">
                      <NumberInput
                        label="Sesiones"
                        value={svc.sessionsIncluded}
                        onChange={(value) =>
                          handleSessionsChange(
                            svc.serviceId,
                            typeof value === "number" ? value : 1
                          )
                        }
                        min={1}
                        max={100}
                        w={100}
                        size="xs"
                      />
                      <Tooltip label="Quitar servicio">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleRemoveService(svc.serviceId)}
                          mt={20}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {!canSave && "Completa nombre, precio, vigencia y al menos un servicio"}
          </Text>
          <Group>
            <Button variant="default" onClick={onClose} size="md">
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!canSave} size="md">
              {servicePackage ? "Guardar cambios" : "Crear paquete"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ModalCreateEditPackage;
