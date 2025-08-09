/* eslint-disable @typescript-eslint/no-explicit-any */
import {  useState } from "react";
import {
  Stack,
  TextInput,
  Loader,
  SimpleGrid,
  Text,
  Group,
  Badge,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { getClientByPhoneNumberAndOrganization } from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Reservation } from "../../services/reservationService";

interface StepCustomerDataProps {
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
}

const phoneOnlyDigits = (v: string) => v.replace(/\D+/g, "");
const isValidEmail = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const StepCustomerData: React.FC<StepCustomerDataProps> = ({
  bookingData,
  setBookingData,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)"); // ~768px

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const customerDetails = bookingData.customerDetails || {
    name: "",
    email: "",
    phone: "",
    birthDate: null,
  };

  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);

  const minPhoneLen = 7;

  const handleInputChange = (
    field: keyof Reservation["customerDetails"],
    value: string | Date | null
  ) => {
    // limpia errores al tipear
    if (field === "phone") setPhoneError(null);
    if (field === "email") setEmailError(null);

    setBookingData((prev) => ({
      ...prev,
      customerDetails: {
        ...(prev.customerDetails || customerDetails),
        [field]: value as any,
      },
    }));
  };

  const handlePhoneBlur = async () => {
    const raw = customerDetails.phone || "";
    const digits = phoneOnlyDigits(raw);

    // validación mínima
    if (!digits || digits.length < minPhoneLen) {
      setPhoneError(`Ingresa al menos ${minPhoneLen} dígitos`);
      return;
    }

    setIsCheckingPhone(true);
    setFoundName(null);

    try {
      const orgId = organization?._id as string;
      const client = await getClientByPhoneNumberAndOrganization(digits, orgId);

      if (client) {
        // Rellena datos si vienen vacíos o distintos
        setBookingData((prev) => {
          const prevDetails = prev.customerDetails || customerDetails;
          return {
            ...prev,
            customerDetails: {
              ...prevDetails,
              name: prevDetails.name?.trim() ? prevDetails.name : client.name || "",
              email: prevDetails.email?.trim() ? prevDetails.email : client.email || "",
              phone: raw, // mantenemos lo que el usuario digitó (con o sin espacios)
              birthDate: client.birthDate ? new Date(client.birthDate) : prevDetails.birthDate ?? null,
            },
          };
        });
        if (client.name) setFoundName(client.name);
      }
    } catch (error) {
      // No bloqueamos el flujo si falla la búsqueda
      // Puedes agregar notificación si lo deseas
      console.error("Error al verificar el cliente:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleEmailBlur = () => {
    const email = (customerDetails.email || "").trim();
    if (!isValidEmail(email)) {
      setEmailError("Correo no válido");
    } else {
      setEmailError(null);
      // opcional: normalizar a lowercase
      if (email && email !== customerDetails.email) {
        handleInputChange("email", email.toLowerCase());
      }
    }
  };

  return (
    <Stack>
      {/* Teléfono arriba para auto-lookup */}
      <Stack gap={6}>
        <TextInput
          label="Teléfono"
          placeholder="Ingresa tu número de teléfono"
          value={customerDetails.phone}
          onChange={(e) => handleInputChange("phone", e.currentTarget.value)}
          onBlur={handlePhoneBlur}
          rightSection={isCheckingPhone ? <Loader size="xs" /> : null}
          error={phoneError}
          autoComplete="tel"
          inputMode="tel"
        />
        {foundName && !isCheckingPhone && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Cliente detectado:
            </Text>
            <Badge variant="light" size="sm">{foundName}</Badge>
          </Group>
        )}
      </Stack>

      {/* Nombre y correo lado a lado en desktop */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={isMobile ? "sm" : "md"}>
        <TextInput
          label="Nombre completo"
          placeholder="Ingresa tu nombre"
          value={customerDetails.name}
          onChange={(e) => handleInputChange("name", e.currentTarget.value)}
          disabled={isCheckingPhone}
          autoComplete="name"
        />

        <TextInput
          label="Correo electrónico"
          placeholder="Ingresa tu correo"
          type="email"
          value={customerDetails.email}
          onChange={(e) => handleInputChange("email", e.currentTarget.value)}
          onBlur={handleEmailBlur}
          error={emailError}
          disabled={isCheckingPhone}
          autoComplete="email"
        />
      </SimpleGrid>

      <DateInput
        label="Fecha de nacimiento"
        value={customerDetails.birthDate}
        locale="es"
        valueFormat="DD/MM/YYYY"
        onChange={(value) => handleInputChange("birthDate", value)}
        placeholder="Selecciona una fecha 00/00/0000"
        maxDate={new Date()}
        clearable
        popoverProps={{ withinPortal: true, trapFocus: false }}
      />
    </Stack>
  );
};

export default StepCustomerData;
