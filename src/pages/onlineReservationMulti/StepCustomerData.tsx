/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
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
import { 
  getClientByPhoneNumberAndOrganization,
  updateClient
} from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Reservation } from "../../services/reservationService";
import InternationalPhoneInput from "../../components/InternationalPhoneInput";
import { CountryCode } from "libphonenumber-js";

interface StepCustomerDataProps {
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
  onClientUpdateReady?: (updateFn: () => Promise<boolean>) => void;
}

const isValidEmail = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const StepCustomerData: React.FC<StepCustomerDataProps> = ({
  bookingData,
  setBookingData,
  onClientUpdateReady,
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
  const [phoneValid, setPhoneValid] = useState<boolean>(false);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<CountryCode | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [foundName, setFoundName] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null); // Guardar ID del cliente encontrado
  
  // Ref para evitar actualizaciones durante el montaje inicial
  const isInitialMount = useRef(true);

  // Sincronizar el estado inicial del teléfono
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
    // limpia errores al tipear
    if (field === "email") setEmailError(null);

    // Solo actualizar si el valor realmente cambió
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
    // Evitar actualizaciones durante el montaje inicial
    if (isInitialMount.current) {
      return;
    }

    setPhoneE164(phone_e164);
    setPhoneCountry(phone_country); // Guardar el país
    setPhoneValid(isValid);
    setPhoneError(null);

    // Solo actualizar si el valor realmente cambió
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

    // Mostrar error solo si hay contenido pero no es válido
    if (phone_e164 && !isValid) {
      setPhoneError("Número de teléfono inválido");
    }
  };

  const handlePhoneBlur = async () => {
    if (!phoneValid || !phoneE164) {
      setPhoneError("Ingresa un número de teléfono válido");
      return;
    }

    setIsCheckingPhone(true);
    setFoundName(null);

    try {
      const orgId = organization?._id as string;
      // Buscar por E.164 (el backend ya lo soporta)
      const client = await getClientByPhoneNumberAndOrganization(
        phoneE164,
        orgId
      );

      if (client) {
        setClientId(client._id); // Guardar el ID del cliente
        
        // Rellena datos si vienen vacíos o distintos
        setBookingData((prev) => {
          const prevDetails = prev.customerDetails || customerDetails;
          return {
            ...prev,
            customerDetails: {
              ...prevDetails,
              name: prevDetails.name?.trim()
                ? prevDetails.name
                : client.name || "",
              email: prevDetails.email?.trim()
                ? prevDetails.email
                : client.email || "",
              phone: phoneE164, // Mantener E.164
              birthDate: client.birthDate
                ? new Date(client.birthDate)
                : prevDetails.birthDate ?? null,
            },
          };
        });
        if (client.name) setFoundName(client.name);
      } else {
        setClientId(null); // No existe, se creará uno nuevo
      }
    } catch (error) {
      // No bloqueamos el flujo si falla la búsqueda
      console.error("Error al verificar el cliente:", error);
      setClientId(null);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Función para actualizar el cliente antes de hacer la reserva
  const updateClientIfNeeded = async (): Promise<boolean> => {
    if (!clientId) return true; // Si no hay cliente, no hay nada que actualizar

    try {
      // Verificar si hay cambios para actualizar
      const updates: Partial<any> = {};
      
      if (customerDetails.name && customerDetails.name.trim()) {
        updates.name = customerDetails.name.trim();
      }
      
      if (customerDetails.email && customerDetails.email.trim()) {
        updates.email = customerDetails.email.trim();
      }
      
      if (customerDetails.birthDate) {
        updates.birthDate = customerDetails.birthDate;
      }
      
      // ✨ Migración al nuevo modelo: actualizar teléfono con E.164 y país
      if (phoneE164) {
        updates.phoneNumber = phoneE164; // Actualizar phoneNumber al formato E.164
        updates.phone_e164 = phoneE164;  // Nuevo campo
      }
      
      if (phoneCountry) {
        updates.phone_country = phoneCountry; // Nuevo campo con el código de país
      }

      // Solo actualizar si hay cambios
      if (Object.keys(updates).length > 0) {
        await updateClient(clientId, updates);
      }
      
      return true;
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
      return false;
    }
  };

  // Exponer la función de actualización al componente padre
  useEffect(() => {
    if (onClientUpdateReady) {
      onClientUpdateReady(updateClientIfNeeded);
    }
  }, [clientId, customerDetails, phoneE164, phoneCountry, onClientUpdateReady]);

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
        <InternationalPhoneInput
          value={customerDetails.phone || ""}
          organizationDefaultCountry={
            organization?.default_country as CountryCode
          }
          onChange={handlePhoneChange}
          onBlur={handlePhoneBlur}
          error={phoneError}
          label="Teléfono"
          placeholder="300 000 0000"
          required
        />
        {isCheckingPhone && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="xs" c="dimmed">
              Verificando cliente...
            </Text>
          </Group>
        )}
        {foundName && !isCheckingPhone && (
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Cliente detectado:
            </Text>
            <Badge variant="light" size="sm">
              {foundName}
            </Badge>
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
