import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import {
  Container,
  Box,
  AspectRatio,
  Stack,
  Group,
  Title,
  Text,
  Badge,
  Button,
  Divider,
  Center,
  Loader,
  Anchor,
  useMantineTheme,
  rem,
} from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { Image } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useSelector } from "react-redux";
import {
  IconArrowLeft,
  IconClock,
  IconSparkles,
  IconShare,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getPublicServiceById, Service } from "../../services/serviceService";
import { formatCurrency } from "../../utils/formatCurrency";

export default function PublicServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // De dónde vino el visitante: landing ("/") o catálogo completo
  // (/servicios-precios). Viaja por location.state (no ensucia el link
  // compartible); sin estado (visita directa/compartida) cae a la raíz.
  const backTo = (location.state as { backTo?: string } | null)?.backTo || "/";
  const theme = useMantineTheme();
  const organization = useSelector(
    (s: RootState) => s.organization.organization
  );
  const primary = organization?.branding?.primaryColor || theme.colors[theme.primaryColor][6];

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !organization?._id) return;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    getPublicServiceById(id, organization._id).then((data) => {
      if (!alive) return;
      if (data) {
        setService(data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id, organization?._id]);

  useEffect(() => {
    if (service) {
      document.title = `${service.name} — ${organization?.name || ""}`;
    }
    return () => {
      document.title = organization?.name || "AgenditApp";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: service?.name,
      text: service ? `${service.name} — ${organization?.name || ""}` : undefined,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // El usuario canceló el share sheet — no es un error real
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showNotification({
        title: "Enlace copiado",
        message: "Ya puedes compartirlo por WhatsApp o donde prefieras.",
        color: "green",
        icon: <IconClipboardCheck size={16} />,
      });
    } catch {
      showNotification({
        title: "No se pudo copiar el enlace",
        message: "Copia la URL manualmente desde la barra de direcciones.",
        color: "red",
      });
    }
  };

  if (loading || !organization) {
    return (
      <Center mih="60vh">
        <Loader color={primary} />
      </Center>
    );
  }

  if (notFound || !service) {
    return (
      <Container size="sm" py={rem(80)}>
        <Stack align="center" gap="sm">
          <Title order={3} ta="center">
            No encontramos este servicio
          </Title>
          <Text c="dimmed" ta="center">
            Puede que ya no esté disponible. Mira el resto de servicios de{" "}
            {organization.name}.
          </Text>
          <Anchor component={Link} to={backTo} fw={600}>
            Ver todos los servicios
          </Anchor>
        </Stack>
      </Container>
    );
  }

  const enableOnlineBooking = organization.enableOnlineBooking ?? true;
  const isFree = service.price === 0;

  return (
    <Container size="sm" py={{ base: "md", sm: rem(48) }}>
      <Anchor
        component={Link}
        to={backTo}
        c="dimmed"
        size="sm"
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        mb="md"
      >
        <IconArrowLeft size={14} /> Volver a servicios
      </Anchor>

      <AspectRatio
        ratio={4 / 3}
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          background: theme.colors.gray[1],
        }}
      >
        {service.images && service.images.length > 0 ? (
          service.images.length > 1 ? (
            <Carousel withIndicators loop height="100%">
              {service.images.map((img, i) => (
                <Carousel.Slide key={i}>
                  <Image src={img} h="100%" fit="cover" alt={service.name} />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Image src={service.images[0]} h="100%" fit="cover" alt={service.name} />
          )
        ) : (
          <Center h="100%">
            <Stack align="center" gap={8}>
              <IconSparkles size={48} stroke={1.2} color={theme.colors.gray[4]} />
              <Text fz="sm" fw={500} c={theme.colors.gray[5]}>
                {service.name}
              </Text>
            </Stack>
          </Center>
        )}
      </AspectRatio>

      <Stack gap="sm" mt="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Badge color={primary} variant="light" size="sm">
            {service.type || "General"}
          </Badge>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconShare size={14} />}
            onClick={handleShare}
          >
            Compartir
          </Button>
        </Group>

        <Title order={2}>{service.name}</Title>

        <Group gap="lg" align="center">
          {!service.hidePrice && (
            <Text fw={700} fz={rem(28)} c={isFree ? "green" : primary}>
              {isFree ? "Gratis" : formatCurrency(service.price, organization.currency || "COP")}
            </Text>
          )}
          <Group gap={6} align="center">
            <IconClock size={16} color={theme.colors.gray[6]} />
            <Text c="dimmed">{service.duration} min</Text>
          </Group>
        </Group>

        {enableOnlineBooking && (
          <Button
            component={Link}
            to={`/online-reservation?serviceId=${service._id}`}
            size="md"
            color={primary}
            radius="md"
            fullWidth
          >
            Reservar
          </Button>
        )}

        {service.description && (
          <>
            <Divider mt="sm" />
            <Text style={{ whiteSpace: "pre-wrap" }}>{service.description}</Text>
          </>
        )}

        {service.recommendations && (
          <>
            <Divider />
            <Box>
              <Text fw={600} fz="sm" mb={4}>
                Recomendaciones antes de tu cita
              </Text>
              <Text c="dimmed" fz="sm" style={{ whiteSpace: "pre-wrap" }}>
                {service.recommendations}
              </Text>
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
