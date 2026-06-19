import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Button,
  ThemeIcon,
  Divider,
  Box,
  ScrollArea,
} from "@mantine/core";
import { IconSparkles, IconTool, IconBug, IconBell } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";
import {
  getLatestAnnouncementDate,
  getPublishedAnnouncements,
  markAnnouncementsRead,
  type Announcement,
  type AnnouncementItem,
} from "../services/announcementService";
import { NOVEDADES_STORAGE_KEY } from "../pages/admin/SystemUpdates";

const BADGE_CONFIG: Record<AnnouncementItem["type"], { label: string; color: string }> = {
  new: { label: "Nuevo", color: "teal" },
  improvement: { label: "Mejora", color: "blue" },
  fix: { label: "Corrección", color: "orange" },
};

const TYPE_ICON: Record<AnnouncementItem["type"], React.ReactNode> = {
  new: <IconSparkles size={13} />,
  improvement: <IconTool size={13} />,
  fix: <IconBug size={13} />,
};

function lastSeen(): string {
  return localStorage.getItem(NOVEDADES_STORAGE_KEY) ?? "";
}

/**
 * Modal "¿Qué hay de nuevo?" que aparece automáticamente al entrar cuando hay un
 * anuncio publicado más reciente que el último visto por el usuario. Al cerrarlo
 * (o ir a "Ver todas") se marca como visto, así no reaparece y se apaga el badge
 * del menú lateral.
 */
export default function WhatsNewModal() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const role = useSelector((s: RootState) => s.auth.role);

  const [opened, setOpened] = useState(false);
  const [latest, setLatest] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!isAuthenticated || role === "superadmin") return;
    let cancelled = false;

    (async () => {
      try {
        const { isoDate } = await getLatestAnnouncementDate();
        if (!isoDate || isoDate <= lastSeen()) return; // nada nuevo
        const all = await getPublishedAnnouncements();
        if (cancelled || all.length === 0) return;
        setLatest(all[0]); // el más reciente
        setOpened(true);
      } catch {
        // silencioso
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, role]);

  const markSeen = () => {
    if (latest) {
      localStorage.setItem(NOVEDADES_STORAGE_KEY, latest.isoDate);
      window.dispatchEvent(new Event("announcements-seen"));
      markAnnouncementsRead().catch(() => {});
    }
    setOpened(false);
  };

  const goToAll = () => {
    markSeen();
    navigate("/novedades");
  };

  if (!latest) return null;

  return (
    <Modal
      opened={opened}
      onClose={markSeen}
      centered
      size="lg"
      radius="md"
      title={
        <Group gap="sm">
          <ThemeIcon size="lg" radius="md" variant="light" color="violet">
            <IconBell size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700}>¡Tenemos novedades!</Text>
            <Text size="xs" c="dimmed">
              Versión {latest.version} · {latest.date}
            </Text>
          </div>
        </Group>
      }
    >
      <Stack gap="md">
        <Divider />
        <ScrollArea.Autosize mah={360}>
          <Stack gap="sm" pr="xs">
            {latest.items.map((item, i) => {
              const cfg = BADGE_CONFIG[item.type];
              return (
                <Group key={i} gap="sm" align="flex-start" wrap="nowrap">
                  <Badge
                    size="xs"
                    color={cfg.color}
                    variant="light"
                    leftSection={TYPE_ICON[item.type]}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    {cfg.label}
                  </Badge>
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {item.text}
                    </Text>
                    {item.detail?.trim() && (
                      <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                        {item.detail}
                      </Text>
                    )}
                  </Box>
                </Group>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>

        <Divider />
        <Group justify="space-between">
          <Button variant="subtle" color="gray" onClick={markSeen}>
            Entendido
          </Button>
          <Button variant="light" color="violet" onClick={goToAll}>
            Ver todas las novedades
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
