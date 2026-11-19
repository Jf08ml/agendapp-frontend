// components/InternationalPhoneInput.tsx
import React, { useState, useEffect, useRef } from "react";
import { TextInput, Select, Group, Text, Box, ComboboxItem, ComboboxParsedItem } from "@mantine/core";
import { type CountryCode } from "libphonenumber-js";
import {
  normalizePhoneNumber,
  detectUserCountry,
  extractCountryFromE164,
  isValidCountryCode,
} from "../utils/phoneUtils";
import { getAllCountries } from "../utils/geoData";

function getCallingCodeDisplay(country: CountryCode): string {
  const info = getAllCountries().find((c) => c.value === country);
  return info?.callingCode ?? "+57";
}

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
  /** Muestra solo bandera + código al seleccionar; el nombre aparece solo en el dropdown */
  compact?: boolean;
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
  compact = false,
}) => {
  // País inicial desde el primer render (antes arrancaba en CO y luego cambiaba).
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    () => organizationDefaultCountry || defaultCountry || detectUserCountry()
  );
  const [nationalNumber, setNationalNumber] = useState("");
  // Último valor que este componente le avisó al padre (E.164 o null). Sirve
  // para no tratar como "valor nuevo" el eco de nuestro propio onChange: antes
  // el aviso se hacía en un useEffect (también al montar, con el campo vacío) y
  // el padre devolvía el valor, que se volvía a copiar al campo → bucle que
  // borraba y reponía el número (se veía parpadear al volver a una pantalla).
  const lastEmittedRef = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Datos de países (~250) memoizados desde geoData
  const countrySelectData = React.useMemo(
    () =>
      getAllCountries().map((c) => ({
        value: c.value,
        // En modo compact el label es solo bandera + código; en normal incluye el nombre
        label: compact ? `${c.flag} ${c.callingCode}` : `${c.flag} ${c.name} ${c.callingCode}`,
        // Guardamos el nombre para poder buscarlo en modo compact
        name: c.name,
        fullLabel: `${c.flag} ${c.name} ${c.callingCode}`,
      })),
    [compact]
  );

  // País actual, también en ref para leerlo dentro de efectos sin esperar al render.
  const countryRef = useRef<CountryCode>(selectedCountry);
  const chooseCountry = (country: CountryCode) => {
    countryRef.current = country;
    setSelectedCountry(country);
  };

  /** Valida y avisa al padre (escritura, cambio de país o valor que llega de fuera). */
  const emit = (national: string, country: CountryCode) => {
    const result = national.trim() ? normalizePhoneNumber(national, country) : null;
    const valid = Boolean(result?.isValid && result.phone_e164);
    const e164 = valid ? result!.phone_e164! : null;
    lastEmittedRef.current = e164;
    onChange?.(e164, valid ? result!.phone_country ?? country : null, valid);
  };

  // País inicial (o cuando cambia el de la organización). Si ya viene un
  // número en E.164, manda el país de ese número.
  useEffect(() => {
    if (valueRef.current?.startsWith("+")) return;
    chooseCountry(organizationDefaultCountry || defaultCountry || detectUserCountry());
     
  }, [organizationDefaultCountry, defaultCountry]);

  // Sincronizar con el valor que manda el padre, salvo que sea el eco de lo
  // que este componente acaba de avisar. Tras leer un valor externo se avisa
  // una vez con el resultado (los formularios con número precargado saben así
  // si es válido); su eco vuelve igual a lastEmittedRef y se ignora.
  useEffect(() => {
    const incoming = value || null;
    if (incoming === lastEmittedRef.current) return;

    if (!value) {
      lastEmittedRef.current = null;
      setNationalNumber("");
      return;
    }

    let national = value.replace(/[^\d]/g, "");
    let country = countryRef.current;
    if (value.startsWith("+")) {
      // Es E.164, extraer país y número nacional
      const fromValue = extractCountryFromE164(value);
      if (fromValue) {
        country = fromValue;
        chooseCountry(fromValue);
        const result = normalizePhoneNumber(value, fromValue);
        // Limpiar formato nacional (quitar paréntesis, espacios, guiones)
        national = result.isValid && result.phone_national ? result.phone_national.replace(/[^\d]/g, "") : "";
      }
    }
    setNationalNumber(national);
    emit(national, country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Vista previa del número completo (derivada, sin estado propio).
  const previewE164 = React.useMemo(() => {
    if (!nationalNumber.trim()) return "";
    const result = normalizePhoneNumber(nationalNumber, selectedCountry);
    if (result.isValid && result.phone_e164) return result.phone_e164;
    return `${getCallingCodeDisplay(selectedCountry)}${nationalNumber} (inválido)`;
     
  }, [nationalNumber, selectedCountry]);

  // Detectar si el usuario pega un número con +
  const handleNationalNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = event.target.value;

    // Si el usuario pega algo que empieza con +, intentar extraer el país
    if (inputValue.startsWith("+")) {
      const country = extractCountryFromE164(inputValue);
      if (country && country !== selectedCountry) {
        chooseCountry(country);
      }
      // Extraer solo los dígitos después del código de país
      const result = normalizePhoneNumber(
        inputValue,
        country || selectedCountry
      );
      if (result.phone_national) {
        const cleanNational = result.phone_national.replace(/[^\d]/g, "");
        setNationalNumber(cleanNational);
        emit(cleanNational, country || selectedCountry);
        return;
      }
    }

    // Solo permitir dígitos
    const cleanValue = inputValue.replace(/[^\d]/g, "");
    setNationalNumber(cleanValue);
    emit(cleanValue, selectedCountry);
  };

  const handleCountryChange = (countryCode: string | null) => {
    if (countryCode && isValidCountryCode(countryCode)) {
      chooseCountry(countryCode as CountryCode);
      if (nationalNumber.trim()) emit(nationalNumber, countryCode as CountryCode);
    }
  };

  const callingCode = getCallingCodeDisplay(selectedCountry);

  return (
    <Box>
      {label && (
        <Text size="sm" fw={500} mb={5}>
          {label}{" "}
          {required && (
            <Text component="span" color="red">
              *
            </Text>
          )}
        </Text>
      )}

      <Group align="flex-start" style={{ width: "100%" }}>
        <Select
          data={countrySelectData}
          value={selectedCountry}
          onChange={handleCountryChange}
          searchable
          placeholder="País"
          disabled={disabled}
          comboboxProps={{ zIndex: 10000, width: compact ? 260 : undefined }}
          {...(compact && {
            w: 90,
            // En modo compact: filtrar también por nombre del país
            filter: ({ options, search }: { options: ComboboxParsedItem[]; search: string }) => {
              const q = search.toLowerCase();
              return options.filter(
                (o) =>
                  "label" in o && (
                    o.label.toLowerCase().includes(q) ||
                    ((o as ComboboxItem & { name?: string }).name ?? "").toLowerCase().includes(q)
                  )
              );
            },
            // En el dropdown mostrar bandera + nombre + código para facilitar búsqueda
            renderOption: ({ option }: { option: ComboboxItem }) => (
              <Group gap="xs" wrap="nowrap">
                <Text size="sm">
                  {(option as ComboboxItem & { fullLabel?: string }).fullLabel ?? option.label}
                </Text>
              </Group>
            ),
          })}
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
