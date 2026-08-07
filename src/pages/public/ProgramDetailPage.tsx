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
  IconSchool,
  IconShare,
  IconClipboardCheck,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { RootState } from "../../app/store";
import { getPublicClassById, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { formatCurrency } from "../../utils/formatCurrency";
import { getVideoEmbedUrl } from "../../utils/videoEmbed";
import { findPackageForClass, buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // De dónde vino el visitante: landing ("/") o catálogo completo de
  // programas (/programas). Viaja por location.state; sin estado (visita
  // directa/compartida) cae a la raíz.
  const backTo = (location.state as { backTo?: string } | null)?.backTo || "/";
  const theme = useMantineTheme();
  const organization = useSelector((s: RootState) => s.organization.organization);
  const primary = organization?.branding?.primaryColor || theme.colors[theme.primaryColor][6];

  const [classDoc, setClassDoc] = useState<ClassType | null>(null);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !organization?._id) return;
    const classId = id;
    const organizationId = organization._id;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    void (async () => {
      const [data, packagesResult] = await Promise.all([
        getPublicClassById(classId, organizationId),
        listPublicPackages(organizationId),
      ]);
      if (!alive) return;
      if (data) {
        setClassDoc(data);
        setPackages(packagesResult?.packages || []);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id, organization?._id]);

  useEffect(() => {
    if (classDoc) {
      document.title = `${classDoc.name} — ${organization?.name || ""}`;
    }
    return () => {
      document.title = organization?.name || "AgenditApp";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classDoc]);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: classDoc?.name,
      text: classDoc ? `${classDoc.name} — ${organization?.name || ""}` : undefined,
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

  if (notFound || !classDoc) {
    return (
      <Container size="sm" py={rem(80)}>
        <Stack align="center" gap="sm">
          <Title order={3} ta="center">
            No encontramos esta clase
          </Title>
          <Text c="dimmed" ta="center">
            Puede que ya no esté disponible. Mira el resto de clases de{" "}
            {organization.name}.
          </Text>
          <Anchor component={Link} to={backTo} fw={600}>
            Ver todas las clases
          </Anchor>
        </Stack>
      </Container>
    );
  }

  const isFree = classDoc.pricePerPerson === 0;
  const videoEmbedUrl = classDoc.videoUrl ? getVideoEmbedUrl(classDoc.videoUrl) : null;
  const packageId = findPackageForClass(classDoc._id, packages);

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
        <IconArrowLeft size={14} /> Volver a clases
      </Anchor>

      <AspectRatio
        ratio={4 / 3}
        style={{
          borderRadius: theme.radius.lg,
          overflow: "hidden",
          background: theme.colors.gray[1],
        }}
      >
        {classDoc.images && classDoc.images.length > 0 ? (
          classDoc.images.length > 1 ? (
            <Carousel withIndicators loop height="100%">
              {classDoc.images.map((img, i) => (
                <Carousel.Slide key={i}>
                  <Image src={img} h="100%" fit="cover" alt={classDoc.name} />
                </Carousel.Slide>
              ))}
            </Carousel>
          ) : (
            <Image src={classDoc.images[0]} h="100%" fit="cover" alt={classDoc.name} />
          )
        ) : (
          <Center h="100%">
            <Stack align="center" gap={8}>
              <IconSchool size={48} stroke={1.2} color={theme.colors.gray[4]} />
              <Text fz="sm" fw={500} c={theme.colors.gray[5]}>
                {classDoc.name}
              </Text>
            </Stack>
          </Center>
        )}
      </AspectRatio>

      <Stack gap="sm" mt="lg">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Badge color={primary} variant="light" size="sm">
            Clase
          </Badge>
          <Group gap={4} wrap="nowrap">
            {classDoc.pdfUrl && (
              <Button
                component="a"
                href={classDoc.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconFileTypePdf size={14} />}
              >
                PDF
              </Button>
            )}
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
        </Group>

        <Title order={2}>{classDoc.name}</Title>

        <Group gap="lg" align="center">
          {!classDoc.hidePrice && (
            <Text fw={700} fz={rem(28)} c={isFree ? "green" : primary}>
              {isFree ? "Gratis" : formatCurrency(classDoc.pricePerPerson, organization.currency || "COP")}
              <Text span fz="sm" c="dimmed" fw={400}>
                {" "}/ persona
              </Text>
            </Text>
          )}
          <Group gap={6} align="center">
            <IconClock size={16} color={theme.colors.gray[6]} />
            <Text c="dimmed">{classDoc.duration} min</Text>
          </Group>
        </Group>

        <Stack gap="xs">
          <Button
            component={Link}
            to={buildClassReserveLink(classDoc._id)}
            size="md"
            color={primary}
            radius="md"
            fullWidth
          >
            Reservar clase
          </Button>
          {packageId && (
            <Button
              component={Link}
              to={buildPackageBuyLink(packageId)}
              size="md"
              variant="outline"
              color={primary}
              radius="md"
              fullWidth
            >
              Comprar paquete
            </Button>
          )}
        </Stack>

        {classDoc.description && (
          <>
            <Divider mt="sm" />
            <Text style={{ whiteSpace: "pre-wrap" }}>{classDoc.description}</Text>
          </>
        )}

        {classDoc.groupDiscount?.enabled && (
          <>
            <Divider />
            <Box>
              <Text fw={600} fz="sm" mb={4}>
                Descuento grupal
              </Text>
              <Text c="dimmed" fz="sm">
                {classDoc.groupDiscount.discountPercent}% de descuento reservando desde{" "}
                {classDoc.groupDiscount.minPeople} personas
                {classDoc.groupDiscount.maxPeople ? ` hasta ${classDoc.groupDiscount.maxPeople}` : ""}.
              </Text>
            </Box>
          </>
        )}

        {classDoc.videoUrl && (
          <>
            <Divider />
            <Box>
              <Text fw={600} fz="sm" mb={8}>
                Video
              </Text>
              {videoEmbedUrl ? (
                <AspectRatio ratio={16 / 9} style={{ borderRadius: theme.radius.md, overflow: "hidden" }}>
                  <iframe
                    src={videoEmbedUrl}
                    title={`Video — ${classDoc.name}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 0 }}
                  />
                </AspectRatio>
              ) : (
                <Button
                  component="a"
                  href={classDoc.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  color={primary}
                  radius="md"
                >
                  Ver video
                </Button>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
