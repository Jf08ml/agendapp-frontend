import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Stack,
  Button,
  Group,
  Text,
  Paper,
  Title,
  Divider,
  ThemeIcon,
  Select,
  TextInput,
  Badge,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconUserPlus } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { ServicePackage } from "../../../../services/packageService";
import { formatCurrency } from "../../../../utils/formatCurrency";

interface Client {
  _id: string;
  name: string;
  phoneNumber: string;
}

interface ModalAssignPackageProps {
  isOpen: boolean;
  onClose: () => void;
  servicePackage: ServicePackage | null;
  clients: Client[];
  onAssign: (data: {
    servicePackageId: string;
    clientId: string;
    paymentMethod: string;
    paymentNotes: string;
    purchaseDate: string;
  }) => void;
  currency?: string;
}

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "nequi", label: "Nequi" },
  { value: "daviplata", label: "Daviplata" },
  { value: "otro", label: "Otro" },
];

const ModalAssignPackage: React.FC<ModalAssignPackageProps> = ({
  isOpen,
  onClose,
  servicePackage,
  clients,
  onAssign,
  currency = "COP",
}) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch] = useDebouncedValue(clientSearch, 250);
  const [paymentMethod, setPaymentMethod] = useState<string | null>("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientId(null);
      setClientSearch("");
      setPaymentMethod("efectivo");
      setPaymentNotes("");
      setPurchaseDate(new Date());
    }
  }, [isOpen]);

  const clientOptions = useMemo(() => {
    const q = debouncedClientSearch.toLowerCase();
    return clients
      .filter(
        (c) =>
          !q || c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q)
      )
      .slice(0, 50)
      .map((c) => ({
        value: c._id,
        label: `${c.name} - ${c.phoneNumber}`,
      }));
  }, [clients, debouncedClientSearch]);

  const expirationDate = useMemo(() => {
    if (!purchaseDate || !servicePackage) return null;
    const exp = new Date(purchaseDate);
    exp.setDate(exp.getDate() + servicePackage.validityDays);
    return exp;
  }, [purchaseDate, servicePackage]);

  const canSave = clientId && paymentMethod && purchaseDate && servicePackage;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onAssign({
        servicePackageId: servicePackage._id,
        clientId: clientId!,
        paymentMethod: paymentMethod!,
        paymentNotes,
        purchaseDate: purchaseDate!.toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!servicePackage) return null;

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" size="lg" radius="md" color="teal">
            <IconUserPlus size={20} />
          </ThemeIcon>
          <Title order={3}>Asignar Paquete a Cliente</Title>
        </Group>
      }
      size="md"
      centered
      radius="md"
      overlayProps={{ blur: 2 }}
    >
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Group justify="space-between">
            <div>
              <Text fw={700} size="lg">{servicePackage.name}</Text>
              <Text size="sm" c="dimmed">
                {servicePackage.validityDays} días de vigencia
              </Text>
            </div>
            <Badge size="xl" variant="light" color="teal">
              {formatCurrency(servicePackage.price, currency)}
            </Badge>
          </Group>
        </Paper>

        <Select
          label="Cliente"
          placeholder="Busca por nombre o teléfono..."
          data={clientOptions}
          value={clientId}
          onChange={setClientId}
          searchable
          onSearchChange={setClientSearch}
          searchValue={clientSearch}
          nothingFoundMessage="No se encontraron clientes"
          required
          withAsterisk
        />

        <Group grow>
          <DateInput
            label="Fecha de inicio"
            value={purchaseDate}
            onChange={setPurchaseDate}
            required
            withAsterisk
          />
          <div>
            <Text size="sm" fw={500} mb={4}>Fecha de expiración</Text>
            <Paper withBorder p="sm" radius="sm" bg="gray.0">
              <Text size="sm" fw={500} c={expirationDate ? "teal" : "dimmed"}>
                {expirationDate
                  ? expirationDate.toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Selecciona fecha de inicio"}
              </Text>
            </Paper>
          </div>
        </Group>

        <Select
          label="Método de pago"
          data={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={setPaymentMethod}
          required
          withAsterisk
        />

        <TextInput
          label="Notas de pago"
          placeholder="Ej: Transferencia Bancolombia ref #123456"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.currentTarget.value)}
        />

        <Divider />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} size="md">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!canSave}
            size="md"
            color="teal"
          >
            Asignar paquete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ModalAssignPackage;
