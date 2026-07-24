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
  Divider,
  Anchor,
  MantineTheme,
  Accordion,
  AspectRatio,
  Center,
  Image,
} from "@mantine/core";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getServicesByOrganizationId, Service } from "../../services/serviceService";
import { getEmployeesByOrganizationId, Employee } from "../../services/employeeService";
import { formatCurrency } from "../../utils/formatCurrency";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import {
  IconCalendar,
  IconMapPin,
  IconPhone,
  IconArrowRight,
  IconGift,
  IconClock,
  IconSparkles,
  IconUserCircle,
  IconStar,
} from "@tabler/icons-react";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

interface LandingLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
  enableOnlineBooking?: boolean;
}

export function LandingLayout({
  features,
  welcomeTitle,
  welcomeDescription,
  organizationId,
  enableOnlineBooking = true,
}: LandingLayoutProps) {
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const primary = theme.colors[theme.primaryColor][6];
  const primaryLight = theme.colors[theme.primaryColor][1];
  const primaryDark = theme.colors[theme.primaryColor][8];

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const org = useSelector(selectOrganization);

  // Derive initials from org name
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

  // Today's schedule — reads weeklySchedule if enabled, falls back to openingHours
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

  // Weekly schedule for display — same dual-source logic
  const weeklyHours = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      weekday: "short",
    }).formatToParts(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayIndex = dayMap[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? new Date().getDay();

    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule || schedule.length === 0) return [];
      return DAY_NAMES.map((name, i) => {
        const day = schedule.find((d) => d.day === i);
        const isOpen = !!(day && day.isOpen !== false && day.isAvailable !== false);
        return {
          name,
          isToday: i === todayIndex,
          hours: isOpen ? `${day!.start} – ${day!.end}` : "Cerrado",
          isOpen,
        };
      });
    }

    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return [];
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    return DAY_NAMES.map((name, i) => {
      const isOpen = businessDays.includes(i);
      return {
        name,
        isToday: i === todayIndex,
        hours: isOpen ? `${oh.start} – ${oh.end}` : "Cerrado",
        isOpen,
      };
    });
  }, [org?.weeklySchedule, org?.openingHours, org?.timezone]);

  useEffect(() => {
    if (!organizationId) return;
    void (async () => {
      try {
        const all = await getServicesByOrganizationId(organizationId);
        setServices(all.filter((s) => s.isActive !== false));
      } catch {
        // silencioso
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
      } catch {
        // silencioso
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, [organizationId]);

  // El landing es un teaser corto, no el catálogo completo (ese vive en
  // /servicios-precios): como mucho 3 secciones visibles en total (Destacados
  // cuenta como una), con hasta 4 servicios cada una.
  const SECTION_ITEM_LIMIT = 4;
  const MAX_TOTAL_SECTIONS = 3;

  // Destacados: sección/categoría principal, siempre primero si hay alguno.
  const featuredServices = useMemo(
    () => services.filter((s) => s.featured).slice(0, SECTION_ITEM_LIMIT),
    [services]
  );

  // Resto de servicios agrupados por tipo (categoría) en secciones — evita
  // repetir en su categoría los que ya aparecen en Destacados.
  const categorySections = useMemo(() => {
    const featuredIds = new Set(featuredServices.map((s) => s._id));
    const byType = new Map<string, Service[]>();
    services.forEach((s) => {
      if (featuredIds.has(s._id)) return;
      const type = s.type || "Otros";
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(s);
    });
    const remainingSlots = MAX_TOTAL_SECTIONS - (featuredServices.length > 0 ? 1 : 0);
    return Array.from(byType.entries())
      .map(([type, list]) => ({
        type,
        count: list.length,
        services: list.slice(0, SECTION_ITEM_LIMIT),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(remainingSlots, 0));
  }, [services, featuredServices]);

  // Une Destacados + categorías en una sola lista para renderizarlas como
  // acordeón (cada sección es "ocultable" pero arranca siempre abierta).
  const serviceSections = useMemo(() => {
    const list: { key: string; title: string; count?: number; services: Service[]; featured?: boolean }[] = [];
    if (featuredServices.length > 0) {
      list.push({ key: "featured", title: "Destacados", services: featuredServices, featured: true });
    }
    categorySections.forEach((s) => {
      list.push({ key: s.type, title: s.type, count: s.count, services: s.services });
    });
    return list;
  }, [featuredServices, categorySections]);

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
        {/* Círculo decorativo */}
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
        <Box
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <Container size="lg" style={{ position: "relative", zIndex: 1 }}>
          <Grid gutter={{ base: "xl", md: rem(64) }} align="center">
            {/* Texto izquierdo */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="lg">
                {/* Status */}
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
                  fz={{ base: rem(36), sm: rem(48), md: rem(58) }}
                  style={{
                    lineHeight: 1.05,
                    letterSpacing: "-0.03em",
                    textWrap: "balance",
                  }}
                >
                  {welcomeTitle}
                </Title>

                <Text
                  c="rgba(255,255,255,0.8)"
                  fz={{ base: "md", sm: "lg" }}
                  style={{ lineHeight: 1.6, maxWidth: rem(520) }}
                >
                  {welcomeDescription}
                </Text>

                <Group gap="sm" mt="xs">
                  {enableOnlineBooking && (
                    <Button
                      component={Link}
                      to="/online-reservation"
                      size="md"
                      radius="md"
                      leftSection={<IconCalendar size={16} />}
                      style={{
                        backgroundColor: "white",
                        color: primary,
                        fontWeight: 600,
                        border: "none",
                      }}
                    >
                      Reservar una cita
                    </Button>
                  )}
                  <Button
                    component="a"
                    href="#servicios"
                    size="md"
                    radius="md"
                    variant="outline"
                    rightSection={<IconArrowRight size={15} />}
                    style={{
                      borderColor: "rgba(255,255,255,0.4)",
                      color: "white",
                      fontWeight: 500,
                    }}
                  >
                    Ver servicios
                  </Button>
                </Group>
              </Stack>
            </Grid.Col>

            {/* Visual derecho */}
            <Grid.Col span={{ base: 12, md: 5 }} visibleFrom="md">
              <Box
                style={{
                  aspectRatio: "4 / 5",
                  borderRadius: rem(20),
                  background: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)`,
                  border: "1px solid rgba(255,255,255,0.15)",
                  position: "relative",
                  overflow: "hidden",
                  padding: rem(24),
                  paddingBottom: todayInfo?.status === "open" ? rem(96) : rem(24),
                }}
              >
                {/* Patrón decorativo */}
                <Box
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "radial-gradient(circle at 60% 30%, rgba(255,255,255,0.08) 0%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />

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

                  {/* Mini tarjetas de servicios */}
                  {services.slice(0, 3).map((service, i) => (
                    <Box
                      key={service._id}
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
                          backgroundImage: service.images?.[0]
                            ? `url(${service.images[0]})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: service.images?.[0] ? undefined : `${primary}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {!service.images?.[0] && (
                          <IconSparkles size={15} style={{ color: primary, opacity: 0.7 }} />
                        )}
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fz="xs" fw={600} c={theme.colors.gray[9]} lineClamp={1}>
                          {service.name}
                        </Text>
                        <Group gap={4} align="center" mt={1}>
                          {!service.hidePrice && (
                            <Text fz={rem(10)} c={primary} fw={600}>
                              {formatCurrency(service.price, org?.currency || "COP")}
                            </Text>
                          )}
                          <Box
                            style={{
                              width: 2,
                              height: 2,
                              borderRadius: "50%",
                              background: theme.colors.gray[4],
                            }}
                          />
                          <Text fz={rem(10)} c={theme.colors.gray[5]}>
                            {service.duration} min
                          </Text>
                        </Group>
                      </Box>
                    </Box>
                  ))}

                  {/* Horarios */}
                  {weeklyHours.length > 0 && (
                    <>
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
                          <Group
                            key={h.name}
                            justify="space-between"
                            align="center"
                            style={{ padding: `${rem(4)} 0` }}
                          >
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
                                c={
                                  h.isToday
                                    ? "rgba(255,255,255,0.95)"
                                    : h.isOpen
                                    ? "rgba(255,255,255,0.6)"
                                    : "rgba(255,255,255,0.25)"
                                }
                              >
                                {h.name}
                              </Text>
                            </Group>
                            <Text
                              fz={rem(11)}
                              fw={h.isToday ? 600 : 400}
                              c={
                                h.isToday
                                  ? "rgba(255,255,255,0.95)"
                                  : h.isOpen
                                  ? "rgba(255,255,255,0.5)"
                                  : "rgba(255,255,255,0.2)"
                              }
                              style={{ fontFamily: "monospace" }}
                            >
                              {h.hours}
                            </Text>
                          </Group>
                        ))}
                      </Box>
                    </>
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
                    <Box
                      style={{
                        width: rem(8),
                        height: rem(8),
                        borderRadius: "50%",
                        background: "#2ec27e",
                        flexShrink: 0,
                      }}
                    />
                    <Box style={{ flex: 1 }}>
                      <Text fz="xs" fw={600} c={theme.colors.gray[9]} style={{ lineHeight: 1.3 }}>
                        Abierto ahora
                      </Text>
                      <Text fz="xs" c={theme.colors.gray[6]}>
                        {todayInfo.hours}
                      </Text>
                    </Box>
                    {enableOnlineBooking && (
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
                        <IconCalendar size={14} color="white" />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* ─── Servicios ────────────────────────────────────────────────────── */}
      <Container id="servicios" size="lg" py={{ base: rem(64), sm: rem(88) }}>
        <Stack gap="xl">
          {/* Cabecera de sección */}
          <Box>
            <Text
              fz="xs"
              fw={600}
              tt="uppercase"
              style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}
              mb="xs"
            >
              Servicios
            </Text>
            <Title
              fw={500}
              fz={{ base: rem(28), sm: rem(38) }}
              c={theme.colors.gray[9]}
              style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
            >
              Todo lo que hacemos por ti.
            </Title>
            <Text c={theme.colors.gray[6]} fz={{ base: "md", sm: "lg" }} mt="xs">
              Explora el menú completo. Precios y disponibilidad en tiempo real.
            </Text>
          </Box>

          {/* Secciones de servicios: Destacados primero, luego por categoría.
              Acordeón "siempre abierto" — cada sección arranca expandida,
              pero el visitante puede colapsar las que no le interesen. */}
          {loadingServices ? (
            <Text ta="center" c="dimmed" py="xl">
              Cargando servicios...
            </Text>
          ) : serviceSections.length > 0 ? (
            <Accordion
              multiple
              defaultValue={serviceSections.map((s) => s.key)}
              chevronPosition="right"
              styles={{
                item: {
                  border: "none",
                  borderBottom: `1px solid ${theme.colors.gray[2]}`,
                },
                control: { padding: 0 },
                label: { paddingBlock: rem(14) },
                content: { padding: 0, paddingBottom: rem(20) },
              }}
            >
              {serviceSections.map((section) => (
                <Accordion.Item key={section.key} value={section.key}>
                  <Accordion.Control>
                    <Group gap={6} wrap="nowrap">
                      {section.featured && (
                        <IconStar size={18} style={{ color: primary, flexShrink: 0 }} fill={primary} />
                      )}
                      <Title order={4} fw={600} c={theme.colors.gray[9]}>
                        {section.title}
                      </Title>
                      {section.count !== undefined && (
                        <Text fz="xs" c={theme.colors.gray[5]} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {section.count}
                        </Text>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ServicesGrid
                      services={section.services}
                      theme={theme}
                      primary={primary}
                      org={org}
                      enableOnlineBooking={enableOnlineBooking}
                      navigate={navigate}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          ) : (
            <Text ta="center" c="dimmed" py="xl">
              No hay servicios disponibles
            </Text>
          )}

          {/* Ver todos */}
          <Group justify="space-between" align="center" mt="xs">
            <Button
              component={Link}
              to="/servicios-precios"
              size="md"
              variant="outline"
              color={theme.primaryColor}
              radius="md"
              rightSection={<IconArrowRight size={15} />}
            >
              Ver catálogo completo
            </Button>
          </Group>
        </Stack>
      </Container>

      {/* ─── Profesionales ────────────────────────────────────────────────── */}
      {(loadingEmployees || employees.length > 0) && (
        <Box
          id="equipo"
          style={{
            background: theme.colors.gray[0],
            borderTop: `1px solid ${theme.colors.gray[2]}`,
            borderBottom: `1px solid ${theme.colors.gray[2]}`,
          }}
          py={{ base: rem(64), sm: rem(88) }}
        >
          <Container size="lg">
            <Stack gap="xl">
              <Box>
                <Text
                  fz="xs"
                  fw={600}
                  tt="uppercase"
                  style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}
                  mb="xs"
                >
                  Equipo
                </Text>
                <Title
                  fw={500}
                  fz={{ base: rem(28), sm: rem(38) }}
                  c={theme.colors.gray[9]}
                  style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
                >
                  Conoce a nuestros especialistas.
                </Title>
                <Text c={theme.colors.gray[6]} fz={{ base: "md", sm: "lg" }} mt="xs">
                  Reserva con quien prefieras o deja que te asignemos al mejor disponible.
                </Text>
              </Box>

              {loadingEmployees ? (
                <Text ta="center" c="dimmed">
                  Cargando equipo...
                </Text>
              ) : (
                <SimpleGrid
                  cols={{ base: 2, sm: 3, md: 4 }}
                  spacing={{ base: "sm", sm: "md" }}
                >
                  {employees.map((emp) => (
                    <Card
                      key={emp._id}
                      padding={0}
                      radius="lg"
                      withBorder
                      style={{
                        borderColor: theme.colors.gray[2],
                        background: theme.white,
                        transition: "all 0.2s ease",
                        overflow: "hidden",
                      }}
                      className="landing-pro-card"
                    >
                      {/* Foto cuadrada */}
                      <Box
                        style={{
                          width: "100%",
                          aspectRatio: "1 / 1",
                          backgroundImage: emp.profileImage
                            ? `url(${emp.profileImage})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundColor: emp.profileImage ? primaryLight : theme.colors.gray[1],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {!emp.profileImage && (
                          <IconUserCircle
                            size={64}
                            stroke={1.2}
                            style={{ color: theme.colors.gray[4] }}
                          />
                        )}
                      </Box>

                      {/* Info */}
                      <Box p="sm">
                        <Text fw={500} fz="sm" c={theme.colors.gray[9]} lineClamp={1}>
                          {emp.names}
                        </Text>
                        <Text fz="xs" c={theme.colors.gray[6]} lineClamp={1}>
                          {emp.position}
                        </Text>
                      </Box>
                    </Card>
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Container>
        </Box>
      )}

      {/* ─── Acciones rápidas ─────────────────────────────────────────────── */}
      {features.length > 0 && (
        <Container size="lg" py={{ base: rem(64), sm: rem(88) }}>
          <Stack gap="xl">
            <Box>
              <Text
                fz="xs"
                fw={600}
                tt="uppercase"
                style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}
                mb="xs"
              >
                Acceso rápido
              </Text>
              <Title
                fw={500}
                fz={{ base: rem(28), sm: rem(38) }}
                c={theme.colors.gray[9]}
                style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
              >
                ¿Qué deseas hacer?
              </Title>
            </Box>

            <SimpleGrid
              cols={{ base: 1, sm: 2, md: features.length >= 3 ? 3 : 2 }}
              spacing="md"
            >
              {features.map((f) => (
                <Card
                  key={f.link}
                  component={Link}
                  to={f.link}
                  withBorder
                  radius="lg"
                  p="xl"
                  shadow="xs"
                  style={{
                    transition: "all 0.2s ease",
                    backgroundColor: theme.white,
                    borderColor: theme.colors.gray[2],
                    textDecoration: "none",
                  }}
                  className="landing-action-card"
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
                        boxShadow: `0 4px 20px ${primary}40`,
                      }}
                    >
                      {f.icon}
                    </Box>
                    <Text fz="lg" fw={500} c={theme.colors.gray[9]} ta="center">
                      {f.title}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      )}

      {/* ─── Fidelidad + Ubicación ────────────────────────────────────────── */}
      {(showLoyalty || hasLocation) && (
        <Box
          id="ubicacion"
          style={{
            background: theme.colors.gray[0],
            borderTop: `1px solid ${theme.colors.gray[2]}`,
          }}
          py={{ base: rem(64), sm: rem(88) }}
        >
          <Container size="lg">
            <Stack gap="xl">
              <Box>
                <Text
                  fz="xs"
                  fw={600}
                  tt="uppercase"
                  style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}
                  mb="xs"
                >
                  Más
                </Text>
                <Title
                  fw={500}
                  fz={{ base: rem(28), sm: rem(38) }}
                  c={theme.colors.gray[9]}
                  style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}
                >
                  {showLoyalty && hasLocation
                    ? "Fidelidad y ubicación."
                    : showLoyalty
                    ? "Plan de fidelidad."
                    : "Encuéntranos."}
                </Title>
              </Box>

              <Grid gutter="lg">
                {/* Tarjeta fidelidad */}
                {showLoyalty && (
                  <Grid.Col span={{ base: 12, md: hasLocation ? 6 : 12 }}>
                    <Box
                      id="fidelidad"
                      style={{
                        padding: rem(36),
                        background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                        color: "white",
                        borderRadius: rem(20),
                        position: "relative",
                        overflow: "hidden",
                        height: "100%",
                        minHeight: rem(280),
                      }}
                    >
                      {/* Círculos decorativos */}
                      <Box
                        style={{
                          position: "absolute",
                          right: -80,
                          top: -80,
                          width: 280,
                          height: 280,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.05)",
                        }}
                      />
                      <Box
                        style={{
                          position: "absolute",
                          right: -40,
                          bottom: -120,
                          width: 240,
                          height: 240,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      />

                      <Stack gap="lg" style={{ position: "relative" }}>
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text
                              fz="xs"
                              fw={600}
                              tt="uppercase"
                              style={{
                                letterSpacing: "0.12em",
                                color: "rgba(255,255,255,0.55)",
                              }}
                            >
                              Plan de Fidelidad
                            </Text>
                            <Text fz="sm" style={{ opacity: 0.7 }} mt={4}>
                              Cada visita suma
                            </Text>
                          </Box>
                          <IconGift size={28} stroke={1.4} style={{ opacity: 0.8 }} />
                        </Group>

                        {org?.serviceReward || (org?.serviceTiers && org.serviceTiers.length > 0) ? (
                          <Box>
                            {org.serviceTiers && org.serviceTiers.length > 0 ? (
                              <Stack gap="xs">
                                {org.serviceTiers.slice(0, 3).map((tier, i) => (
                                  <Group key={i} gap="xs" align="flex-start">
                                    <Box
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "white",
                                        marginTop: rem(7),
                                        flexShrink: 0,
                                        opacity: 0.8,
                                      }}
                                    />
                                    <Text fz="sm" style={{ opacity: 0.85 }}>
                                      {tier.threshold} servicios → {tier.reward}
                                    </Text>
                                  </Group>
                                ))}
                              </Stack>
                            ) : (
                              <Text fz="sm" style={{ opacity: 0.85 }}>
                                Al completar {org?.serviceCount || "X"} servicios:{" "}
                                {org?.serviceReward}
                              </Text>
                            )}
                          </Box>
                        ) : (
                          <Text fz="sm" style={{ opacity: 0.7 }}>
                            Acumula puntos por cada visita y canjéalos por recompensas exclusivas.
                          </Text>
                        )}

                        <Button
                          component={Link}
                          to="/search-client"
                          variant="outline"
                          size="sm"
                          radius="md"
                          style={{
                            borderColor: "rgba(255,255,255,0.35)",
                            color: "white",
                            alignSelf: "flex-start",
                          }}
                        >
                          Ver mis puntos
                        </Button>
                      </Stack>
                    </Box>
                  </Grid.Col>
                )}

                {/* Tarjeta ubicación */}
                {hasLocation && (
                  <Grid.Col span={{ base: 12, md: showLoyalty ? 6 : 12 }}>
                    <Card
                      withBorder
                      radius="lg"
                      p="xl"
                      style={{
                        borderColor: theme.colors.gray[2],
                        background: theme.white,
                        height: "100%",
                        minHeight: rem(280),
                      }}
                    >
                      <Stack gap="lg" h="100%">
                        <Box>
                          <Text
                            fz="xs"
                            fw={600}
                            tt="uppercase"
                            style={{ letterSpacing: "0.12em", color: theme.colors.gray[6] }}
                            mb={6}
                          >
                            Ubicación
                          </Text>
                          <Title
                            fw={500}
                            fz="xl"
                            c={theme.colors.gray[9]}
                            style={{ letterSpacing: "-0.02em" }}
                          >
                            Encuéntranos
                          </Title>
                        </Box>

                        {/* Google Maps */}
                        {org?.location?.lat && org?.location?.lng ? (
                          <Box
                            style={{
                              flex: 1,
                              minHeight: rem(160),
                              borderRadius: rem(12),
                              overflow: "hidden",
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              window.open(`/location`, "_self")
                            }
                          >
                            <GoogleMap
                              mapContainerStyle={{ width: "100%", height: "100%", minHeight: rem(160) }}
                              center={{ lat: org.location.lat, lng: org.location.lng }}
                              zoom={15}
                              options={{
                                disableDefaultUI: true,
                                gestureHandling: "none",
                                clickableIcons: false,
                              }}
                            >
                              <Marker position={{ lat: org.location.lat, lng: org.location.lng }} />
                            </GoogleMap>
                          </Box>
                        ) : (
                          <Box
                            style={{
                              flex: 1,
                              minHeight: rem(160),
                              borderRadius: rem(12),
                              background: theme.colors.gray[1],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text fz="sm" c={theme.colors.gray[5]}>
                              Ubicación no configurada
                            </Text>
                          </Box>
                        )}

                        {/* Info */}
                        <Stack gap="md">
                          {org?.address && (
                            <Group gap="sm" align="flex-start">
                              <Box
                                style={{
                                  width: rem(34),
                                  height: rem(34),
                                  borderRadius: rem(8),
                                  background: `${primary}14`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: primary,
                                  flexShrink: 0,
                                }}
                              >
                                <IconMapPin size={15} />
                              </Box>
                              <Box style={{ flex: 1 }}>
                                <Text fw={500} fz="sm" c={theme.colors.gray[9]}>
                                  {org.address}
                                </Text>
                                <Anchor
                                  component={Link}
                                  to="/location"
                                  fz="xs"
                                  c={theme.colors.gray[6]}
                                >
                                  Cómo llegar →
                                </Anchor>
                              </Box>
                            </Group>
                          )}

                          {org?.phoneNumber && (
                            <Group gap="sm" align="flex-start">
                              <Box
                                style={{
                                  width: rem(34),
                                  height: rem(34),
                                  borderRadius: rem(8),
                                  background: `${primary}14`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: primary,
                                  flexShrink: 0,
                                }}
                              >
                                <IconPhone size={15} />
                              </Box>
                              <Box>
                                <Text fw={500} fz="sm" c={theme.colors.gray[9]}>
                                  {org.phoneNumber}
                                </Text>
                              </Box>
                            </Group>
                          )}

                          {/* Horarios */}
                          {weeklyHours.length > 0 && (
                            <>
                              <Divider color={theme.colors.gray[2]} />
                              <Box>
                                <Text
                                  fz="xs"
                                  fw={600}
                                  tt="uppercase"
                                  style={{
                                    letterSpacing: "0.1em",
                                    color: theme.colors.gray[6],
                                  }}
                                  mb="xs"
                                >
                                  Horarios
                                </Text>
                                <Stack gap={4}>
                                  {weeklyHours.map((h) => (
                                    <Group
                                      key={h.name}
                                      justify="space-between"
                                      style={{
                                        padding: `${rem(5)} 0`,
                                        borderBottom: `1px dashed ${theme.colors.gray[2]}`,
                                        fontWeight: h.isToday ? 600 : 400,
                                      }}
                                    >
                                      <Text
                                        fz="xs"
                                        c={h.isToday ? theme.colors.gray[9] : theme.colors.gray[7]}
                                        fw={h.isToday ? 600 : 400}
                                      >
                                        {h.isToday && (
                                          <span style={{ color: "#2ec27e", marginRight: 4 }}>●</span>
                                        )}
                                        {h.name}
                                      </Text>
                                      <Text
                                        fz="xs"
                                        c={
                                          !h.isOpen
                                            ? theme.colors.gray[5]
                                            : h.isToday
                                            ? theme.colors.gray[9]
                                            : theme.colors.gray[7]
                                        }
                                        fw={h.isToday ? 600 : 400}
                                        style={{ fontFamily: "monospace" }}
                                      >
                                        {h.hours}
                                      </Text>
                                    </Group>
                                  ))}
                                </Stack>
                              </Box>
                            </>
                          )}
                        </Stack>
                      </Stack>
                    </Card>
                  </Grid.Col>
                )}
              </Grid>
            </Stack>
          </Container>
        </Box>
      )}

      {/* Animaciones y hover effects */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .landing-service-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
            border-color: ${theme.colors.gray[3]} !important;
          }
          .landing-pro-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.07) !important;
            border-color: ${theme.colors.gray[3]} !important;
          }
          .landing-action-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.1) !important;
            border-color: ${theme.colors[theme.primaryColor][2]} !important;
          }
        }
      `}</style>
    </Box>
  );
}

// ── Grilla de tarjetas de servicio ──────────────────────────────────────────
// Extraída para reusarse tanto en la sección "Destacados" como en cada
// sección de categoría, sin duplicar el marcado de la tarjeta.
function ServicesGrid({
  services,
  theme,
  primary,
  org,
  enableOnlineBooking,
  navigate,
}: {
  services: Service[];
  theme: MantineTheme;
  primary: string;
  org?: { currency?: string } | null;
  enableOnlineBooking: boolean;
  navigate: (path: string) => void;
}) {
  return (
    <Grid gutter={{ base: "sm", sm: "md" }}>
      {services.map((service) => (
        <Grid.Col key={service._id} span={{ base: 6, sm: 6, md: 4, lg: 3 }}>
          <Card
            shadow="xs"
            padding={0}
            radius="lg"
            withBorder
            style={{
              height: "100%",
              transition: "all 0.2s ease",
              cursor: "pointer",
              overflow: "hidden",
              borderColor: theme.colors.gray[2],
            }}
            className="landing-service-card"
            onClick={() => navigate(`/servicio/${service._id}`, { state: { backTo: "/" } })}
          >
            <Stack gap={0} h="100%">
              {/* Imagen o placeholder */}
              <AspectRatio ratio={4 / 3}>
                {service.images && service.images.length > 0 ? (
                  <Image src={service.images[0]} fit="cover" alt={service.name} />
                ) : (
                  <Center bg={theme.colors.gray[1]}>
                    <Stack align="center" gap={rem(8)}>
                      <IconSparkles
                        size={40}
                        stroke={1.2}
                        style={{ color: theme.colors.gray[4] }}
                      />
                      <Text
                        fz="xs"
                        fw={500}
                        c={theme.colors.gray[5]}
                        ta="center"
                        px="md"
                        lineClamp={2}
                      >
                        {service.name}
                      </Text>
                    </Stack>
                  </Center>
                )}
              </AspectRatio>

              {/* Contenido */}
              <Stack gap={6} p="sm" style={{ flex: 1 }}>
                <Text fw={500} fz="sm" c={theme.colors.gray[9]} lineClamp={2}>
                  {service.name}
                </Text>

                <Group justify="space-between" align="center" gap={6}>
                  {!service.hidePrice && (
                    <Text fw={600} fz="sm" c={primary} style={{ letterSpacing: "-0.01em" }}>
                      {service.price === 0 ? "Gratis" : formatCurrency(service.price, org?.currency || "COP")}
                    </Text>
                  )}
                  <Group gap={4} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <IconClock size={11} color={theme.colors.gray[5]} />
                    <Text fz="xs" c={theme.colors.gray[5]}>
                      {service.duration} min
                    </Text>
                  </Group>
                </Group>

                {enableOnlineBooking && (
                  <Box onClick={(e) => e.stopPropagation()} mt="auto" pt={2}>
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
                  </Box>
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
}
