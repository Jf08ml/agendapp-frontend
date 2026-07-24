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
import { IconPackage, IconTrash, IconSchool, IconLayersSubtract, IconPlus, IconGift } from "@tabler/icons-react";
import { Service } from "../../../../services/serviceService";
import { ServicePackage, PackageServiceItem, PackageClassItem, PackageTier } from "../../../../services/packageService";
import { ClassType } from "../../../../services/classService";
import { Autocomplete } from "@mantine/core";

interface ModalCreateEditPackageProps {
  isOpen: boolean;
  onClose: () => void;
  servicePackage: ServicePackage | null;
  onSave: (data: any) => void;
  availableServices: Service[];
  availableClasses?: ClassType[];
}

interface EditingPackageService {
  serviceId: string;
  serviceName: string;
  sessionsIncluded: number;
}

interface EditingPackageClass {
  classId: string;
  className: string;
  sessionsIncluded: number;
}

interface EditingTier {
  key: string; // solo para el key de React / identificar la fila localmente
  _id?: string;
  label: string;
  sessionsIncluded: number;
  price: number;
  courtesySessions: number;
}

const newTier = (): EditingTier => ({
  key: crypto.randomUUID(),
  label: "",
  sessionsIncluded: 1,
  price: 0,
  courtesySessions: 0,
});

const ModalCreateEditPackage: React.FC<ModalCreateEditPackageProps> = ({
  isOpen,
  onClose,
  servicePackage,
  onSave,
  availableServices,
  availableClasses = [],
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [hasTiers, setHasTiers] = useState(false);
  const [tiers, setTiers] = useState<EditingTier[]>([]);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);
  const [selectedServices, setSelectedServices] = useState<EditingPackageService[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<EditingPackageClass[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (servicePackage) {
      setName(servicePackage.name);
      setDescription(servicePackage.description || "");
      setPrice(servicePackage.price ?? 0);
      const existingTiers = servicePackage.tiers || [];
      setHasTiers(existingTiers.length > 0);
      setTiers(
        existingTiers.map((t: PackageTier) => ({
          key: t._id || crypto.randomUUID(),
          _id: t._id,
          label: t.label,
          sessionsIncluded: t.sessionsIncluded,
          price: t.price,
          courtesySessions: t.courtesySessions || 0,
        }))
      );
      setValidityDays(servicePackage.validityDays);
      setIsActive(servicePackage.isActive);
      setSelectedServices(
        servicePackage.services.map((svc: any) => ({
          serviceId: typeof svc.serviceId === "object" ? svc.serviceId._id : svc.serviceId,
          serviceName: typeof svc.serviceId === "object" ? svc.serviceId.name :
            availableServices.find((s) => s._id === svc.serviceId)?.name || "Servicio",
          sessionsIncluded: svc.sessionsIncluded || 1,
        }))
      );
      setSelectedClasses(
        (servicePackage.classes || []).map((cls: any) => ({
          classId: typeof cls.classId === "object" ? cls.classId._id : cls.classId,
          className: typeof cls.classId === "object" ? cls.classId.name :
            availableClasses.find((c) => c._id === cls.classId)?.name || "Clase",
          sessionsIncluded: cls.sessionsIncluded || 1,
        }))
      );
    } else {
      setName("");
      setDescription("");
      setPrice(0);
      setHasTiers(false);
      setTiers([]);
      setValidityDays(30);
      setIsActive(true);
      setSelectedServices([]);
      setSelectedClasses([]);
    }
    setServiceSearch("");
    setClassSearch("");
  }, [servicePackage, isOpen]);

  const handleToggleTiers = (checked: boolean) => {
    setHasTiers(checked);
    if (checked && tiers.length === 0) {
      setTiers([newTier()]);
    }
  };

  const handleAddTier = () => setTiers((prev) => [...prev, newTier()]);

  const handleRemoveTier = (key: string) =>
    setTiers((prev) => prev.filter((t) => t.key !== key));

  const handleTierChange = (key: string, patch: Partial<EditingTier>) =>
    setTiers((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));

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

  const handleAddClass = (className: string) => {
    const cls = availableClasses.find((c) => c.name === className);
    if (!cls) return;
    if (selectedClasses.some((c) => c.classId === cls._id)) return;
    setSelectedClasses((prev) => [
      ...prev,
      { classId: cls._id, className: cls.name, sessionsIncluded: 1 },
    ]);
    setClassSearch("");
  };

  const handleRemoveClass = (classId: string) => {
    setSelectedClasses((prev) => prev.filter((c) => c.classId !== classId));
  };

  const handleClassSessionsChange = (classId: string, sessions: number) => {
    setSelectedClasses((prev) =>
      prev.map((c) => (c.classId === classId ? { ...c, sessionsIncluded: sessions } : c))
    );
  };

  const tiersValid =
    !hasTiers ||
    (tiers.length > 0 &&
      tiers.every((t) => t.label.trim().length > 0 && t.sessionsIncluded >= 1 && t.price >= 0));

  const canSave =
    name.trim().length > 0 &&
    validityDays > 0 &&
    (selectedServices.length > 0 || selectedClasses.length > 0) &&
    (hasTiers ? tiersValid : price >= 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Con niveles, las sesiones las define cada tier de forma uniforme —
      // el sessionsIncluded por servicio/clase individual ya no aplica.
      const services: PackageServiceItem[] = selectedServices.map((s) => ({
        serviceId: s.serviceId,
        ...(hasTiers ? {} : { sessionsIncluded: s.sessionsIncluded }),
      }));
      const classes: PackageClassItem[] = selectedClasses.map((c) => ({
        classId: c.classId,
        ...(hasTiers ? {} : { sessionsIncluded: c.sessionsIncluded }),
      }));

      await onSave({
        _id: servicePackage?._id,
        name: name.trim(),
        description: description.trim(),
        ...(hasTiers
          ? {
              tiers: tiers.map((t) => ({
                label: t.label.trim(),
                sessionsIncluded: t.sessionsIncluded,
                price: t.price,
                courtesySessions: t.courtesySessions,
              })),
              price: null,
            }
          : { price, tiers: [] }),
        validityDays,
        isActive,
        services,
        classes,
      });
    } finally {
      setSaving(false);
    }
  };

  // Dedup por nombre: el Autocomplete usa el nombre como valor de opción y
  // Mantine v7 lanza si hay valores duplicados (ej. dos servicios "Retiro").
  const availableForSelect = Array.from(
    new Set(
      availableServices
        .filter((s) => s.isActive && !selectedServices.some((sel) => sel.serviceId === s._id))
        .map((s) => s.name)
    )
  );

  const availableClassesForSelect = Array.from(
    new Set(
      availableClasses
        .filter((c) => c.isActive && !selectedClasses.some((sel) => sel.classId === c._id))
        .map((c) => c.name)
    )
  );

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
            <Switch
              label="Este paquete tiene niveles (ej: x4 / x8 / x12)"
              description="Misma base de servicios/clases, distinta cantidad de sesiones — cada nivel con su propio precio, en vez de crear un paquete separado por cada uno"
              checked={hasTiers}
              onChange={(e) => handleToggleTiers(e.currentTarget.checked)}
            />
            {!hasTiers && (
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
            )}
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

        {hasTiers && (
          <Paper withBorder p="md" radius="md" shadow="xs">
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon variant="light" color="teal" size="md" radius="md">
                  <IconLayersSubtract size={16} />
                </ThemeIcon>
                <Title order={5}>Niveles del paquete</Title>
              </Group>
              <Badge variant="light" color="teal" size="lg">
                {tiers.length} nivel{tiers.length !== 1 ? "es" : ""}
              </Badge>
            </Group>
            <Divider mb="md" />

            <Stack gap="sm">
              {tiers.map((tier) => (
                <Paper key={tier.key} withBorder p="sm" radius="sm">
                  <Group align="flex-end" gap="sm" wrap="wrap">
                    <TextInput
                      label="Nombre del nivel"
                      placeholder="Ej: x4"
                      value={tier.label}
                      onChange={(e) => handleTierChange(tier.key, { label: e.currentTarget.value })}
                      w={140}
                      required
                    />
                    <NumberInput
                      label="Sesiones"
                      value={tier.sessionsIncluded}
                      onChange={(value) =>
                        handleTierChange(tier.key, { sessionsIncluded: typeof value === "number" ? value : 1 })
                      }
                      min={1}
                      max={100}
                      w={100}
                    />
                    <NumberInput
                      label="Precio"
                      prefix="$ "
                      thousandSeparator="."
                      decimalSeparator=","
                      value={tier.price}
                      onChange={(value) =>
                        handleTierChange(tier.key, { price: typeof value === "number" ? value : 0 })
                      }
                      min={0}
                      w={140}
                    />
                    <NumberInput
                      label="Cortesía"
                      description="sesiones gratis extra"
                      leftSection={<IconGift size={14} />}
                      value={tier.courtesySessions}
                      onChange={(value) =>
                        handleTierChange(tier.key, { courtesySessions: typeof value === "number" ? value : 0 })
                      }
                      min={0}
                      max={100}
                      w={130}
                    />
                    <Tooltip label="Quitar nivel">
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleRemoveTier(tier.key)}
                        disabled={tiers.length === 1}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              ))}
            </Stack>

            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddTier}
              mt="md"
            >
              Agregar nivel
            </Button>
          </Paper>
        )}

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
                      {!hasTiers && (
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
                      )}
                      <Tooltip label="Quitar servicio">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleRemoveService(svc.serviceId)}
                          mt={hasTiers ? 0 : 20}
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

        {/* 📚 Clases Incluidas */}
        <Paper withBorder p="md" radius="md" shadow="xs">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon variant="light" color="grape" size="md" radius="md">
                <IconSchool size={16} />
              </ThemeIcon>
              <Title order={5}>Clases Incluidas</Title>
            </Group>
            {selectedClasses.length > 0 && (
              <Badge variant="light" color="grape" size="lg">
                {selectedClasses.length} clase{selectedClasses.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </Group>
          <Divider mb="md" />

          {availableClasses.length === 0 ? (
            <Text c="dimmed" ta="center" py="md" size="sm">
              No hay clases activas en tu organización para agregar.
            </Text>
          ) : (
            <Autocomplete
              label="Agregar clase"
              placeholder="Busca una clase para agregar..."
              data={availableClassesForSelect}
              value={classSearch}
              onChange={setClassSearch}
              onOptionSubmit={handleAddClass}
              mb="md"
            />
          )}

          {selectedClasses.length > 0 && (
            <Stack gap="sm">
              {selectedClasses.map((cls) => (
                <Paper key={cls.classId} withBorder p="sm" radius="sm">
                  <Group justify="space-between" align="center">
                    <Text fw={500} style={{ flex: 1 }}>{cls.className}</Text>
                    <Group gap="xs" align="center">
                      {!hasTiers && (
                        <NumberInput
                          label="Sesiones"
                          value={cls.sessionsIncluded}
                          onChange={(value) =>
                            handleClassSessionsChange(cls.classId, typeof value === "number" ? value : 1)
                          }
                          min={1}
                          max={100}
                          w={100}
                          size="xs"
                        />
                      )}
                      <Tooltip label="Quitar clase">
                        <ActionIcon variant="light" color="red" onClick={() => handleRemoveClass(cls.classId)} mt={hasTiers ? 0 : 20}>
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
            {!canSave &&
              (hasTiers
                ? "Completa nombre, vigencia, al menos un servicio o clase, y todos los niveles con nombre/sesiones/precio"
                : "Completa nombre, precio, vigencia y al menos un servicio o clase")}
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
