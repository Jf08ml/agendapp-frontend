import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Table,
  ScrollArea,
  Loader,
  Center,
  Text,
  Badge,
  Button,
  Tooltip,
  Alert,
  Group,
} from "@mantine/core";
import { openConfirmModal } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import { IconInfoCircle, IconLogout } from "@tabler/icons-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RootState, AppDispatch } from "../../../../../app/store";
import { getSessions, revokeSession, ActiveSession } from "../../../../../services/sessionService";
import { logout } from "../../../../../features/auth/sliceAuth";

interface Props {
  organizationId: string | null;
}

const formatDate = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es });

export default function SessionsTab({ organizationId }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentSessionId = useSelector((s: RootState) => s.auth.sessionId);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await getSessions(organizationId);
      setSessions(data);
    } catch (e) {
      console.error(e);
      showNotification({
        title: "Error",
        message: "No se pudieron cargar las sesiones activas",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = (session: ActiveSession) => {
    if (!organizationId) return;
    const isCurrent = session._id === currentSessionId;

    openConfirmModal({
      title: "Cerrar sesión",
      children: (
        <Text size="sm">
          {isCurrent
            ? "Esta es la sesión de este mismo dispositivo — al cerrarla, se cerrará tu sesión actual."
            : `Se cerrará la sesión de "${session.displayName}" en ese dispositivo. Deberá iniciar sesión nuevamente.`}
        </Text>
      ),
      labels: { confirm: "Cerrar sesión", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      centered: true,
      onConfirm: async () => {
        setRevokingId(session._id);
        try {
          const ok = await revokeSession(organizationId, session._id);
          if (ok) {
            showNotification({
              title: "Sesión cerrada",
              message: isCurrent
                ? "Se cerró tu sesión en este dispositivo."
                : `Se cerró la sesión de "${session.displayName}"`,
              color: "green",
            });
            if (isCurrent) {
              // Es la sesión de este mismo dispositivo: no esperar a que la
              // próxima request 401ee (o al chequeo de fondo de useSessionExpiry)
              // para notarlo — cerrarla ahora mismo.
              dispatch(logout());
              navigate("/login-admin");
              return;
            }
            setSessions((prev) => prev.filter((s) => s._id !== session._id));
          }
        } catch (e) {
          console.error(e);
          showNotification({
            title: "Error",
            message: "No se pudo cerrar la sesión",
            color: "red",
          });
        } finally {
          setRevokingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <ScrollArea>
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mb="md">
        <Text size="sm">
          Dispositivos donde hay una sesión abierta de tu equipo (tu cuenta y las de tus
          empleados), aunque no hayan vuelto a entrar recientemente. Podés cerrar cualquiera
          de forma inmediata.
        </Text>
      </Alert>

      {sessions.length === 0 ? (
        <Text size="sm" c="dimmed">
          No hay sesiones activas.
        </Text>
      ) : (
        <Table verticalSpacing="sm" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Usuario</Table.Th>
              <Table.Th>Dispositivo</Table.Th>
              <Table.Th>Inicio de sesión</Table.Th>
              <Table.Th>Última actividad</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sessions.map((session) => (
              <Table.Tr key={session._id}>
                <Table.Td>
                  <Group gap="xs">
                    <Text size="sm">{session.displayName}</Text>
                    {session.userType === "admin" && (
                      <Badge size="xs" variant="light" color="grape">
                        Admin
                      </Badge>
                    )}
                    {session._id === currentSessionId && (
                      <Badge size="xs" variant="light" color="blue">
                        Este dispositivo
                      </Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Tooltip label={session.userAgent} multiline w={300}>
                    <Text size="sm" c="dimmed" lineClamp={1} maw={260}>
                      {session.userAgent}
                    </Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(session.createdAt)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatDate(session.lastActiveAt)}</Text>
                </Table.Td>
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    loading={revokingId === session._id}
                    onClick={() => handleRevoke(session)}
                  >
                    Cerrar sesión
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </ScrollArea>
  );
}
