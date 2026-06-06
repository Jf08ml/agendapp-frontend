import { useEffect, useState } from "react";
import {
  Box,
  Title,
  Text,
  Stack,
  Paper,
  Badge,
  Group,
  ThemeIcon,
  Divider,
  Loader,
  Alert,
  Collapse,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBell,
  IconSparkles,
  IconTool,
  IconBug,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import {
  getPublishedAnnouncements,
  markAnnouncementsRead,
  type Announcement,
  type AnnouncementItem,
} from "../../../services/announcementService";

export const NOVEDADES_STORAGE_KEY = "novedades_last_seen";

type UpdateType = AnnouncementItem["type"];

const BADGE_CONFIG: Record<UpdateType, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "teal" },
  improvement: { label: "Mejora", color: "blue" },
  fix: { label: "Corrección", color: "orange" },
};

const TYPE_ICON: Record<UpdateType, React.ReactNode> = {
  new: <IconSparkles size={13} />,
  improvement: <IconTool size={13} />,
  fix: <IconBug size={13} />,
};

export default function SystemUpdates() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPublishedAnnouncements()
      .then((data) => {
        setAnnouncements(data);
        if (data.length > 0) {
          localStorage.setItem(NOVEDADES_STORAGE_KEY, data[0].isoDate);
        }
        window.dispatchEvent(new Event("announcements-seen"));
        markAnnouncementsRead().catch(() => {});
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const toggleDetail = (key: string) => {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Box p="md" maw={720} mx="auto">
      <Group mb="xl" gap="sm" align="center">
        <ThemeIcon size="lg" radius="md" variant="light" color="violet">
          <IconBell size={20} />
        </ThemeIcon>
        <div>
          <Title order={2}>Novedades del sistema</Title>
          <Text size="sm" c="dimmed">
            Últimas actualizaciones y mejoras de la plataforma
          </Text>
        </div>
      </Group>

      {loading && (
        <Stack align="center" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Cargando novedades...</Text>
        </Stack>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          No se pudieron cargar las novedades. Intenta de nuevo más tarde.
        </Alert>
      )}

      {!loading && !error && announcements.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Aún no hay novedades publicadas.
        </Text>
      )}

      {!loading && !error && (
        <Stack gap="lg">
          {announcements.map((entry, i) => (
            <Paper key={entry._id} withBorder radius="md" p="lg">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  {i === 0 && (
                    <Badge size="xs" color="violet" variant="filled">
                      Más reciente
                    </Badge>
                  )}
                  <Text fw={700} size="lg">
                    v{entry.version}
                  </Text>
                </Group>
                <Group gap="xs">
                  {entry.viewCount !== undefined && entry.viewCount > 0 && (
                    <Text size="xs" c="dimmed">
                      {entry.viewCount} {entry.viewCount === 1 ? "lectura" : "lecturas"}
                    </Text>
                  )}
                  <Text size="sm" c="dimmed">
                    {entry.date}
                  </Text>
                </Group>
              </Group>
              <Divider mb="md" />
              <Stack gap="sm">
                {entry.items.map((item, j) => {
                  const cfg = BADGE_CONFIG[item.type];
                  const detailKey = `${entry._id}_${j}`;
                  const detailOpen = openDetails.has(detailKey);
                  const hasDetail = !!item.detail?.trim();

                  return (
                    <Box key={j}>
                      <Group gap="sm" align="flex-start" wrap="nowrap">
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
                          <Text size="sm">{item.text}</Text>
                          {hasDetail && (
                            <UnstyledButton
                              onClick={() => toggleDetail(detailKey)}
                              mt={4}
                            >
                              <Group gap={4} align="center">
                                <Text size="xs" c="violet" fw={500}>
                                  {detailOpen ? "Ver menos" : "Ver más"}
                                </Text>
                                {detailOpen ? (
                                  <IconChevronUp size={12} color="var(--mantine-color-violet-6)" />
                                ) : (
                                  <IconChevronDown size={12} color="var(--mantine-color-violet-6)" />
                                )}
                              </Group>
                            </UnstyledButton>
                          )}
                        </Box>
                      </Group>

                      {hasDetail && (
                        <Collapse in={detailOpen}>
                          <Box
                            mt="xs"
                            ml={52}
                            p="sm"
                            style={{
                              borderLeft: "2px solid var(--mantine-color-violet-3)",
                              borderRadius: "0 4px 4px 0",
                              backgroundColor: "var(--mantine-color-violet-0)",
                            }}
                          >
                            <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                              {item.detail}
                            </Text>
                          </Box>
                        </Collapse>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
