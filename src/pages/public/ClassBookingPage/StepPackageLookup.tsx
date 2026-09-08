import { useState } from "react";
import {
  Stack, Text, TextInput, Button, Card, Group,
  Alert, List, ThemeIcon, Anchor,
} from "@mantine/core";
import { IconInfoCircle, IconCheck, IconTicket } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { CountryCode } from "libphonenumber-js";
import InternationalPhoneInput from "../../../components/InternationalPhoneInput";
import { ClassType } from "../../../services/classService";
import {
  checkClientClassPackagesByIdentifier,
  ClientPackage,
} from "../../../services/packageService";

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

interface Props {
  identifierField: "phone" | "email" | "documentId";
  organizationCountry?: string;
  organizationId: string;
  classes: ClassType[];
  loadingClasses?: boolean;
  onBack: () => void;
  onFallbackSingle: () => void;
  onFound: (identifierValue: string, packages: ClientPackage[]) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export default function StepPackageLookup({
  identifierField, organizationCountry, organizationId, classes, loadingClasses,
  onBack, onFallbackSingle, onFound,
}: Props) {
  const [value, setValue] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [foundPackages, setFoundPackages] = useState<ClientPackage[]>([]);

  const canSearch = (identifierField === "phone" ? phoneValid : value.trim().length > 0) && !loadingClasses;

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    try {
      const classIds = classes.map((c) => c._id);
      const res = await checkClientClassPackagesByIdentifier(
        identifierField, value.trim(), classIds, organizationId
      );
      setFoundPackages(res.packages);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  if (searched) {
    if (foundPackages.length === 0) {
      return (
        <Stack gap="md">
          <Text fw={600} size="lg">Usar mi paquete</Text>
          <Alert icon={<IconInfoCircle size={18} />} color="yellow" variant="light">
            No encontramos un paquete activo con ese {IDENTIFIER_LABELS[identifierField].toLowerCase()}.
          </Alert>
          <Group>
            <Button component={Link} to="/comprar-paquete" variant="light">
              Comprar un paquete
            </Button>
            <Button onClick={onFallbackSingle}>Continuar pagando por clase</Button>
          </Group>
          <Anchor size="sm" onClick={() => setSearched(false)}>Buscar de nuevo</Anchor>
        </Stack>
      );
    }

    return (
      <Stack gap="md">
        <Text fw={600} size="lg">Tu paquete</Text>
        <Text size="sm" c="dimmed">
          Encontramos {foundPackages.length === 1 ? "este paquete" : "estos paquetes"} con créditos disponibles.
        </Text>
        {foundPackages.map((pkg) => {
          const pkgName = typeof pkg.servicePackageId === "object" ? pkg.servicePackageId.name : "Paquete";
          const availableClasses = (pkg.classes || []).filter((c) => c.sessionsRemaining > 0);
          return (
            <Card key={pkg._id} withBorder radius="md" p="md">
              <Group gap="xs" mb="xs">
                <ThemeIcon size="sm" variant="light" color="grape"><IconTicket size={14} /></ThemeIcon>
                <Text fw={600}>{pkgName}</Text>
              </Group>
              <List
                size="sm"
                spacing={4}
                icon={<ThemeIcon color="teal" size={16} radius="xl"><IconCheck size={11} /></ThemeIcon>}
              >
                {availableClasses.map((c, i) => {
                  const className = typeof c.classId === "object" ? c.classId.name : "Clase";
                  return (
                    <List.Item key={i}>
                      {className}: quedan {c.sessionsRemaining} de {c.sessionsIncluded} sesiones
                    </List.Item>
                  );
                })}
              </List>
              <Text size="xs" c="dimmed" mt={6}>
                Vence el {formatDate(pkg.expirationDate)}. Al reservar con este paquete se descuenta 1 sesión y tu cupo no tiene costo.
              </Text>
            </Card>
          );
        })}
        <Group justify="space-between">
          <Anchor size="sm" onClick={() => setSearched(false)}>Buscar con otro dato</Anchor>
          <Button onClick={() => onFound(value.trim(), foundPackages)}>Continuar</Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text fw={600} size="lg">Usar mi paquete</Text>
      <Text size="sm" c="dimmed">
        Ingresa el dato con el que compraste tu paquete para verificar tus créditos disponibles.
      </Text>

      {identifierField === "phone" ? (
        <InternationalPhoneInput
          label={IDENTIFIER_LABELS.phone}
          value={value}
          organizationDefaultCountry={organizationCountry as CountryCode}
          onChange={(e164, _country, isValid) => {
            setValue(e164 ?? "");
            setPhoneValid(isValid);
          }}
          compact
        />
      ) : (
        <TextInput
          label={IDENTIFIER_LABELS[identifierField]}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          type={identifierField === "email" ? "email" : "text"}
        />
      )}

      <Group justify="space-between">
        <Anchor size="sm" onClick={onBack}>Atrás</Anchor>
        <Group gap="sm">
          <Anchor size="sm" onClick={onFallbackSingle}>Prefiero pagar por clase</Anchor>
          <Button onClick={handleSearch} disabled={!canSearch} loading={loading}>
            Buscar mi paquete
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
