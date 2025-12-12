/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/OrganizationInfo/components/tabs/PaymentMethodsTab.tsx
import { useState } from "react";
import {
  Stack,
  Button,
  Card,
  Text,
  Group,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Textarea,
  Image,
  FileButton,
  Alert,
  Grid,
  Switch,
  NumberInput,
  Divider,
} from "@mantine/core";
import { BiPlus, BiEdit, BiTrash, BiInfoCircle } from "react-icons/bi";
import { PaymentMethod } from "../../../../../services/organizationService";
import { uploadImage } from "../../../../../services/imageService";
import { notifications } from "@mantine/notifications";

interface PaymentMethodsTabProps {
  paymentMethods: PaymentMethod[];
  requireReservationDeposit?: boolean;
  reservationDepositPercentage?: number;
  onSave: (data: {
    methods: PaymentMethod[];
    requireDeposit: boolean;
    depositPercentage: number;
  }) => Promise<void>;
}

export default function PaymentMethodsTab({
  paymentMethods = [],
  requireReservationDeposit = false,
  reservationDepositPercentage = 50,
  onSave,
}: PaymentMethodsTabProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>(paymentMethods);
  const [requireDeposit, setRequireDeposit] = useState(requireReservationDeposit);
  const [depositPercentage, setDepositPercentage] = useState(reservationDepositPercentage);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PaymentMethod>({
    type: "nequi",
    accountName: "",
    accountNumber: "",
    phoneNumber: "",
    qrCodeUrl: "",
    notes: "",
  });

  const paymentTypeLabels: Record<string, string> = {
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    daviplata: "Daviplata",
    otros: "Otros",
  };

  const handleOpenModal = (index?: number) => {
    if (index !== undefined && index !== null) {
      setEditingIndex(index);
      setFormData(methods[index]);
    } else {
      setEditingIndex(null);
      setFormData({
        type: "nequi",
        accountName: "",
        accountNumber: "",
        phoneNumber: "",
        qrCodeUrl: "",
        notes: "",
      });
    }
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setEditingIndex(null);
  };

  const handleSaveMethod = () => {
    const updatedMethods = [...methods];
    if (editingIndex !== null) {
      updatedMethods[editingIndex] = formData;
    } else {
      updatedMethods.push(formData);
    }
    setMethods(updatedMethods);
    handleCloseModal();
  };

  const handleDeleteMethod = (index: number) => {
    const updatedMethods = methods.filter((_, i) => i !== index);
    setMethods(updatedMethods);
  };

  const handleUploadQR = async (file: File | null) => {
    if (!file) return;

    setUploadingQR(true);
    try {
      const imageUrl = await uploadImage(file);
      setFormData({ ...formData, qrCodeUrl: imageUrl });
      notifications.show({
        title: "QR subido",
        message: "El código QR se ha subido correctamente",
        color: "green",
      });
    } catch (error) {
      console.error("Error uploading QR code:", error);
      notifications.show({
        title: "Error",
        message: "No se pudo subir el código QR",
        color: "red",
      });
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await onSave({
        methods,
        requireDeposit,
        depositPercentage,
      });
      notifications.show({
        title: "Guardado",
        message: "Métodos de pago actualizados correctamente",
        color: "green",
      });
    } catch (error) {
        console.error("Error saving payment methods:", error);
      notifications.show({
        title: "Error",
        message: "No se pudieron guardar los métodos de pago",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Alert icon={<BiInfoCircle />} color="blue" variant="light">
        Configura tus métodos de pago para que tus clientes puedan realizar pagos.
        Puedes agregar datos bancarios y códigos QR.
      </Alert>

      {/* Configuración de depósito para reservas */}
      <Card withBorder padding="md">
        <Stack gap="md">
          <Text size="md" fw={600}>
            Depósito para Reservas Online
          </Text>
          
          <Switch
            label="Requerir abono para aprobar reservas"
            description="Los clientes deberán hacer un abono antes de que la reserva sea aprobada"
            checked={requireDeposit}
            onChange={(e) => setRequireDeposit(e.currentTarget.checked)}
          />

          {requireDeposit && (
            <NumberInput
              label="Porcentaje de abono requerido"
              description="Porcentaje del total que el cliente debe abonar"
              value={depositPercentage}
              onChange={(val) => setDepositPercentage(val as number)}
              min={0}
              max={100}
              suffix="%"
              step={5}
            />
          )}
        </Stack>
      </Card>

      <Divider />

      <Group justify="space-between">
        <Text size="lg" fw={600}>
          Métodos de Pago Configurados
        </Text>
        <Button
          leftSection={<BiPlus />}
          onClick={() => handleOpenModal()}
          variant="light"
        >
          Agregar Método
        </Button>
      </Group>

      <Stack gap="sm">
        {methods.length === 0 ? (
          <Card withBorder padding="xl">
            <Text c="dimmed" ta="center">
              No hay métodos de pago configurados.
              <br />
              Haz clic en "Agregar Método" para comenzar.
            </Text>
          </Card>
        ) : (
          methods.map((method, index) => (
            <Card key={index} withBorder padding="md">
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Badge variant="light" color="blue">
                      {paymentTypeLabels[method.type]}
                    </Badge>
                    {method.accountName && (
                      <Text size="sm" fw={500}>
                        {method.accountName}
                      </Text>
                    )}
                  </Group>

                  {method.phoneNumber && (
                    <Text size="sm" c="dimmed">
                      📱 {method.phoneNumber}
                    </Text>
                  )}

                  {method.accountNumber && (
                    <Text size="sm" c="dimmed">
                      🔢 {method.accountNumber}
                    </Text>
                  )}

                  {method.qrCodeUrl && (
                    <Text size="xs" c="blue">
                      ✓ Código QR disponible
                    </Text>
                  )}

                  {method.notes && (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {method.notes}
                    </Text>
                  )}
                </Stack>

                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleOpenModal(index)}
                  >
                    <BiEdit size={18} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleDeleteMethod(index)}
                  >
                    <BiTrash size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>

      <Button onClick={handleSaveAll} loading={loading} disabled={loading}>
        Guardar Métodos de Pago
      </Button>

      {/* Modal para agregar/editar método */}
      <Modal
        opened={modalOpened}
        onClose={handleCloseModal}
        title={
          editingIndex !== null
            ? "Editar Método de Pago"
            : "Nuevo Método de Pago"
        }
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Tipo de Método"
            placeholder="Selecciona un tipo"
            data={[
              { value: "nequi", label: "Nequi" },
              { value: "bancolombia", label: "Bancolombia" },
              { value: "daviplata", label: "Daviplata" },
              { value: "otros", label: "Otros" },
            ]}
            value={formData.type}
            onChange={(value) =>
              setFormData({ ...formData, type: value as any })
            }
            required
          />

          <TextInput
            label="Nombre de la Cuenta / Titular"
            placeholder="Ej: Nataly Gómez"
            value={formData.accountName}
            onChange={(e) =>
              setFormData({ ...formData, accountName: e.target.value })
            }
          />

          <Grid>
            <Grid.Col span={6}>
              <TextInput
                label="Número de Teléfono"
                placeholder="3184345284"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Número de Cuenta"
                placeholder="123456789"
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
              />
            </Grid.Col>
          </Grid>

          <Textarea
            label="Notas Adicionales"
            placeholder="Instrucciones o información adicional..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            minRows={2}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Código QR (opcional)
            </Text>
            {formData.qrCodeUrl && (
              <Image
                src={formData.qrCodeUrl}
                alt="QR Code"
                width={200}
                height={200}
                fit="contain"
              />
            )}
            <FileButton
              onChange={handleUploadQR}
              accept="image/png,image/jpeg,image/jpg"
            >
              {(props) => (
                <Button
                  {...props}
                  variant="light"
                  loading={uploadingQR}
                  leftSection={<BiPlus />}
                >
                  {formData.qrCodeUrl ? "Cambiar QR" : "Subir QR"}
                </Button>
              )}
            </FileButton>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMethod}>
              {editingIndex !== null ? "Actualizar" : "Agregar"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
