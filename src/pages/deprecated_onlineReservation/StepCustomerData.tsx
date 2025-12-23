import { useState } from "react";
import { Stack, TextInput, Loader } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { getClientByPhoneNumberAndOrganization } from "../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Reservation } from "../../services/reservationService";

interface StepCustomerDataProps {
  bookingData: Partial<Reservation>;
  setBookingData: React.Dispatch<React.SetStateAction<Partial<Reservation>>>;
}

const StepCustomerData: React.FC<StepCustomerDataProps> = ({
  bookingData,
  setBookingData,
}) => {
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const customerDetails = bookingData.customerDetails || {
    name: "",
    email: "",
    phone: "",
    birthDate: null,
  };

  const handleInputChange = (
    field: keyof Reservation["customerDetails"],
    value: string | Date | null
  ) => {
    setBookingData({
      ...bookingData,
      customerDetails: {
        ...customerDetails,
        [field]: value,
      },
    });
  };

  const handlePhoneBlur = async () => {
    const phone = customerDetails.phone;
    if (!phone || phone.trim().length < 10) return;

    setIsCheckingPhone(true);

    try {
      const client = await getClientByPhoneNumberAndOrganization(
        phone.trim(),
        organization?._id as string
      );

      if (client) {
        setBookingData({
          ...bookingData,
          customerDetails: {
            ...customerDetails,
            name: client.name || "",
            email: client.email || "",
            phone,
            birthDate: client.birthDate ? new Date(client.birthDate) : null,
          },
        });
      }
    } catch (error) {
      console.error("Error al verificar el cliente:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  return (
    <Stack>
      {/* Campo de Teléfono */}
      <TextInput
        label="Teléfono"
        placeholder="Ingresa tu número de teléfono"
        value={customerDetails.phone}
        onChange={(e) => handleInputChange("phone", e.currentTarget.value)}
        onBlur={handlePhoneBlur}
        rightSection={isCheckingPhone ? <Loader size="xs" /> : null}
      />

      {/* Campo de Nombre */}
      <TextInput
        label="Nombre completo"
        placeholder="Ingresa tu nombre"
        value={customerDetails.name}
        onChange={(e) => handleInputChange("name", e.currentTarget.value)}
        disabled={isCheckingPhone}
      />

      {/* Campo de Correo Electrónico */}
      <TextInput
        label="Correo electrónico"
        placeholder="Ingresa tu correo"
        type="email"
        value={customerDetails.email}
        onChange={(e) => handleInputChange("email", e.currentTarget.value)}
        disabled={isCheckingPhone}
      />

      {/* Campo de Fecha de Nacimiento */}
      <DateInput
        label="Fecha de Nacimiento"
        value={customerDetails.birthDate}
        locale="es"
        valueFormat="DD/MM/YYYY"
        onChange={(value) => handleInputChange("birthDate", value)}
        placeholder="Selecciona una fecha 00/00/0000"
        maxDate={new Date()}
      />
    </Stack>
  );
};

export default StepCustomerData;
