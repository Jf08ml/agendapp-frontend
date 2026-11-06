import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Alert, Anchor, Button, Container, Group, Loader, Modal, Stack, Text } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { RootState } from "../../app/store";
import {
  cancelMyBooking,
  getMyBookings,
  savedBookingsKey,
  type MyBookings as MyBookingsData,
} from "../../services/clientBookingsService";
import MyBookingsView, { type BookingRow } from "./MyBookingsView";
import { bookingFormatters, TYPE_NOUN } from "./bookingFormat";

/** Enlace personal /mis-reservas/:token (llega por WhatsApp): ver y cancelar. */
const MyBookings: React.FC = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const organization = useSelector((s: RootState) => s.organization.organization);

  const [data, setData] = useState<MyBookingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toCancel, setToCancel] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const orgId = organization?._id as string | undefined;

  const setSavedToken = useCallback(
    (value: string | null) => {
      if (!orgId) return;
      try {
        if (value) localStorage.setItem(savedBookingsKey(orgId), value);
        else localStorage.removeItem(savedBookingsKey(orgId));
      } catch {
        /* almacenamiento no disponible */
      }
    },
    [orgId]
  );

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await getMyBookings(token);
      if (!res) {
        setInvalid(true);
        setSavedToken(null);
        return;
      }
      setData(res);
      setSavedToken(token);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudieron cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  }, [token, setSavedToken]);

  useEffect(() => {
    load();
  }, [load]);

  const forgetDevice = () => {
    setSavedToken(null);
    navigate("/mis-reservas", { replace: true });
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setCancelling(true);
    try {
      const message = await cancelMyBooking(token, toCancel.type, toCancel.id);
      showNotification({ title: "Cancelada", message: message || "Listo.", color: "green" });
      setToCancel(null);
      await load();
    } catch (e) {
      showNotification({ title: "No se pudo cancelar", message: (e as Error).message, color: "red" });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Group justify="center" mt={80}>
        <Loader />
      </Group>
    );
  }

  if (invalid) {
    return (
      <Container size="xs" py="xl">
        <Alert color="yellow" title="Enlace no válido">
          Este enlace no corresponde a ninguna reserva. Consulta tus reservas con tu número de teléfono.
        </Alert>
        <Button mt="md" fullWidth component={Link} to="/mis-reservas" replace>
          Consultar mis reservas
        </Button>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container size="xs" py="xl">
        <Alert color="red">{loadError || "No se pudieron cargar tus reservas."}</Alert>
        <Button
          mt="md"
          fullWidth
          variant="light"
          onClick={() => {
            setLoading(true);
            load();
          }}
        >
          Reintentar
        </Button>
      </Container>
    );
  }

  const { dayLabel, timeLabel } = bookingFormatters(data);
  const firstName = (data.client.name || "").trim().split(/\s+/)[0];

  return (
    <Container size="sm" py="lg" px="md">
      <MyBookingsView
        data={data}
        onCancel={setToCancel}
        footer={
          <Text size="xs" c="dimmed" ta="center">
            Este enlace es personal; no lo compartas. ¿No eres {firstName || "tú"}?{" "}
            <Anchor size="xs" component="button" onClick={forgetDevice}>
              Usar otro número
            </Anchor>
          </Text>
        }
      />

      <Modal
        opened={!!toCancel}
        onClose={() => !cancelling && setToCancel(null)}
        title={toCancel ? `¿Cancelar esta ${TYPE_NOUN[toCancel.type]}?` : ""}
        centered
      >
        {toCancel && (
          <Stack gap="sm">
            <Text size="sm">
              <b>{toCancel.title}</b>
              <br />
              {dayLabel(toCancel.startDate)}, {timeLabel(toCancel.startDate, toCancel.endDate)}
            </Text>
            <Text size="sm" c="dimmed">
              El negocio recibirá el aviso y el horario quedará libre. Esta acción no se puede deshacer.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={() => setToCancel(null)} disabled={cancelling}>
                Volver
              </Button>
              <Button color="red" onClick={confirmCancel} loading={cancelling}>
                Sí, cancelar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
};

export default MyBookings;
