import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Group, Loader, SimpleGrid, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { MdCheckCircle, MdEventRepeat, MdInfoOutline } from "react-icons/md";
import cancellationService, {
  type RescheduleInfo,
  type RescheduleSlot,
} from "../../services/cancellationService";
import { formatFullDateInTimezone, todayInTimezone } from "../../utils/timezoneUtils";
import { formatTimeLabel } from "../../utils/timeOfDay";

interface RescheduleCardProps {
  token: string;
  /** Se llama tras reagendar con éxito (la página recarga la info de la cita). */
  onRescheduled: () => void;
}

// Fecha local del selector → "YYYY-MM-DD"
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * Reagendar la cita desde el enlace público. No pinta nada si el negocio no usa la
 * función; si la usa pero esta cita no puede reagendarse, explica el motivo.
 */
const RescheduleCard: React.FC<RescheduleCardProps> = ({ token, onRescheduled }) => {
  const [info, setInfo] = useState<RescheduleInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<RescheduleSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<RescheduleSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneLabel, setDoneLabel] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    cancellationService
      .getRescheduleInfo(token)
      .then((res) => alive && setInfo(res.data))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [token]);

  const loadSlots = useCallback(
    async (d: Date) => {
      setLoadingSlots(true);
      setSelected(null);
      setSlots(null);
      setError(null);
      try {
        const res = await cancellationService.getRescheduleSlots(token, toDateStr(d));
        setSlots(res.data?.slots ?? []);
      } catch (err) {
        setError(errorMessage(err, "No se pudieron cargar los horarios"));
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [token]
  );

  if (doneLabel) {
    return (
      <Alert color="green" icon={<MdCheckCircle />} title="¡Cita reagendada!">
        Tu nueva cita es el {doneLabel}. Te enviaremos un recordatorio antes de la nueva fecha.
      </Alert>
    );
  }

  if (!info || !info.enabled) return null;

  if (!info.allowed) {
    return (
      <Alert color="gray" variant="light" icon={<MdInfoOutline />}>
        {info.reason || "Esta cita no se puede reagendar."}
      </Alert>
    );
  }

  const tz = info.timezone || "America/Bogota";
  const is24h = info.timeFormat === "24h";
  // "Hoy" y el tope de 120 días según el calendario del negocio (no el del navegador del cliente)
  const [ty, tm, td] = todayInTimezone(tz).split("-").map(Number);
  const orgToday = new Date(ty, tm - 1, td);
  const orgMax = new Date(ty, tm - 1, td + 120);
  const currentLabel = info.appointment
    ? formatFullDateInTimezone(info.appointment.startDate, tz, "dddd D [de] MMMM, h:mm A")
    : "";

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await cancellationService.rescheduleByToken(token, selected.datetime);
      const start = res.data?.startDate ?? selected.datetime;
      setDoneLabel(formatFullDateInTimezone(start, tz, "dddd D [de] MMMM, h:mm A"));
      onRescheduled();
    } catch (err) {
      setError(errorMessage(err, "No se pudo reagendar la cita"));
      // El horario pudo ocuparse mientras elegías: se recargan los disponibles
      if (date) loadSlots(date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <MdEventRepeat size={22} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <Text fw={600}>¿Prefieres otro día u hora?</Text>
            <Text size="sm" c="dimmed">
              Puedes cambiar tu cita
              {info.remaining !== undefined
                ? info.remaining === 1
                  ? " (te queda 1 cambio)"
                  : ` (te quedan ${info.remaining} cambios)`
                : ""}
              . Mantienes el mismo servicio y profesional
              {info.appointment?.employeeName ? ` (${info.appointment.employeeName})` : ""}.
            </Text>
          </div>
        </Group>

        {!open ? (
          <Button variant="light" onClick={() => setOpen(true)} fullWidth>
            Reagendar mi cita
          </Button>
        ) : (
          <Stack gap="sm">
            {currentLabel && (
              <Text size="sm">
                Cita actual: <strong>{currentLabel}</strong>
              </Text>
            )}

            <DateInput
              label="Nuevo día"
              placeholder="Elige una fecha"
              value={date}
              minDate={orgToday}
              maxDate={orgMax}
              onChange={(d) => {
                setDate(d);
                if (d) loadSlots(d);
              }}
            />

            {loadingSlots && (
              <Group justify="center" py="xs">
                <Loader size="sm" />
              </Group>
            )}

            {!loadingSlots && slots && slots.length === 0 && date && (
              <Text size="sm" c="dimmed">
                No hay horarios disponibles ese día. Prueba con otra fecha.
              </Text>
            )}

            {!loadingSlots && slots && slots.length > 0 && (
              <div>
                <Text size="sm" fw={500} mb={6}>
                  Horarios disponibles
                </Text>
                <SimpleGrid cols={{ base: 3, sm: 4 }} spacing="xs">
                  {slots.map((s) => (
                    <Button
                      key={s.datetime}
                      size="xs"
                      variant={selected?.datetime === s.datetime ? "filled" : "default"}
                      onClick={() => setSelected(s)}
                    >
                      {formatTimeLabel(s.time, is24h)}
                    </Button>
                  ))}
                </SimpleGrid>
              </div>
            )}

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <Group justify="flex-end" gap="xs">
              <Button variant="subtle" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={!selected} loading={saving}>
                Confirmar nuevo horario
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Card>
  );
};

export default RescheduleCard;
