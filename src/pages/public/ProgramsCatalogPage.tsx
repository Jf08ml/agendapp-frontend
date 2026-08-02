import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  AspectRatio,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  Image,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { BiSearch, BiTime, BiX } from "react-icons/bi";
import { IconSchool } from "@tabler/icons-react";
import { getClassesByOrganization, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { formatCurrency } from "../../utils/formatCurrency";
import { findPackageForClass, buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

export default function ProgramsCatalogPage() {
  const theme = useMantineTheme();
  const primary = theme.primaryColor;
  const organization = useSelector((state: RootState) => state.organization.organization);
  const orgId = organization?._id as string | undefined;

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const [allClasses, packagesResult] = await Promise.all([
          getClassesByOrganization(orgId),
          listPublicPackages(orgId),
        ]);
        if (!alive) return;
        setClasses(allClasses.filter((c) => c.isActive));
        setPackages(packagesResult?.packages || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orgId]);

  const filteredClasses = useMemo(() => {
    const q = normalize(query);
    const source = !q
      ? classes
      : classes.filter(
          (c) => normalize(c.name).includes(q) || normalize(c.description || "").includes(q)
        );
    // Destacados primero, sin duplicarlos.
    const featured = source.filter((c) => c.featured);
    const rest = source.filter((c) => !c.featured);
    return [...featured, ...rest];
  }, [classes, query]);

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Group mb="lg">
          <Skeleton height={40} width={200} radius="xl" />
          <Skeleton height={40} width="100%" radius="xl" />
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 2, md: 3, lg: 4 }} spacing="md">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={300} radius="md" />
          ))}
        </SimpleGrid>
      </Container>
    );
  }

  return (
    <Container size="xl" p={{ base: "xs", sm: "md" }}>
      <Stack gap="md" mb="xl">
        <Group justify="space-between" align="center">
          <Title order={3} fw={900} c={theme.colors[primary][9]}>
            Nuestras Clases
          </Title>
          <Badge variant="light" size="lg" circle>
            {filteredClasses.length}
          </Badge>
        </Group>

        <TextInput
          placeholder="Buscar clase..."
          leftSection={<BiSearch size={16} />}
          rightSection={
            query && (
              <ActionIcon variant="subtle" size="sm" onClick={() => setQuery("")}>
                <BiX />
              </ActionIcon>
            )
          }
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          radius="md"
        />
      </Stack>

      {filteredClasses.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {classes.length === 0 ? "No hay clases disponibles." : "No encontramos clases con esa búsqueda."}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 2, md: 3, lg: 4 }} spacing="lg" mb="xl">
          {filteredClasses.map((cls) => (
            <ProgramCard
              key={cls._id}
              classDoc={cls}
              primaryColor={primary}
              packageId={findPackageForClass(cls._id, packages)}
              currency={organization?.currency}
            />
          ))}
        </SimpleGrid>
      )}
    </Container>
  );
}

function ProgramCard({
  classDoc,
  primaryColor,
  packageId,
  currency,
}: {
  classDoc: ClassType;
  primaryColor: string;
  packageId: string | null;
  currency?: string;
}) {
  const image = classDoc.images?.[0];
  const isFree = classDoc.pricePerPerson === 0;

  return (
    <Card
      shadow="sm"
      padding="none"
      radius="md"
      withBorder
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Card.Section style={{ position: "relative" }}>
        <AspectRatio ratio={4 / 3}>
          {image ? (
            <Image src={image} fit="cover" alt={classDoc.name} />
          ) : (
            <Center bg="gray.1">
              <IconSchool size={32} color="gray" style={{ opacity: 0.5 }} />
            </Center>
          )}
        </AspectRatio>
        {classDoc.featured && (
          <Badge
            variant="filled"
            color="yellow"
            size="sm"
            style={{ position: "absolute", top: 8, left: 8 }}
          >
            ⭐ Destacado
          </Badge>
        )}
      </Card.Section>

      <Stack p="sm" gap={6} style={{ flex: 1 }}>
        <Text fw={600} fz="sm" lineClamp={2} style={{ lineHeight: 1.2 }}>
          {classDoc.name}
        </Text>
        {classDoc.description && (
          <Text fz="xs" c="dimmed" lineClamp={2}>
            {classDoc.description}
          </Text>
        )}

        <Group justify="space-between" align="center" gap={6}>
          <Text fw={700} fz="sm" c={isFree ? "green" : primaryColor}>
            {isFree ? "Gratis" : formatCurrency(classDoc.pricePerPerson, currency || "COP")}{" "}
            <Text span fz="xs" c="dimmed" fw={400}>
              / persona
            </Text>
          </Text>
          <Group gap={4} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
            <BiTime size={12} color="var(--mantine-color-gray-5)" />
            <Text fz="xs" c="dimmed">
              {classDoc.duration} min
            </Text>
          </Group>
        </Group>

        {classDoc.groupDiscount?.enabled && (
          <Badge size="xs" color="blue" variant="light" style={{ alignSelf: "flex-start" }}>
            Descuento grupal desde {classDoc.groupDiscount.minPeople} personas
          </Badge>
        )}

        <Stack gap={4} mt="auto" pt={4} align="center">
          <Button
            component={Link}
            to={buildClassReserveLink(classDoc._id)}
            size="xs"
            variant="light"
            color={primaryColor}
            fullWidth
          >
            Reservar clase
          </Button>
          {packageId && (
            <Button
              component={Link}
              to={buildPackageBuyLink(packageId)}
              size="xs"
              variant="outline"
              color={primaryColor}
              fullWidth
            >
              Comprar paquete
            </Button>
          )}
          <Anchor
            component={Link}
            to={`/programa/${classDoc._id}`}
            state={{ backTo: "/programas" }}
            fz="xs"
            fw={600}
          >
            Ver más →
          </Anchor>
        </Stack>
      </Stack>
    </Card>
  );
}
