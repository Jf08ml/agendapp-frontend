// components/InternationalPhoneInput.tsx
import React, { useState, useEffect } from "react";
import { TextInput, Select, Group, Text, Box } from "@mantine/core";
import { type CountryCode } from "libphonenumber-js";
import {
  normalizePhoneNumber,
  detectUserCountry,
  extractCountryFromE164,
  isValidCountryCode,
} from "../utils/phoneUtils";
import { getAllCountries } from "../utils/geoData";

interface InternationalPhoneInputProps {
  value?: string;
  defaultCountry?: CountryCode;
  organizationDefaultCountry?: CountryCode;
  onChange?: (
    phone_e164: string | null,
    phone_country: CountryCode | null,
    isValid: boolean
  ) => void;
  onBlur?: () => void;
  error?: string | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value = "",
  defaultCountry,
  organizationDefaultCountry,
  onChange,
  onBlur,
  error,
  label = "Teléfono",
  placeholder,
  required = false,
  disabled = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("CO");
  const [nationalNumber, setNationalNumber] = useState("");
  const [previewE164, setPreviewE164] = useState<string>("");

  // Datos de países (~250) memoizados desde geoData
  const countrySelectData = React.useMemo(
    () =>
      getAllCountries().map((c) => ({
        value: c.value,
        label: `${c.flag} ${c.name} ${c.callingCode}`,
      })),
    []
  );

  // Determinar país inicial
  useEffect(() => {
    let initialCountry: CountryCode = "CO";

    if (organizationDefaultCountry) {
      initialCountry = organizationDefaultCountry;
    } else if (defaultCountry) {
      initialCountry = defaultCountry;
    } else {
      initialCountry = detectUserCountry();
    }

    setSelectedCountry(initialCountry);
  }, [organizationDefaultCountry, defaultCountry]);

  // Parsear valor inicial si viene con E.164
  useEffect(() => {
    if (!value) {
      setNationalNumber("");
      setPreviewE164("");
      return;
    }

    if (value.startsWith("+")) {
      // Es E.164, extraer país y número nacional
      const country = extractCountryFromE164(value);
      if (country) {
        setSelectedCountry(country);
        const result = normalizePhoneNumber(value, country);
        if (result.isValid && result.phone_national) {
          // Limpiar formato nacional (quitar paréntesis, espacios, guiones)
          const cleanNational = result.phone_national.replace(/[^\d]/g, "");
          setNationalNumber(cleanNational);
        }
      }
      setPreviewE164(value);
    } else {
      // Es número nacional, usar tal como viene
      setNationalNumber(value.replace(/[^\d]/g, ""));
    }
  }, [value]);

  // Actualizar preview y notificar cambios
  useEffect(() => {
    if (!nationalNumber.trim()) {
      setPreviewE164("");
      onChange?.(null, null, false);
      return;
    }

    const result = normalizePhoneNumber(nationalNumber, selectedCountry);

    if (result.isValid && result.phone_e164) {
      setPreviewE164(result.phone_e164);
      onChange?.(result.phone_e164, result.phone_country, true);
    } else {
      setPreviewE164(
        `${getCallingCodeDisplay(selectedCountry)}${nationalNumber} (inválido)`
      );
      onChange?.(null, null, false);
    }
  }, [selectedCountry, nationalNumber, onChange]);

  // Detectar si el usuario pega un número con +
  const handleNationalNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;

    // Si el usuario pega algo que empieza con +, intentar extraer el país
    if (inputValue.startsWith("+")) {
      const country = extractCountryFromE164(inputValue);
      if (country && country !== selectedCountry) {
        setSelectedCountry(country);
      }
      // Extraer solo los dígitos después del código de país
      const result = normalizePhoneNumber(
        inputValue,
        country || selectedCountry
      );
      if (result.phone_national) {
        const cleanNational = result.phone_national.replace(/[^\d]/g, "");
        setNationalNumber(cleanNational);
        return;
      }
    }

    // Solo permitir dígitos
    const cleanValue = inputValue.replace(/[^\d]/g, "");
    setNationalNumber(cleanValue);
  };

  const handleCountryChange = (countryCode: string | null) => {
    if (countryCode && isValidCountryCode(countryCode)) {
      setSelectedCountry(countryCode as CountryCode);
    }
  };

  const getCallingCodeDisplay = (country: CountryCode): string => {
    const info = getAllCountries().find((c) => c.value === country);
    return info?.callingCode ?? "+57";
  };

  const callingCode = getCallingCodeDisplay(selectedCountry);

  return (
    <Box>
      <Text size="sm" fw={500} mb={5}>
        {label}{" "}
        {required && (
          <Text component="span" color="red">
            *
          </Text>
        )}
      </Text>

      <Group align="flex-start">
        <Select
          data={countrySelectData}
          value={selectedCountry}
          onChange={handleCountryChange}
          searchable
          placeholder="País"
          disabled={disabled}
          comboboxProps={{ zIndex: 10000 }}
        />

        <TextInput
          value={nationalNumber}
          onChange={handleNationalNumberChange}
          onBlur={onBlur}
          placeholder={placeholder || "300 000 0000"}
          style={{ flex: 1 }}
          disabled={disabled}
          leftSection={
            <Text size="sm" c="dimmed">
              {callingCode}
            </Text>
          }
        />
      </Group>

      {previewE164 && (
        <Text size="xs" color="dimmed" mt={4}>
          📱 {previewE164}
        </Text>
      )}

      {error && (
        <Text size="xs" color="red" mt={4}>
          {error}
        </Text>
      )}
    </Box>
  );
};

export default InternationalPhoneInput;
