import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Stack,
  Text,
  Paper,
  Loader,
  Group,
  Center,
} from "@mantine/core";
import StepHeading from "./StepHeading";
import { useMediaQuery } from "@mantine/hooks";
import { DatePicker } from "@mantine/dates";
import { Service } from "../../services/serviceService";
import { SelectedService, ServiceWithDate } from "../../types/multiBooking";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { checkDaysAvailability } from "../../services/scheduleService";
dayjs.locale("es");

// Hasta cuántos meses adelante se puede reservar en línea
const MAX_MONTHS_AHEAD = 12;

interface StepMultiServiceDateProps {
  selectedServices: SelectedService[];
  services: Service[];
  value: ServiceWithDate[];
  onChange: (next: ServiceWithDate[]) => void;
  /** Se llama solo cuando la persona toca un día (no en la preselección automática) */
  onDatePicked?: () => void;
}

// Cuántos meses avanza solo el calendario buscando el primer día disponible
const AUTO_SEARCH_MAX_MONTHS = 3;

const StepMultiServiceDate: React.FC<StepMultiServiceDateProps> = ({
  selectedServices,
  services,
  value,
  onChange,
  onDatePicked,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  // Meses ("YYYY-MM") cuya respuesta ya llegó / que están en consulta. Son estado
  // (no refs) para que la preselección nunca vea un mes "cargado" sin sus datos.
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(() => new Set());
  const [pendingMonths, setPendingMonths] = useState<Set<string>>(() => new Set());
  // Meses ya pedidos para los servicios actuales (evita consultas duplicadas)
  const requestedMonthsRef = useRef<Set<string>>(new Set());
  // Cambia al cambiar los servicios: invalida las respuestas en vuelo de antes.
  // Navegar de mes NO la cambia, así varias consultas de meses conviven.
  const generationRef = useRef(0);

  // Mes visible en el calendario (controlado para cargar disponibilidad por mes)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(
    () => value[0]?.date ?? new Date()
  );

  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const organizationId = organization?._id;

  // Días de negocio de la organización (fallback)
  const orgBusinessDays = organization?.openingHours?.businessDays;
  const businessDays = useMemo(
    () => orgBusinessDays ?? [1, 2, 3, 4, 5],
    [orgBusinessDays]
  );

  // Búsqueda automática del primer día disponible (ver efecto más abajo)
  const autoSearchRef = useRef({ active: !value[0]?.date, monthsAdvanced: 0 });

  const maxDate = useMemo(
    () => dayjs().add(MAX_MONTHS_AHEAD, "month").endOf("month").toDate(),
    []
  );

  const servicesWithDuration = useMemo(
    () =>
      selectedServices.map((sel) => {
        const svc = services.find((s) => s._id === sel.serviceId);
        return {
          serviceId: sel.serviceId,
          employeeId: sel.employeeId,
          duration: svc?.duration ?? 30,
        };
      }),
    [selectedServices, services]
  );

  // Al cambiar los servicios, la disponibilidad cargada deja de ser válida
  useEffect(() => {
    requestedMonthsRef.current = new Set();
    generationRef.current += 1;
    setAvailability({});
    setLoadedMonths(new Set());
    setPendingMonths(new Set());
  }, [organizationId, servicesWithDuration]);

  // Cargar disponibilidad del mes visible (bajo demanda, un mes a la vez).
  // El backend acepta hasta 60 días por consulta; la grilla de un mes son ≤ 42.
  useEffect(() => {
    if (!organizationId || servicesWithDuration.length === 0) return;

    const monthKey = dayjs(displayedMonth).format("YYYY-MM");
    if (requestedMonthsRef.current.has(monthKey)) return;

    // Incluye los días de meses vecinos que se ven en la grilla (semana inicia lunes)
    const monthStart = dayjs(displayedMonth).startOf("month");
    const monthEnd = dayjs(displayedMonth).endOf("month");
    const gridStart = monthStart.subtract((monthStart.day() + 6) % 7, "day");
    const gridEnd = monthEnd.add((7 - monthEnd.day()) % 7, "day");

    const today = dayjs().startOf("day");
    const rangeStart = gridStart.isBefore(today) ? today : gridStart;
    const rangeEnd = gridEnd.isAfter(maxDate) ? dayjs(maxDate) : gridEnd;
    if (rangeEnd.isBefore(rangeStart, "day")) return;

    requestedMonthsRef.current.add(monthKey);
    const generation = generationRef.current;
    setPendingMonths((prev) => new Set(prev).add(monthKey));

    checkDaysAvailability(
      organizationId,
      servicesWithDuration,
      rangeStart.format("YYYY-MM-DD"),
      rangeEnd.format("YYYY-MM-DD")
    )
      .then((response) => {
        if (generation !== generationRef.current) return;
        if (response?.availability) {
          setAvailability((prev) => ({ ...prev, ...response.availability }));
          setLoadedMonths((prev) => new Set(prev).add(monthKey));
        } else {
          // Permitir reintento si se vuelve a este mes
          requestedMonthsRef.current.delete(monthKey);
        }
      })
      .catch((error) => {
        if (generation !== generationRef.current) return;
        requestedMonthsRef.current.delete(monthKey);
        console.error("Error loading availability:", error);
      })
      .finally(() => {
        if (generation !== generationRef.current) return;
        setPendingMonths((prev) => {
          const next = new Set(prev);
          next.delete(monthKey);
          return next;
        });
      });
  }, [organizationId, servicesWithDuration, displayedMonth, maxDate]);

  const displayedMonthKey = dayjs(displayedMonth).format("YYYY-MM");
  const loading = pendingMonths.has(displayedMonthKey);

  const emitDate = useCallback(
    (date: Date | null) => {
      onChange(
        selectedServices.map((s) => ({
          serviceId: s.serviceId,
          employeeId: s.employeeId,
          date,
        }))
      );
    },
    [selectedServices, onChange]
  );

  // Handler para seleccionar fecha (toque de la persona)
  const handleDateSelect = useCallback(
    (date: Date | null) => {
      autoSearchRef.current = { active: false, monthsAdvanced: 0 };
      emitDate(date);
      if (date) onDatePicked?.();
    },
    [emitDate, onDatePicked]
  );

  // Navegación manual de meses: desde ahí ya no se mueve ni preselecciona solo
  const handleMonthChange = useCallback((date: Date) => {
    autoSearchRef.current = { active: false, monthsAdvanced: 0 };
    setDisplayedMonth(date);
  }, []);

  // Preselección: al entrar sin día elegido, abrir en el primer día con
  // disponibilidad (avanzando de mes si el actual está lleno) para que las
  // horas aparezcan de una vez.
  useEffect(() => {
    if (!autoSearchRef.current.active) return;
    // Solo decidir con la respuesta del mes ya recibida
    if (!loadedMonths.has(displayedMonthKey)) return;

    const today = dayjs().format("YYYY-MM-DD");
    const firstAvailable = Object.keys(availability)
      .filter(
        (d) =>
          d.startsWith(displayedMonthKey) &&
          d >= today &&
          availability[d] &&
          businessDays.includes(dayjs(d).day())
      )
      .sort()[0];

    if (firstAvailable) {
      autoSearchRef.current.active = false;
      emitDate(dayjs(firstAvailable).toDate());
      return;
    }

    const next = dayjs(displayedMonth).add(1, "month").startOf("month");
    if (
      autoSearchRef.current.monthsAdvanced < AUTO_SEARCH_MAX_MONTHS &&
      !next.isAfter(maxDate)
    ) {
      autoSearchRef.current.monthsAdvanced += 1;
      setDisplayedMonth(next.toDate());
    } else {
      autoSearchRef.current.active = false;
    }
  }, [availability, loadedMonths, displayedMonth, displayedMonthKey, businessDays, emitDate, maxDate]);

  // Determinar si un día está deshabilitado (solo días pasados y no laborables)
  // NO deshabilitamos días sin disponibilidad para poder aplicar estilos
  const isDisabledDay = useCallback(
    (d: Date) => {
      // Días anteriores a hoy
      if (dayjs(d).isBefore(dayjs(), "day")) return true;

      // Días que no son laborables (según organización)
      if (!businessDays.includes(dayjs(d).day())) return true;

      // NO deshabilitamos por falta de disponibilidad aquí
      // para que los estilos se apliquen correctamente
      return false;
    },
    [businessDays]
  );

  // Fecha seleccionada actualmente
  const selectedDate = value[0]?.date;

  // getDayProps con estilos y control de selección
  const getDayProps = useCallback(
    (date: Date) => {
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const isToday = dayjs(date).isSame(dayjs(), "day");
      const isPast = dayjs(date).isBefore(dayjs(), "day");
      const isBusinessDay = businessDays.includes(dayjs(date).day());
      const isSelected = selectedDate && dayjs(date).isSame(dayjs(selectedDate), "day");

      // Día pasado o no laborable - sin estilo especial
      if (isPast || !isBusinessDay) {
        return {};
      }

      // Seleccionado: color de marca de la organización
      if (isSelected) {
        return {
          style: {
            backgroundColor: "var(--mantine-primary-color-filled)",
            color: "var(--mantine-primary-color-contrast)",
            // Anillo legible aunque la marca sea muy clara (amarillo, rosa pastel)
            boxShadow: "inset 0 0 0 2px var(--brand-text)",
            fontWeight: 700,
          },
        };
      }

      const hasAvailability = availability[dateStr];

      // Sin horarios: apagado y tachado, no seleccionable
      if (hasAvailability === false) {
        return {
          disabled: true,
          style: {
            color: "var(--mantine-color-gray-5)",
            textDecoration: "line-through",
            cursor: "not-allowed",
          },
        };
      }

      // Con horarios: verde suave
      if (hasAvailability === true) {
        return {
          style: {
            backgroundColor: "var(--mantine-color-green-light)",
            color: "var(--mantine-color-green-light-color)",
            fontWeight: 700,
            ...(isToday ? { outline: "1px solid var(--mantine-color-green-5)" } : {}),
          },
        };
      }

      return {};
    },
    [availability, businessDays, selectedDate]
  );

  // Mes visible sin ningún día con horarios
  const displayedMonthName = dayjs(displayedMonth).format("MMMM");
  const monthEntries = useMemo(
    () =>
      Object.entries(availability).filter(([d]) => d.startsWith(displayedMonthKey)),
    [availability, displayedMonthKey]
  );
  const monthIsFull =
    loadedMonths.has(displayedMonthKey) &&
    monthEntries.length > 0 &&
    !monthEntries.some(([, ok]) => ok);

  return (
    <Stack gap="sm">
      <StepHeading
        title="Elige el día"
        hint={
          <>
            Los días en{" "}
            <Text span c="green" fw={600} inherit>
              verde
            </Text>{" "}
            tienen horarios libres.
          </>
        }
      />

      <Paper withBorder radius="md" p={isMobile ? 6 : "md"} pos="relative">
        <Center>
          <DatePicker
            minDate={new Date()}
            maxDate={maxDate}
            date={displayedMonth}
            onDateChange={handleMonthChange}
            value={value[0]?.date || null}
            onChange={handleDateSelect}
            size="md"
            locale="es"
            getDayProps={getDayProps}
            excludeDate={isDisabledDay}
          />
        </Center>
      </Paper>

      {loading && (
        <Group gap="xs" justify="center">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Buscando días libres…
          </Text>
        </Group>
      )}

      {monthIsFull && (
        <Text size="sm" c="dimmed" ta="center">
          No quedan horarios en {displayedMonthName}. Prueba el mes siguiente.
        </Text>
      )}
    </Stack>
  );
};

export default StepMultiServiceDate;
