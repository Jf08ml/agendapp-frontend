/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Stack, TextInput, Button, ActionIcon, Group, Image,
  Text, Loader, Grid, Checkbox, ScrollArea, Paper, Box,
  ColorInput, SegmentedControl, NumberInput, Alert, Divider,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { showNotification } from "@mantine/notifications";
import { IoEyeOff } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import { BiImageAdd, BiSolidXCircle } from "react-icons/bi";
import { IconInfoCircle } from "@tabler/icons-react";

import { uploadImage } from "../../../services/imageService";
import { createEmployee } from "../../../services/employeeService";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

interface Props {
  createdServiceId: string | null;
  onDone: () => void;
  onBack: () => void;
}

// Internal service shape for checkbox list (only needs _id + name)
interface ServiceOption {
  _id: string;
  name: string;
}

export default function StepEmployee({ createdServiceId, onDone, onBack }: Props) {
  const organizationId = useSelector((s: RootState) => s.auth.organizationId) ?? "";

  // We show the service created in step 1 pre-selected
  const serviceOptions: ServiceOption[] = createdServiceId
    ? [{ _id: createdServiceId, name: "Servicio creado en el paso anterior" }]
    : [];

  const [names, setNames] = useState("");
  const [position, setPosition] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [color, setColor] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    createdServiceId ? [createdServiceId] : []
  );
  const [commissionType, setCommissionType] = useState<"percentage" | "fixed">("percentage");
  const [commissionValue, setCommissionValue] = useState<number>(0);
  const [profileImage, setProfileImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave =
    names.trim().length > 1 &&
    position.trim().length > 0 &&
    phoneNumber.trim().length > 5 &&
    email.trim().length > 3 &&
    password.trim().length > 5;

  const handleDrop = async (files: File[]) => {
    setIsUploading(true);
    try {
      const url = await uploadImage(files[0]);
      setProfileImage(url as string);
    } catch {
      showNotification({ title: "Error", message: "No se pudo subir la imagen", color: "red" });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const services = selectedServiceIds
        .map((id) => serviceOptions.find((s) => s._id === id))
        .filter(Boolean) as ServiceOption[];

      const created = await createEmployee({
        names,
        position,
        email,
        phoneNumber,
        password,
        organizationId,
        isActive: true,
        profileImage,
        commissionType,
        commissionValue,
        services: services.map((s) => ({ _id: s._id, name: s.name } as any)),
      });

      if (!created?._id) throw new Error("No se recibió ID del profesional");
      showNotification({ title: "Profesional creado", message: `"${names}" listo`, color: "green" });
      onDone();
    } catch {
      showNotification({ title: "Error", message: "No se pudo crear el profesional", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        Agrega el primer profesional que atenderá las citas. Podrás editar su horario y permisos después desde el panel de administración.
      </Alert>

      <Grid>
        {/* Columna izquierda */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            <TextInput
              label="Nombre completo"
              withAsterisk
              placeholder="Ej: Juan Pérez"
              value={names}
              onChange={(e) => setNames(e.currentTarget.value)}
            />
            <TextInput
              label="Cargo / Posición"
              withAsterisk
              placeholder="Ej: Barbero, Esteticista..."
              value={position}
              onChange={(e) => setPosition(e.currentTarget.value)}
            />
            <TextInput
              label="Número de teléfono"
              withAsterisk
              placeholder="Ej: +57 300 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.currentTarget.value)}
            />
            <TextInput
              label="Correo electrónico"
              withAsterisk
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <TextInput
              label="Contraseña de acceso"
              withAsterisk
              description="El profesional usará esta contraseña para acceder a la plataforma"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              rightSection={
                <ActionIcon variant="transparent" onClick={() => setShowPassword((p) => !p)}>
                  {showPassword ? <IoEyeOff size={16} /> : <FaEye size={16} />}
                </ActionIcon>
              }
            />

            <ColorInput
              label="Color identificador"
              description="Se mostrará en el calendario para diferenciar al profesional"
              placeholder="Selecciona un color"
              value={color}
              onChange={setColor}
              format="hex"
              withPicker
              swatches={["#FFB6C1","#FFD700","#98FB98","#AFEEEE","#7B68EE","#FF69B4","#FFA07A","#E6E6FA","#FFFACD","#C0C0C0"]}
              swatchesPerRow={5}
            />

            <Box>
              <Text size="sm" fw={500} mb={4}>Tipo de comisión</Text>
              <SegmentedControl
                fullWidth
                value={commissionType}
                onChange={(v) => { setCommissionType(v as "percentage" | "fixed"); setCommissionValue(0); }}
                data={[
                  { label: "Porcentaje (%)", value: "percentage" },
                  { label: "Valor fijo", value: "fixed" },
                ]}
              />
              <NumberInput
                mt="xs"
                placeholder={commissionType === "percentage" ? "Ej: 30" : "Ej: 15000"}
                description={commissionType === "percentage"
                  ? "Porcentaje sobre el valor de cada cita (0-100)"
                  : "Monto fijo por cada cita confirmada"}
                min={0}
                max={commissionType === "percentage" ? 100 : undefined}
                value={commissionValue}
                onChange={(v) => setCommissionValue(typeof v === "number" ? v : 0)}
                rightSection={<Text size="xs" c="dimmed" pr={4}>{commissionType === "percentage" ? "%" : "$"}</Text>}
              />
            </Box>
          </Stack>
        </Grid.Col>

        {/* Columna derecha */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            {/* Servicios */}
            <Box>
              <Text size="sm" fw={500} mb="xs">Servicios que atiende</Text>
              <Paper withBorder p="md" radius="md">
                {serviceOptions.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center">
                    No hay servicios creados aún
                  </Text>
                ) : (
                  <ScrollArea.Autosize mah={160}>
                    <Stack gap="xs">
                      {serviceOptions.map((svc) => (
                        <Checkbox
                          key={svc._id}
                          label={svc.name}
                          checked={selectedServiceIds.includes(svc._id)}
                          onChange={() => toggleService(svc._id)}
                        />
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Paper>
            </Box>

            {/* Imagen de perfil */}
            <Box>
              <Text size="sm" fw={500} mb="xs">Foto de perfil (opcional)</Text>
              <Dropzone
                onDrop={handleDrop}
                accept={IMAGE_MIME_TYPE}
                multiple={false}
                loading={isUploading}
                style={{
                  border: "2px dashed var(--mantine-color-gray-4)",
                  borderRadius: 8,
                  minHeight: profileImage ? "auto" : 120,
                }}
              >
                <Group justify="center" p="md">
                  {isUploading ? (
                    <Stack align="center" gap="xs">
                      <Loader size="md" />
                      <Text size="sm" c="dimmed">Subiendo imagen...</Text>
                    </Stack>
                  ) : profileImage ? (
                    <Box pos="relative">
                      <Image src={profileImage} alt="Perfil" width={100} height={100} radius="md" />
                      <ActionIcon
                        style={{ position: "absolute", top: -8, right: -8 }}
                        variant="filled" radius="xl" size="sm" color="red"
                        onClick={(e) => { e.stopPropagation(); setProfileImage(""); }}
                      >
                        <BiSolidXCircle />
                      </ActionIcon>
                    </Box>
                  ) : (
                    <Stack align="center" gap="xs">
                      <BiImageAdd size={36} color="#228be6" />
                      <Text size="sm" ta="center">Arrastra una imagen o haz clic</Text>
                    </Stack>
                  )}
                </Group>
              </Dropzone>
            </Box>
          </Stack>
        </Grid.Col>
      </Grid>

      <Divider />
      <Group justify="space-between">
        <Button variant="default" onClick={onBack} size="md">
          ← Anterior
        </Button>
        <Group>
          {!canSave && <Text size="sm" c="dimmed">Completa los campos obligatorios (*)</Text>}
          <Button size="md" onClick={handleSave} loading={saving} disabled={!canSave}>
            Crear profesional y continuar →
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
