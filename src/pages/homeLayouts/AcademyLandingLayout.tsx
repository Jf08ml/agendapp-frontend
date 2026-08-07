import { GoogleMap, Marker } from "@react-google-maps/api";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Card,
  Box,
  SimpleGrid,
  useMantineTheme,
  rem,
  Stack,
  Grid,
  Group,
  Button,
  Anchor,
  AspectRatio,
  Center,
  Image,
  Badge,
} from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { getEmployeesByOrganizationId, Employee } from "../../services/employeeService";
import { getClassesByOrganization, ClassType } from "../../services/classService";
import { listPublicPackages, PublicPackageItem } from "../../services/collectionService";
import { findPackageForClass, buildClassReserveLink, buildPackageBuyLink } from "../../utils/programPurchase";
import { buildWhatsappQuoteLink } from "../../utils/whatsappLink";
import { formatCurrency } from "../../utils/formatCurrency";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import {
  IconMapPin,
  IconArrowRight,
  IconGift,
  IconClock,
  IconSparkles,
  IconUserCircle,
  IconSchool,
  IconBrandWhatsapp,
} from "@tabler/icons-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface AcademyLandingLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

// Variante de landing enfocada en negocios tipo "academia": programas
// (clases vendidas como paquete/sesión) primero, servicios "a la carta"
// después. Es un archivo independiente de LandingLayout.tsx — mismo
// lenguaje visual, sin compartir código, para no arriesgar a las
// organizaciones que ya usan homeLayout: "landing" en producción.
export function AcademyLandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
  enableOnlineBooking = true,
}: AcademyLandingLayoutProps) {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const primaryDark = theme.colors[theme.primaryColor][8];

  const [services, setServices] = useState<Service[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [packages, setPackages] = useState<PublicPackageItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const org = useSelector(selectOrganization);

  const initials = useMemo(() => {
    if (!org?.name) return "?";
    return org.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase();
  }, [org?.name]);

  // Estado de hoy (abierto/cierra pronto/cerrado) — lee weeklySchedule si está
  // activo, si no cae a openingHours legacy. Mismo cálculo que LandingLayout.
  const todayInfo = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const now = new Date();

    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayIndex = dayMap[get("weekday")] ?? now.getDay();
    const curMinutes = parseInt(get("hour")) * 60 + parseInt(get("minute"));

    type Status = "open" | "opens_soon" | "closed_now" | "closed_today";

    function getStatus(start: string, end: string): Status {
      const startMin = start.split(":").reduce((h, m, i) => h + (i === 0 ? +m * 60 : +m), 0);
      const endMin = end.split(":").reduce((h, m, i) => h + (i === 0 ? +m * 60 : +m), 0);
      if (curMinutes >= startMin && curMinutes < endMin) return "open";
      if (curMinutes < startMin) return "opens_soon";
      return "closed_now";
    }

    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule) return null;
      const day = schedule.find((d) => d.day === todayIndex);
      if (!day || day.isOpen === false || day.isAvailable === false)
        return { status: "closed_today" as Status, hours: null };
      const status = day.start && day.end ? getStatus(day.start, day.end) : ("closed_today" as Status);
      return { status, hours: `${day.start} – ${day.end}` };
    }

    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return null;
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    if (!businessDays.includes(todayIndex))
      return { status: "closed_today" as Status, hours: null };
    return { status: getStatus(oh.start, oh.end), hours: `${oh.start} – ${oh.end}` };
  }, [org?.weeklySchedule, org?.openingHours, org?.timezone]);

  const weeklyHours = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short" }).formatToParts(
      new Date()
    );
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayIndex = dayMap[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? new Date().getDay();

    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule || schedule.length === 0) return [];
      return DAY_NAMES.map((name, i) => {
        const day = schedule.find((d) => d.day === i);
        const isOpen = !!(day && day.isOpen !== false && day.isAvailable !== false);
        return { name, isToday: i === todayIndex, hours: isOpen ? `${day!.start} – ${day!.end}` : "Cerrado", isOpen };
      });
    }
    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return [];
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    return DAY_NAMES.map((name, i) => ({
      name,
      isToday: i === todayIndex,
      hours: businessDays.includes(i) ? `${oh.start} – ${oh.end}` : "Cerrado",
      isOpen: businessDays.includes(i),
    }));
  }, [org?.weeklySchedule, org?.openingHours, org?.timezone]);

  useEffect(() => {
    if (!organizationId) return;
    void (async () => {
      try {
        const [allClasses, packagesResult] = await Promise.all([
          getClassesByOrganization(organizationId),
          listPublicPackages(organizationId),
        ]);
        setClasses(allClasses.filter((c) => c.isActive));
        setPackages(packagesResult?.packages || []);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    void (async () => {
      try {
        const all = await getServicesByOrganizationId(organizationId);
        setServices(all.filter((s) => s.isActive !== false));
      } finally {
        setLoadingServices(false);
      }
    })();
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    void (async () => {
      try {
        const all = await getEmployeesByOrganizationId(organizationId);
        setEmployees(all.filter((e) => e.isActive !== false).slice(0, 8));
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, [organizationId]);

  // Teaser: destacados primero, máximo 6 programas / 4 servicios.
  const teaserClasses = useMemo(() => {
    const featured = classes.filter((c) => c.featured);
    const rest = classes.filter((c) => !c.featured);
    return [...featured, ...rest].slice(0, 6);
  }, [classes]);

  const teaserServices = useMemo(() => {
    const featured = services.filter((s) => s.featured);
    const rest = services.filter((s) => !s.featured);
    return [...featured, ...rest].slice(0, 4);
  }, [services]);

  const showLoyalty = org?.showLoyaltyProgram !== false;
  const hasLocation = !!(org?.address || org?.phoneNumber || weeklyHours.length > 0);

  return (
    <Box style={{ minHeight: "100%", backgroundColor: theme.white }}>
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
        py={{ base: rem(56), md: rem(80) }}
      >
        <Box
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <Container size="lg" style={{ position: "relative", zIndex: 1 }}>
          <Grid gutter={{ base: "xl", md: rem(64) }} align="center">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="lg">
                {todayInfo && (
                  <Group gap="xs">
                    <Box
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          todayInfo.status === "open"
                            ? "#2ec27e"
                            : todayInfo.status === "opens_soon"
                            ? "#fab005"
                            : todayInfo.status === "closed_now"
                            ? "#fa5252"
                            : "#adb5bd",
                        boxShadow:
                          todayInfo.status === "open"
                            ? "0 0 0 4px rgba(46,194,126,0.2)"
                            : todayInfo.status === "opens_soon"
                            ? "0 0 0 4px rgba(250,176,5,0.2)"
                            : todayInfo.status === "closed_now"
                            ? "0 0 0 4px rgba(250,82,82,0.2)"
                            : "none",
                      }}
                    />
                    <Text fz="sm" c="rgba(255,255,255,0.75)" fw={500}>
                      {todayInfo.status === "open"
                        ? `Abierto ahora · ${todayInfo.hours}`
                        : todayInfo.status === "opens_soon"
                        ? `Abre pronto · ${todayInfo.hours}`
                        : todayInfo.status === "closed_now"
                        ? `Cerrado ahora · ${todayInfo.hours}`
                        : "Cerrado hoy"}
                    </Text>
                  </Group>
                )}

                <Title
                  c="white"
                  fw={500}
                  fz={{ base: rem(36), sm: rem(48), md: rem(56) }}
                  style={{ lineHeight: 1.05, letterSpacing: "-0.03em", textWrap: "balance" }}
                >
                  {welcomeTitle}
                </Title>

                <Text c="rgba(255,255,255,0.8)" fz={{ base: "md", sm: "lg" }} style={{ lineHeight: 1.6, maxWidth: rem(520) }}>
                  {welcomeDescription}
                </Text>

                <Group gap="sm" mt="xs">
                  {org?.enableClassBooking && (
                    <Button
                      component="a"
                      href="#clases"
                      size="md"
                      radius="md"
                      leftSection={<IconSchool size={16} />}
                      style={{ backgroundColor: "white", color: primary, fontWeight: 600, border: "none" }}
                    >
                      Ver clases
                    </Button>
                  )}
                  <Button
                    component="a"
                    href="#servicios"
                    size="md"
                    radius="md"
                    variant={org?.enableClassBooking ? "outline" : undefined}
                    rightSection={<IconArrowRight size={15} />}
                    style={
                      org?.enableClassBooking
                        ? { borderColor: "rgba(255,255,255,0.4)", color: "white", fontWeight: 500 }
                        : { backgroundColor: "white", color: primary, fontWeight: 600, border: "none" }
                    }
                  >
                    Ver servicios
                  </Button>
                </Group>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }} visibleFrom="md">
              <Box
                style={{
                  aspectRatio: "4 / 5",
                  borderRadius: rem(20),
                  background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  position: "relative",
                  overflow: "hidden",
                  padding: rem(24),
                  paddingBottom: todayInfo?.status === "open" ? rem(96) : rem(24),
                }}
              >
                <Stack gap="sm" style={{ position: "relative", height: "100%" }}>
                  {/* Logo + nombre + badge de estado */}
                  <Group gap="xs" justify="space-between" align="center" mb={4}>
                    <Group gap="xs" style={{ minWidth: 0 }}>
                      <Box
                        style={{
                          width: rem(34),
                          height: rem(34),
                          borderRadius: rem(10),
                          background: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {org?.branding?.logoUrl ? (
                          <img
                            src={org.branding.logoUrl}
                            alt=""
                            style={{ width: "80%", height: "80%", objectFit: "contain" }}
                          />
                        ) : (
                          <Text fw={700} fz="xs" style={{ color: "rgba(255,255,255,0.9)" }}>
                            {initials}
                          </Text>
                        )}
                      </Box>
                      <Text fz="sm" fw={600} c="rgba(255,255,255,0.9)" lineClamp={1}>
                        {org?.name || ""}
                      </Text>
                    </Group>

                    {todayInfo && (
                      <Box
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: rem(5),
                          background:
                            todayInfo.status === "open"
                              ? "rgba(46,194,126,0.18)"
                              : todayInfo.status === "opens_soon"
                              ? "rgba(250,176,5,0.18)"
                              : "rgba(250,82,82,0.18)",
                          border: `1px solid ${
                            todayInfo.status === "open"
                              ? "rgba(46,194,126,0.35)"
                              : todayInfo.status === "opens_soon"
                              ? "rgba(250,176,5,0.35)"
                              : "rgba(250,82,82,0.35)"
                          }`,
                          borderRadius: rem(999),
                          padding: `${rem(3)} ${rem(9)}`,
                          flexShrink: 0,
                        }}
                      >
                        <Box
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background:
                              todayInfo.status === "open"
                                ? "#2ec27e"
                                : todayInfo.status === "opens_soon"
                                ? "#fab005"
                                : "#fa5252",
                            flexShrink: 0,
                          }}
                        />
                        <Text fz={rem(10)} fw={600} c="rgba(255,255,255,0.9)">
                          {todayInfo.status === "open"
                            ? "Abierto"
                            : todayInfo.status === "opens_soon"
                            ? "Abre pronto"
                            : "Cerrado"}
                        </Text>
                      </Box>
                    )}
                  </Group>

                  {/* Mini tarjetas de programas */}
                  {org?.enableClassBooking && teaserClasses.slice(0, 3).map((cls, i) => (
                    <Box
                      key={cls._id}
                      style={{
                        background: "rgba(255,255,255,0.95)",
                        borderRadius: rem(10),
                        padding: `${rem(8)} ${rem(10)}`,
                        display: "flex",
                        alignItems: "center",
                        gap: rem(8),
                        backdropFilter: "blur(10px)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        transform: i === 1 ? `translateX(${rem(12)})` : "none",
                      }}
                    >
                      <Box
                        style={{
                          width: rem(36),
                          height: rem(36),
                          borderRadius: rem(7),
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundImage: cls.images?.[0] ? `url(${cls.images[0]})` : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: cls.images?.[0] ? undefined : `${primary}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {!cls.images?.[0] && <IconSchool size={15} style={{ color: primary, opacity: 0.7 }} />}
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fz="xs" fw={600} c={theme.colors.gray[9]} lineClamp={1}>
                          {cls.name}
                        </Text>
                        {!cls.hidePrice && (
                          <Text fz={rem(10)} c={theme.colors.gray[5]}>
                            {cls.pricePerPerson === 0
                              ? "Gratis"
                              : formatCurrency(cls.pricePerPerson, org?.currency || "COP")}
                          </Text>
                        )}
                      </Box>
                    </Box>
                  ))}

                  {/* Horarios */}
                  {weeklyHours.length > 0 && (
                    <Box
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.15)",
                        marginTop: rem(2),
                        paddingTop: rem(6),
                      }}
                    >
                      <Text
                        fz={rem(10)}
                        fw={600}
                        tt="uppercase"
                        style={{ letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}
                        mb={4}
                      >
                        Horarios
                      </Text>
                      {weeklyHours.map((h) => (
                        <Group key={h.name} justify="space-between" align="center" style={{ padding: `${rem(4)} 0` }}>
                          <Group gap={6} align="center">
                            {h.isToday ? (
                              <Box
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  background:
                                    todayInfo?.status === "open"
                                      ? "#2ec27e"
                                      : todayInfo?.status === "opens_soon"
                                      ? "#fab005"
                                      : "#fa5252",
                                  flexShrink: 0,
                                }}
                              />
                            ) : (
                              <Box style={{ width: 5, flexShrink: 0 }} />
                            )}
                            <Text
                              fz={rem(11)}
                              fw={h.isToday ? 600 : 400}
                              c={h.isToday ? "rgba(255,255,255,0.95)" : h.isOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}
                            >
                              {h.name}
                            </Text>
                          </Group>
                          <Text
                            fz={rem(11)}
                            fw={h.isToday ? 600 : 400}
                            c={h.isToday ? "rgba(255,255,255,0.95)" : h.isOpen ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)"}
                            style={{ fontFamily: "monospace" }}
                          >
                            {h.hours}
                          </Text>
                        </Group>
                      ))}
                    </Box>
                  )}
                </Stack>

                {/* Tarjeta flotante de disponibilidad */}
                {todayInfo?.status === "open" && (
                  <Box
                    style={{
                      position: "absolute",
                      bottom: rem(24),
                      left: rem(20),
                      right: rem(20),
                      background: "rgba(255,255,255,0.95)",
                      borderRadius: rem(12),
                      padding: `${rem(12)} ${rem(16)}`,
                      backdropFilter: "blur(10px)",
                      display: "flex",
                      alignItems: "center",
                      gap: rem(10),
                    }}
                  >
                    <Box style={{ width: rem(8), height: rem(8), borderRadius: "50%", background: "#2ec27e", flexShrink: 0 }} />
                    <Box style={{ flex: 1 }}>
                      <Text fz="xs" fw={600} c={theme.colors.gray[9]} style={{ lineHeight: 1.3 }}>
                        Abierto ahora
                      </Text>
                      <Text fz="xs" c={theme.colors.gray[6]}>
                        {todayInfo.hours}
                      </Text>
                    </Box>
                    <Box
                      style={{
                        width: rem(28),
                        height: rem(28),
                        borderRadius: "50%",
                        background: primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconSchool size={14} color="white" />
                    </Box>
                  </Box>
                )}
              </Box>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* ─── Clases ───────────────────────────────────────────────────────── */}
      {org?.enableClassBooking && (
      <Container id="clases" size="lg" py={{ base: rem(64), sm: rem(88) }}>
        <Stack gap="xl">
          <Box>
            <Text fz="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }} mb="xs">
              Clases
            </Text>
            <Title fw={500} fz={{ base: rem(28), sm: rem(38) }} c={theme.colors.gray[9]} style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              Nuestras clases.
            </Title>
            <Text c={theme.colors.gray[6]} fz={{ base: "md", sm: "lg" }} mt="xs">
              Clases con cupos limitados. Compra tu paquete o reserva directamente.
            </Text>
          </Box>

          {loadingClasses ? (
            <Text ta="center" c="dimmed" py="xl">Cargando clases...</Text>
          ) : teaserClasses.length > 0 ? (
            <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }} spacing="md">
              {teaserClasses.map((cls) => {
                const packageId = findPackageForClass(cls._id, packages);
                const isFree = cls.pricePerPerson === 0;
                return (
                  <Card
                    key={cls._id}
                    shadow="xs"
                    padding={0}
                    radius="lg"
                    withBorder
                    style={{ overflow: "hidden", borderColor: theme.colors.gray[2] }}
                  >
                    <AspectRatio ratio={4 / 3}>
                      {cls.images && cls.images.length > 0 ? (
                        <Image src={cls.images[0]} fit="cover" alt={cls.name} />
                      ) : (
                        <Center bg={theme.colors.gray[1]}>
                          <IconSchool size={36} stroke={1.2} style={{ color: theme.colors.gray[4] }} />
                        </Center>
                      )}
                    </AspectRatio>
                    <Stack gap={6} p="sm">
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Text fw={600} fz="sm" c={theme.colors.gray[9]} lineClamp={1}>
                          {cls.name}
                        </Text>
                        {cls.featured && (
                          <Badge size="xs" color="yellow" variant="filled">
                            ⭐
                          </Badge>
                        )}
                      </Group>
                      <Group justify="space-between" align="center" gap={6}>
                        {!cls.hidePrice && (
                          <Text fw={600} fz="sm" c={isFree ? "green" : primary}>
                            {isFree ? "Gratis" : formatCurrency(cls.pricePerPerson, org?.currency || "COP")}
                          </Text>
                        )}
                        <Group gap={4} align="center" wrap="nowrap">
                          <IconClock size={11} color={theme.colors.gray[5]} />
                          <Text fz="xs" c={theme.colors.gray[5]}>{cls.duration} min</Text>
                        </Group>
                      </Group>
                      <Stack gap={4} mt={2} align="center">
                        <Button
                          component={Link}
                          to={buildClassReserveLink(cls._id)}
                          size="xs"
                          variant="light"
                          color={theme.primaryColor}
                          radius="md"
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
                            color={theme.primaryColor}
                            radius="md"
                            fullWidth
                          >
                            Comprar paquete
                          </Button>
                        )}
                        <Anchor component={Link} to={`/programa/${cls._id}`} state={{ backTo: "/" }} fz="xs" fw={600}>
                          Ver más →
                        </Anchor>
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Text ta="center" c="dimmed" py="xl">No hay clases disponibles</Text>
          )}

          <Group justify="space-between" align="center" mt="xs">
            <Button component={Link} to="/programas" size="md" variant="outline" color={theme.primaryColor} radius="md" rightSection={<IconArrowRight size={15} />}>
              Ver todas las clases
            </Button>
          </Group>
        </Stack>
      </Container>
      )}

      {/* ─── Servicios (diversión) ────────────────────────────────────────── */}
      <Box style={{ background: theme.colors.gray[0], borderTop: `1px solid ${theme.colors.gray[2]}`, borderBottom: `1px solid ${theme.colors.gray[2]}` }} py={{ base: rem(64), sm: rem(88) }}>
        <Container id="servicios" size="lg">
          <Stack gap="xl">
            <Box>
              <Text fz="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }} mb="xs">
                Servicios
              </Text>
              <Title fw={500} fz={{ base: rem(28), sm: rem(38) }} c={theme.colors.gray[9]} style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                También para pasarla bien.
              </Title>
              <Text c={theme.colors.gray[6]} fz={{ base: "md", sm: "lg" }} mt="xs">
                Pasadía, fiestas y más — pregúntanos lo que necesites.
              </Text>
            </Box>

            {loadingServices ? (
              <Text ta="center" c="dimmed" py="xl">Cargando servicios...</Text>
            ) : teaserServices.length > 0 ? (
              <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing="md">
                {teaserServices.map((service) => (
                  <Card key={service._id} shadow="xs" padding={0} radius="lg" withBorder style={{ overflow: "hidden", borderColor: theme.colors.gray[2] }}>
                    <AspectRatio ratio={4 / 3}>
                      {service.images && service.images.length > 0 ? (
                        <Image src={service.images[0]} fit="cover" alt={service.name} />
                      ) : (
                        <Center bg={theme.colors.gray[1]}>
                          <IconSparkles size={32} stroke={1.2} style={{ color: theme.colors.gray[4] }} />
                        </Center>
                      )}
                    </AspectRatio>
                    <Stack gap={6} p="sm">
                      <Text fw={500} fz="sm" c={theme.colors.gray[9]} lineClamp={2}>
                        {service.name}
                      </Text>
                      {!service.hidePrice && service.ctaMode !== "whatsapp_quote" && (
                        <Text fw={600} fz="sm" c={primary}>
                          {service.price === 0 ? "Gratis" : formatCurrency(service.price, org?.currency || "COP")}
                        </Text>
                      )}
                      <Stack gap={4} mt={2} align="center" onClick={(e) => e.stopPropagation()}>
                        {service.ctaMode === "whatsapp_quote" ? (
                          org?.whatsappUrl && (
                            <Button
                              component="a"
                              href={buildWhatsappQuoteLink(org.whatsappUrl, service.whatsappQuoteMessage)}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              variant="light"
                              color="green"
                              leftSection={<IconBrandWhatsapp size={14} />}
                              radius="md"
                              fullWidth
                            >
                              Cotizar
                            </Button>
                          )
                        ) : (
                          enableOnlineBooking && (
                            <Button
                              component={Link}
                              to={`/online-reservation?serviceId=${service._id}`}
                              size="xs"
                              variant="light"
                              color={theme.primaryColor}
                              radius="md"
                              fullWidth
                            >
                              Reservar
                            </Button>
                          )
                        )}
                        <Anchor component={Link} to={`/servicio/${service._id}`} state={{ backTo: "/" }} fz="xs" fw={600}>
                          Ver más →
                        </Anchor>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            ) : (
              <Text ta="center" c="dimmed" py="xl">No hay servicios disponibles</Text>
            )}

            <Group justify="space-between" align="center" mt="xs">
              <Button component={Link} to="/servicios-precios" size="md" variant="outline" color={theme.primaryColor} radius="md" rightSection={<IconArrowRight size={15} />}>
                Ver catálogo completo
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ─── Equipo ───────────────────────────────────────────────────────── */}
      {(loadingEmployees || employees.length > 0) && (
        <Container id="equipo" size="lg" py={{ base: rem(64), sm: rem(88) }}>
          <Stack gap="xl">
            <Box>
              <Text fz="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }} mb="xs">
                Equipo
              </Text>
              <Title fw={500} fz={{ base: rem(28), sm: rem(38) }} c={theme.colors.gray[9]} style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                Conoce a nuestros especialistas.
              </Title>
            </Box>

            {loadingEmployees ? (
              <Text ta="center" c="dimmed">Cargando equipo...</Text>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing={{ base: "sm", sm: "md" }}>
                {employees.map((emp) => (
                  <Card key={emp._id} padding={0} radius="lg" withBorder style={{ borderColor: theme.colors.gray[2], overflow: "hidden" }}>
                    <Box
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        backgroundImage: emp.profileImage ? `url(${emp.profileImage})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: emp.profileImage ? undefined : theme.colors.gray[1],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {!emp.profileImage && <IconUserCircle size={64} stroke={1.2} style={{ color: theme.colors.gray[4] }} />}
                    </Box>
                    <Box p="sm">
                      <Text fw={500} fz="sm" c={theme.colors.gray[9]} lineClamp={1}>{emp.names}</Text>
                      <Text fz="xs" c={theme.colors.gray[6]} lineClamp={1}>{emp.position}</Text>
                    </Box>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Container>
      )}

      {/* ─── Acciones rápidas ─────────────────────────────────────────────── */}
      {features.length > 0 && (
        <Box style={{ background: theme.colors.gray[0], borderTop: `1px solid ${theme.colors.gray[2]}` }} py={{ base: rem(64), sm: rem(88) }}>
          <Container size="lg">
            <Stack gap="xl">
              <Title fw={500} fz={{ base: rem(28), sm: rem(38) }} c={theme.colors.gray[9]} style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                ¿Qué deseas hacer?
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2, md: features.length >= 3 ? 3 : 2 }} spacing="md">
                {features.map((f) => (
                  <Card
                    key={f.link}
                    component={Link}
                    to={f.link}
                    withBorder
                    radius="lg"
                    p="xl"
                    shadow="xs"
                    style={{ backgroundColor: theme.white, borderColor: theme.colors.gray[2], textDecoration: "none" }}
                  >
                    <Stack align="center" gap="md">
                      <Box
                        style={{
                          width: rem(72),
                          height: rem(72),
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: primary,
                          color: theme.white,
                        }}
                      >
                        {f.icon}
                      </Box>
                      <Text fz="lg" fw={500} c={theme.colors.gray[9]} ta="center">{f.title}</Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Container>
        </Box>
      )}

      {/* ─── Fidelidad + Ubicación ────────────────────────────────────────── */}
      {(showLoyalty || hasLocation) && (
        <Container id="ubicacion" size="lg" py={{ base: rem(64), sm: rem(88) }}>
          <Stack gap="xl">
            <Title fw={500} fz={{ base: rem(28), sm: rem(38) }} c={theme.colors.gray[9]} style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              {showLoyalty && hasLocation ? "Fidelidad y ubicación." : showLoyalty ? "Plan de fidelidad." : "Encuéntranos."}
            </Title>

            <Grid gutter="lg">
              {showLoyalty && (
                <Grid.Col span={{ base: 12, md: hasLocation ? 6 : 12 }}>
                  <Box
                    id="fidelidad"
                    style={{
                      padding: rem(36),
                      background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                      color: "white",
                      borderRadius: rem(20),
                      height: "100%",
                      minHeight: rem(220),
                    }}
                  >
                    <Stack gap="lg">
                      <Group justify="space-between" align="flex-start">
                        <Text fz="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)" }}>
                          Plan de Fidelidad
                        </Text>
                        <IconGift size={28} stroke={1.4} style={{ opacity: 0.8 }} />
                      </Group>
                      <Text fz="sm" style={{ opacity: 0.85 }}>
                        {org?.serviceReward
                          ? `Al completar ${org?.serviceCount || "X"} servicios: ${org.serviceReward}`
                          : "Acumula puntos por cada visita y canjéalos por recompensas exclusivas."}
                      </Text>
                      <Button component={Link} to="/search-client" variant="outline" size="sm" radius="md" style={{ borderColor: "rgba(255,255,255,0.35)", color: "white", alignSelf: "flex-start" }}>
                        Ver mis puntos
                      </Button>
                    </Stack>
                  </Box>
                </Grid.Col>
              )}

              {hasLocation && (
                <Grid.Col span={{ base: 12, md: showLoyalty ? 6 : 12 }}>
                  <Card withBorder radius="lg" p="xl" style={{ borderColor: theme.colors.gray[2], height: "100%", minHeight: rem(220) }}>
                    <Stack gap="lg" h="100%">
                      <Text fz="xs" fw={600} tt="uppercase" style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}>
                        Ubicación
                      </Text>

                      {org?.location?.lat && org?.location?.lng ? (
                        <Box style={{ flex: 1, minHeight: rem(140), borderRadius: rem(12), overflow: "hidden", cursor: "pointer" }} onClick={() => navigate("/location")}>
                          <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%", minHeight: rem(140) }}
                            center={{ lat: org.location.lat, lng: org.location.lng }}
                            zoom={15}
                            options={{ disableDefaultUI: true, gestureHandling: "none", clickableIcons: false }}
                          >
                            <Marker position={{ lat: org.location.lat, lng: org.location.lng }} />
                          </GoogleMap>
                        </Box>
                      ) : null}

                      <Stack gap="md">
                        {org?.address && (
                          <Group gap="sm" align="flex-start">
                            <IconMapPin size={15} style={{ color: primary, flexShrink: 0, marginTop: 3 }} />
                            <Box style={{ flex: 1 }}>
                              <Text fw={500} fz="sm" c={theme.colors.gray[9]}>{org.address}</Text>
                              <Anchor component={Link} to="/location" fz="xs" c={theme.colors.gray[6]}>
                                Cómo llegar →
                              </Anchor>
                            </Box>
                          </Group>
                        )}
                        {weeklyHours.length > 0 && (
                          <Stack gap={4}>
                            {weeklyHours.map((h) => (
                              <Group key={h.name} justify="space-between" style={{ padding: `${rem(4)} 0` }}>
                                <Text fz="xs" c={h.isToday ? theme.colors.gray[9] : theme.colors.gray[7]} fw={h.isToday ? 600 : 400}>
                                  {h.name}
                                </Text>
                                <Text fz="xs" c={h.isOpen ? theme.colors.gray[7] : theme.colors.gray[5]} style={{ fontFamily: "monospace" }}>
                                  {h.hours}
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        )}
                      </Stack>
                    </Stack>
                  </Card>
                </Grid.Col>
              )}
            </Grid>
          </Stack>
        </Container>
      )}
    </Box>
  );
}
