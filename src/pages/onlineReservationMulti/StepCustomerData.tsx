/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import {
  Stack,
  TextInput,
  Textarea,
  Loader,
  SimpleGrid,
  Text,
  Group,
  Badge,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import {
  getClientByIdentifier,
  updateClient,
} from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Reservation } from "../../services/reservationService";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { CountryCode } from "libphonenumber-js";
import { checkClientPackagesPublic, ClientPackage } from "../../services/packageService";
import { Paper, Checkbox } from "@mantine/core";
import { IconPackage } from "@tabler/icons-react";
import {
  DEFAULT_CLIENT_FORM_CONFIG,
  type ClientFieldConfig,
} from "../../services/organizationService";

interface StepCustomerDataProps {
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
  onClientUpdateReady?: (updateFn: () => Promise<boolean>) => void;
  selectedServiceIds?: string[];
  onPackageDetected?: (clientPackageId: string | null, packageInfo: any) => void;
}

const isValidEmail = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const IDENTIFIER_LABELS: Record<string, string> = {
  phone: "Teléfono",
  email: "Correo electrónico",
  documentId: "Número de documento",
};

const StepCustomerData: React.FC<StepCustomerDataProps> = ({
  bookingData,
  setBookingData,
  onClientUpdateReady,
  selectedServiceIds = [],
  onPackageDetected,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  // Config dinámica — si no existe, usar defaults (comportamiento original)
  const rawConfig = organization?.clientFormConfig;
  const identifierField: 'phone' | 'email' | 'documentId' =
    rawConfig?.identifierField ?? DEFAULT_CLIENT_FORM_CONFIG.identifierField;
  const configFields: ClientFieldConfig[] =
    rawConfig?.fields?.length ? rawConfig.fields : DEFAULT_CLIENT_FORM_CONFIG.fields;

  const fieldCfg = (key: ClientFieldConfig['key']) =>
    configFields.find((f) => f.key === key) ?? { key, enabled: false, required: false };

  const customerDetails = bookingData.customerDetails || {
    name: "",
    email: "",
    phone: "",
    birthDate: null,
    documentId: "",
    notes: "",
  };

  // Estado del campo teléfono (necesario para InternationalPhoneInput)
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneValid, setPhoneValid] = useState<boolean>(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [detectedPackages, setDetectedPackages] = useState<ClientPackage[]>([]);
  const [useDetectedPackage, setUseDetectedPackage] = useState(true);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (customerDetails.phone) {
        setPhoneE164(customerDetails.phone);
        setPhoneValid(customerDetails.phone.length >= 7);
      }
    }
  }, []);

  const handleInputChange = (
    field: keyof Reservation["customerDetails"],
    value: string | Date | null
  ) => {
    if (field === "email") setEmailError(null);
    const currentValue = customerDetails[field];
    if (currentValue !== value) {
      setBookingData((prev) => ({
        ...prev,
        customerDetails: {
          ...(prev.customerDetails || customerDetails),
          [field]: value as any,
        },
      }));
    }
  };

  const handlePhoneChange = (
    phone_e164: string | null,
    phone_country: CountryCode | null,
    isValid: boolean
  ) => {
    if (isInitialMount.current) return;
    setPhoneE164(phone_e164);
    setPhoneCountry(phone_country);
    setPhoneValid(isValid);
    setPhoneError(null);
    const newPhone = phone_e164 ?? "";
    if (customerDetails.phone !== newPhone) {
      setBookingData((prev) => ({
        ...prev,
        customerDetails: {
          ...(prev.customerDetails || customerDetails),
          phone: newPhone,
        },
      }));
    }
    if (phone_e164 && !isValid) setPhoneError("Número de teléfono inválido");
  };

  // Lookup unificado: se llama desde el blur del campo identificador
  const runLookup = async (field: typeof identifierField, value: string) => {
    if (!value?.trim()) return;
    const orgId = organization?._id as string;
    if (!orgId) return;

    setIsLookingUp(true);
    setFoundName(null);

    try {
      const client = await getClientByIdentifier(field, value, orgId);

      if (client) {
        setClientId(client._id);
        setBookingData((prev) => {
          const prevDetails = prev.customerDetails || customerDetails;
          return {
            ...prev,
            customerDetails: {
              ...prevDetails,
              name: prevDetails.name?.trim() ? prevDetails.name : client.name || "",
              email: prevDetails.email?.trim() ? prevDetails.email : client.email || "",
              phone: field === "phone" ? value : (prevDetails.phone || ""),
              birthDate: client.birthDate ? new Date(client.birthDate) : prevDetails.birthDate ?? null,
              documentId: prevDetails.documentId?.trim() ? prevDetails.documentId : client.documentId || "",
              notes: prevDetails.notes?.trim() ? prevDetails.notes : client.notes || "",
            },
          };
        });
        if (client.name) setFoundName(client.name);

        // Detección de paquetes activos (usa teléfono del cliente encontrado o el actual)
        const phoneForPkg =
          field === "phone" ? value : (client.phone_e164 || "");
        if (selectedServiceIds.length > 0 && phoneForPkg) {
          try {
            const pkgResult = await checkClientPackagesPublic(
              phoneForPkg,
              selectedServiceIds,
              orgId
            );
            if (pkgResult.packages.length > 0) {
              setDetectedPackages(pkgResult.packages);
              setUseDetectedPackage(true);
              onPackageDetected?.(pkgResult.packages[0]._id, pkgResult.packages[0]);
            } else {
              setDetectedPackages([]);
              onPackageDetected?.(null, null);
            }
          } catch {
            setDetectedPackages([]);
          }
        }
      } else {
        setClientId(null);
        setDetectedPackages([]);
        onPackageDetected?.(null, null);
      }
    } catch {
      setClientId(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Blur del identificador teléfono
  const handlePhoneIdentifierBlur = async () => {
    if (!phoneValid || !phoneE164) {
      setPhoneError("Ingresa un número de teléfono válido");
      return;
    }
    await runLookup("phone", phoneE164);
  };

  // Blur del identificador email
  const handleEmailBlur = async () => {
    const email = (customerDetails.email || "").trim();
    if (email && !isValidEmail(email)) {
      setEmailError("Correo no válido");
      return;
    }
    setEmailError(null);
    if (email && email !== customerDetails.email) {
      handleInputChange("email", email.toLowerCase());
    }
    if (identifierField === "email" && email) {
      await runLookup("email", email);
    }
  };

  // Blur del identificador documento
  const handleDocumentIdBlur = async () => {
    const val = (customerDetails.documentId || "").trim();
    if (identifierField === "documentId" && val) {
      await runLookup("documentId", val);
    }
  };

  // Actualizar cliente existente antes de confirmar reserva
  const updateClientIfNeeded = async (): Promise<boolean> => {
    if (!clientId) return true;
    try {
      const updates: Partial<any> = {};
      if (customerDetails.name?.trim()) updates.name = customerDetails.name.trim();
      if (customerDetails.email?.trim()) updates.email = customerDetails.email.trim();
      if (customerDetails.birthDate) updates.birthDate = customerDetails.birthDate;
      if (customerDetails.documentId?.trim()) updates.documentId = customerDetails.documentId.trim();
      if (customerDetails.notes?.trim()) updates.notes = customerDetails.notes.trim();
      if (phoneE164) {
        updates.phoneNumber = phoneE164;
        updates.phone_country = phoneCountry || undefined;
      }
      if (Object.keys(updates).length > 0) await updateClient(clientId, updates);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (onClientUpdateReady) onClientUpdateReady(updateClientIfNeeded);
  }, [clientId, customerDetails, phoneE164, phoneCountry, onClientUpdateReady]);

  const phoneCfg       = fieldCfg("phone");
  const emailCfg       = fieldCfg("email");
  const birthDateCfg   = fieldCfg("birthDate");
  const documentIdCfg  = fieldCfg("documentId");
  const notesCfg       = fieldCfg("notes");

  // Feedback del lookup (siempre visible bajo el campo identificador)
  const LookupFeedback = () => (
    <>
      {isLookingUp && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Buscando por {IDENTIFIER_LABELS[identifierField]}...
          </Text>
        </Group>
      )}
      {foundName && !isLookingUp && (
        <Group gap="xs">
          <Text size="xs" c="dimmed">Cliente encontrado:</Text>
          <Badge variant="light" size="sm">{foundName}</Badge>
        </Group>
      )}
    </>
  );

  return (
    <Stack>

      {/* ── CAMPO IDENTIFICADOR (siempre primero) ─────────────────── */}

      {identifierField === "phone" && (
        <Stack gap={6}>
          <InternationalPhoneInput
            value={customerDetails.phone || ""}
            organizationDefaultCountry={organization?.default_country as CountryCode}
            onChange={handlePhoneChange}
            onBlur={handlePhoneIdentifierBlur}
            error={phoneError}
            label={phoneCfg.label || IDENTIFIER_LABELS.phone}
            placeholder="300 000 0000"
            required
            compact
          />
          <LookupFeedback />
        </Stack>
      )}

      {identifierField === "email" && (
        <Stack gap={6}>
          <TextInput
            label={emailCfg.label || IDENTIFIER_LABELS.email}
            placeholder="Ingresa tu correo"
            type="email"
            value={customerDetails.email || ""}
            onChange={(e) => handleInputChange("email", e.currentTarget.value)}
            onBlur={handleEmailBlur}
            error={emailError}
            required
            disabled={isLookingUp}
            autoComplete="email"
          />
          <LookupFeedback />
        </Stack>
      )}

      {identifierField === "documentId" && (
        <Stack gap={6}>
          <TextInput
            label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
            placeholder="Cédula, pasaporte, etc."
            value={customerDetails.documentId || ""}
            onChange={(e) => handleInputChange("documentId", e.currentTarget.value)}
            onBlur={handleDocumentIdBlur}
            required
            disabled={isLookingUp}
          />
          <LookupFeedback />
        </Stack>
      )}

      <Divider />

      {/* ── NOMBRE (siempre obligatorio) ─────────────────────────── */}
      <TextInput
        label="Nombre completo"
        placeholder="Ingresa tu nombre"
        value={customerDetails.name}
        onChange={(e) => handleInputChange("name", e.currentTarget.value)}
        disabled={isLookingUp}
        required
        autoComplete="name"
      />

      {/* ── CAMPOS SECUNDARIOS (excluyendo el que ya es identificador) */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={isMobile ? "sm" : "md"}>

        {/* Teléfono — solo si está habilitado Y no es el identificador */}
        {phoneCfg.enabled && identifierField !== "phone" && (
          <InternationalPhoneInput
            value={customerDetails.phone || ""}
            organizationDefaultCountry={organization?.default_country as CountryCode}
            onChange={handlePhoneChange}
            onBlur={() => {
              if (phoneE164 && !phoneValid) setPhoneError("Número de teléfono inválido");
            }}
            error={phoneError}
            label={phoneCfg.label || IDENTIFIER_LABELS.phone}
            placeholder="300 000 0000"
            required={phoneCfg.required}
            compact
          />
        )}

        {/* Correo — solo si está habilitado Y no es el identificador */}
        {emailCfg.enabled && identifierField !== "email" && (
          <TextInput
            label={emailCfg.label || IDENTIFIER_LABELS.email}
            placeholder="Ingresa tu correo"
            type="email"
            value={customerDetails.email || ""}
            onChange={(e) => handleInputChange("email", e.currentTarget.value)}
            onBlur={handleEmailBlur}
            error={emailError}
            required={emailCfg.required}
            disabled={isLookingUp}
            autoComplete="email"
          />
        )}

        {/* Documento — solo si está habilitado Y no es el identificador */}
        {documentIdCfg.enabled && identifierField !== "documentId" && (
          <TextInput
            label={documentIdCfg.label || IDENTIFIER_LABELS.documentId}
            placeholder="Cédula, pasaporte, etc."
            value={customerDetails.documentId || ""}
            onChange={(e) => handleInputChange("documentId", e.currentTarget.value)}
            required={documentIdCfg.required}
            disabled={isLookingUp}
          />
        )}

        {/* Fecha de nacimiento */}
        {birthDateCfg.enabled && (
          <DateInput
            label={birthDateCfg.label || "Fecha de nacimiento"}
            value={customerDetails.birthDate}
            locale="es"
            valueFormat="DD/MM/YYYY"
            onChange={(value) => handleInputChange("birthDate", value)}
            placeholder="Selecciona una fecha 00/00/0000"
            maxDate={new Date()}
            required={birthDateCfg.required}
            clearable
            popoverProps={{ withinPortal: true, trapFocus: false }}
          />
        )}
      </SimpleGrid>

      {/* Notas */}
      {notesCfg.enabled && (
        <Textarea
          label={notesCfg.label || "Notas"}
          placeholder="Información adicional..."
          value={customerDetails.notes || ""}
          onChange={(e) => handleInputChange("notes", e.currentTarget.value)}
          required={notesCfg.required}
          minRows={2}
          autosize
        />
      )}

      {/* Paquetes de sesiones detectados */}
      {detectedPackages.length > 0 && (
        <Paper withBorder p="md" radius="md" bg="teal.0" style={{ borderColor: "#63e6be" }}>
          <Group gap="xs" mb="xs">
            <IconPackage size={18} color="#099268" />
            <Text size="sm" fw={600} c="teal.8">
              Paquete de sesiones detectado
            </Text>
          </Group>
          {detectedPackages.map((pkg) => {
            const pkgName =
              typeof pkg.servicePackageId === "object"
                ? pkg.servicePackageId.name
                : "Paquete";
            return (
              <Paper key={pkg._id} withBorder p="sm" radius="sm" mb="xs" bg="white">
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>{pkgName}</Text>
                  <Badge variant="light" color="teal" size="sm">Activo</Badge>
                </Group>
                {pkg.services.map((svc, idx) => {
                  const svcName =
                    typeof svc.serviceId === "object"
                      ? svc.serviceId.name
                      : "Servicio";
                  return svc.sessionsRemaining > 0 ? (
                    <Group key={idx} justify="space-between" gap="xs">
                      <Text size="xs">{svcName}</Text>
                      <Text size="xs" c="teal" fw={600}>
                        {svc.sessionsRemaining} sesiones restantes
                      </Text>
                    </Group>
                  ) : null;
                })}
              </Paper>
            );
          })}
          <Checkbox
            label="Usar mi paquete para esta reserva"
            checked={useDetectedPackage}
            onChange={(event) => {
              setUseDetectedPackage(event.currentTarget.checked);
              if (event.currentTarget.checked && detectedPackages.length > 0) {
                onPackageDetected?.(detectedPackages[0]._id, detectedPackages[0]);
              } else {
                onPackageDetected?.(null, null);
              }
            }}
            color="teal"
            size="sm"
            mt="xs"
          />
        </Paper>
      )}
    </Stack>
  );
};

export default StepCustomerData;
