import { useState, useCallback, useRef, useEffect } from "react";
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  Loader,
  Alert,
  Anchor,
  Box,
  Image,
  Divider,
  SimpleGrid,
  ThemeIcon,
  List,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconRocket,
  IconCalendar,
  IconArrowRight,
  IconUser,
  IconBuildingStore,
  IconLink,
  IconBrandWhatsapp,
  IconMessage2,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import {
  checkSlugAvailability,
  registerOrganization,
} from "../../services/registrationService";
import { getPostSignupRedirectUrl } from "../../utils/domainUtils";

const signupSchema = z.object({
  slug: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(63, "Máximo 63 caracteres")
    .regex(/^[a-z]{3,63}$/, "Solo letras minúsculas, sin números, guiones ni espacios."),
  businessName: z.string().min(2, "Mínimo 2 caracteres"),
  ownerName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  phone: z.string().min(7, "Teléfono inválido"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SUPPORT_WA_URL = "https://wa.me/573184345284";
const SUPPORT_WA_TEXT = "+57 318 434 5284";

// ✅ 1) tiempo reducido a 3s
const SUPPORT_AUTO_COLLAPSE_MS = 3000;

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text c="rgba(255,255,255,0.88)" span>
        {children}
      </Text>
      <Text span c="rgba(251,191,36,0.95)" fw={800}>
        *
      </Text>
    </Group>
  );
}

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Soporte: expanded -> collapsed -> hidden
  const [supportState, setSupportState] = useState<"expanded" | "collapsed" | "hidden">(
    "expanded"
  );
  const supportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<SignupFormValues>({
    validate: zodResolver(signupSchema),
    initialValues: {
      slug: "",
      businessName: "",
      ownerName: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      setSlugSuggestions([]);
      return;
    }
    setSlugStatus("checking");
    try {
      const result = await checkSlugAvailability(slug.toLowerCase());
      if (result.available) {
        setSlugStatus("available");
        setSlugSuggestions([]);
      } else {
        setSlugStatus(result.reason === "invalid_format" ? "invalid" : "taken");
        setSlugSuggestions(result.suggestions || []);
      }
    } catch {
      setSlugStatus("idle");
    }
  }, []);

  const handleBusinessNameChange = (value: string) => {
    form.setFieldValue("businessName", value);

    const currentAuto = slugifyName(form.values.businessName);
    if (!form.values.slug || form.values.slug === currentAuto) {
      const newSlug = slugifyName(value);
      form.setFieldValue("slug", newSlug);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => checkSlug(newSlug), 300);
    }
  };

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, "");
    form.setFieldValue("slug", normalized);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => checkSlug(normalized), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Evita doble scroll si AppShell también scrollea
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ✅ auto-colapsar a los 3 segundos
  useEffect(() => {
    if (supportTimer.current) clearTimeout(supportTimer.current);

    if (supportState === "expanded") {
      supportTimer.current = setTimeout(() => {
        setSupportState("collapsed");
      }, SUPPORT_AUTO_COLLAPSE_MS);
    }

    return () => {
      if (supportTimer.current) clearTimeout(supportTimer.current);
    };
  }, [supportState]);

  const handleSubmit = async (values: SignupFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerOrganization({
        slug: values.slug.toLowerCase(),
        businessName: values.businessName,
        ownerName: values.ownerName,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });

      notifications.show({
        title: "Cuenta creada",
        message: "Redirigiendo a tu panel de administración...",
        color: "green",
        icon: <IconCheck size={16} />,
      });

      const redirectUrl = getPostSignupRedirectUrl(
        values.slug.toLowerCase(),
        result.exchangeCode
      );

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const message =
        axiosErr.response?.data?.message || "Error al crear la cuenta. Intenta de nuevo.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  const slugRightSection = () => {
    if (slugStatus === "checking") return <Loader size="xs" />;
    if (slugStatus === "available")
      return <IconCheck size={16} style={{ color: "var(--mantine-color-green-6)" }} />;
    if (slugStatus === "taken" || slugStatus === "invalid")
      return <IconX size={16} style={{ color: "var(--mantine-color-red-6)" }} />;
    return null;
  };

  const slugHelpText =
    form.values.slug && slugStatus !== "invalid"
      ? `${form.values.slug}.agenditapp.com`
      : "";

  return (
    <Box
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        backgroundColor: "#050b14",
      }}
    >
      {/* Background (desktop) */}
      <Box
        visibleFrom="sm"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(900px 520px at 18% 20%, rgba(29,78,216,0.25), transparent 60%),
            radial-gradient(700px 420px at 80% 15%, rgba(14,165,233,0.18), transparent 55%),
            linear-gradient(180deg, rgba(5,11,20,0.25), rgba(5,11,20,0.92)),
            url("/images/fondo-agenditapp.png")
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.08) blur(4px)",
        }}
      />
      {/* Background (mobile) */}
      <Box
        hiddenFrom="sm"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(700px 420px at 50% 10%, rgba(29,78,216,0.22), transparent 60%),
            linear-gradient(180deg, rgba(5,11,20,0.35), rgba(5,11,20,0.96)),
            url("/images/fondo-agenditapp-mobile.png")
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.08) blur(4px)",
        }}
      />

      {/* Content */}
      <Box
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          overflowY: "auto",
          padding: "22px 0 140px 0", // deja espacio para soporte esquina
        }}
      >
        <Container size="lg">
          {/* Header */}
          <Group justify="space-between" align="center" mb={18} wrap="wrap">
            <Image
              src="/images/logo_dorado.png"
              alt="AgenditApp"
              w={160}
              fit="contain"
              style={{ filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.45))" }}
            />

            <Paper
              radius="xl"
              px="md"
              py={10}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Group gap={10} wrap="nowrap">
                <ThemeIcon radius="xl" size={34} variant="light" color="blue">
                  <IconLink size={18} />
                </ThemeIcon>
                <Box>
                  <Text size="sm" fw={800} c="white">
                    Acceso por enlace
                  </Text>
                  <Text size="xs" c="rgba(255,255,255,0.68)">
                    Tu negocio tendrá una URL (dominio o subdominio) para entrar al panel.
                  </Text>
                </Box>
              </Group>
            </Paper>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: "xl", md: 48 }}>
            {/* LEFT */}
            <Box>
              <Title c="white" order={1} style={{ letterSpacing: -0.6 }}>
                Crea tu panel con tu{" "}
                <Text span c="rgba(251,191,36,0.95)">
                  dirección web
                </Text>{" "}
                en minutos.
              </Title>

              <Text mt={10} c="rgba(255,255,255,0.72)" maw={520}>
                Configura tu organización y tu URL. Al finalizar, quedarás dentro de tu panel para
                empezar a configurar servicios, horarios y reservas.
              </Text>

              <Paper
                mt={18}
                radius="xl"
                p="lg"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Group align="flex-start" gap="md" wrap="nowrap">
                  <ThemeIcon radius="xl" size={44} variant="light" color="blue">
                    <IconRocket size={22} />
                  </ThemeIcon>

                  <Box>
                    <Text fw={800} c="white">
                      Cómo funciona
                    </Text>

                    <List
                      mt={10}
                      spacing={8}
                      icon={
                        <ThemeIcon radius="xl" size={20} variant="light" color="yellow">
                          <IconArrowRight size={12} />
                        </ThemeIcon>
                      }
                    >
                      <List.Item>
                        <Text c="rgba(255,255,255,0.72)">
                          Creas tu organización y eliges tu URL.
                        </Text>
                      </List.Item>
                      <List.Item>
                        <Text c="rgba(255,255,255,0.72)">
                          Te redirigimos automáticamente al panel de tu negocio.
                        </Text>
                      </List.Item>
                      <List.Item>
                        <Text c="rgba(255,255,255,0.72)">
                          Empiezas a agendar y a gestionar clientes desde tu panel.
                        </Text>
                      </List.Item>
                    </List>
                  </Box>
                </Group>

                <Divider my="md" opacity={0.25} />

                <Group gap="md" wrap="nowrap" align="flex-start">
                  <ThemeIcon radius="xl" size={44} variant="light" color="green">
                    <IconBrandWhatsapp size={22} />
                  </ThemeIcon>

                  <Box>
                    <Text fw={800} c="white">
                      Mensajes y recordatorios
                    </Text>

                    <Text mt={6} c="rgba(255,255,255,0.72)">
                      AgenditApp te acompaña en la configuración para que puedas enviar mensajes a tus
                      clientes desde tu WhatsApp Business y mantener tus citas organizadas.
                    </Text>
                  </Box>
                </Group>
              </Paper>

              <Paper
                mt={14}
                radius="xl"
                px="lg"
                py="md"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Group gap="md" wrap="nowrap" align="flex-start">
                  <ThemeIcon radius="xl" size={42} variant="light" color="blue">
                    <IconCalendar size={20} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={800} c="white">
                      Listo para operar
                    </Text>
                    <Text size="sm" mt={4} c="rgba(255,255,255,0.68)">
                      Al finalizar, tu panel queda activo en tu URL y puedes empezar a configurar
                      servicios, horarios y reservas.
                    </Text>
                  </Box>
                </Group>
              </Paper>
            </Box>

            {/* RIGHT */}
            <Box>
              <Paper
                radius="xl"
                p={{ base: 18, sm: 26 }}
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(14px)",
                  boxShadow: "0 18px 45px rgba(0,0,0,0.50)",
                  overflow: "hidden",
                }}
              >
                <Box
                  style={{
                    position: "absolute",
                    inset: -2,
                    background:
                      "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(59,130,246,0.16), rgba(14,165,233,0.10))",
                    filter: "blur(14px)",
                    opacity: 0.95,
                    pointerEvents: "none",
                  }}
                />

                <Box style={{ position: "relative" }}>
                  <Group justify="space-between" align="center">
                    <Group gap={10} wrap="nowrap">
                      <ThemeIcon radius="xl" size={40} variant="light" color="yellow">
                        <IconBuildingStore size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text fw={900} c="white">
                          Crear panel
                        </Text>
                        <Text size="xs" c="rgba(255,255,255,0.65)">
                          Completa los datos para generar tu URL
                        </Text>
                      </Box>
                    </Group>

                    <Paper
                      radius="xl"
                      px="md"
                      py={8}
                      style={{
                        background: "rgba(59,130,246,0.10)",
                        border: "1px solid rgba(59,130,246,0.18)",
                      }}
                    >
                      <Group gap={8} wrap="nowrap">
                        <IconArrowRight size={14} style={{ color: "rgba(191,219,254,0.95)" }} />
                        <Text size="xs" fw={800} c="rgba(191,219,254,0.95)">
                          1 minuto
                        </Text>
                      </Group>
                    </Paper>
                  </Group>

                  <Divider my="md" opacity={0.25} />

                  <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="md">
                      {error && (
                        <Alert
                          icon={<IconAlertCircle size={16} />}
                          title="Error"
                          color="red"
                          withCloseButton
                          onClose={() => setError(null)}
                        >
                          {error}
                        </Alert>
                      )}

                      <Text size="xs" c="rgba(255,255,255,0.65)" fw={800} tt="uppercase">
                        Datos del negocio
                      </Text>

                      <TextInput
                        leftSection={<IconBuildingStore size={16} />}
                        label={<RequiredLabel>Nombre del negocio</RequiredLabel>}
                        placeholder="Mi Salón de Belleza"
                        value={form.values.businessName}
                        onChange={(e) => handleBusinessNameChange(e.currentTarget.value)}
                        error={form.errors.businessName}
                        styles={{
                          input: { background: "rgba(255,255,255,0.06)" },
                          label: { marginBottom: 6 },
                        }}
                      />

                      <Box>
                        <TextInput
                          label={<RequiredLabel>Dirección web</RequiredLabel>}
                          placeholder="misalon"
                          value={form.values.slug}
                          onChange={(e) => handleSlugChange(e.currentTarget.value)}
                          error={
                            form.errors.slug ||
                            (slugStatus === "taken" && "Este nombre ya está en uso") ||
                            (slugStatus === "invalid" &&
                              "Solo letras minúsculas, sin números ni guiones")
                          }
                          rightSection={slugRightSection()}
                          styles={{
                            input: { background: "rgba(255,255,255,0.06)" },
                            label: { marginBottom: 6 },
                          }}
                        />

                        {slugHelpText && (
                          <Paper
                            mt={8}
                            radius="lg"
                            px="md"
                            py={10}
                            style={{
                              background:
                                slugStatus === "available"
                                  ? "rgba(34,197,94,0.08)"
                                  : "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            <Group justify="space-between" wrap="nowrap" align="center">
                              <Group gap={10} wrap="nowrap">
                                <ThemeIcon
                                  radius="xl"
                                  size={34}
                                  variant="light"
                                  color={slugStatus === "available" ? "green" : "gray"}
                                >
                                  {slugStatus === "available" ? (
                                    <IconCheck size={18} />
                                  ) : (
                                    <IconLink size={18} />
                                  )}
                                </ThemeIcon>

                                <Box>
                                  <Text size="xs" fw={800} c="rgba(255,255,255,0.85)">
                                    {slugStatus === "available" ? "Disponible" : "Tu subdominio"}
                                  </Text>
                                  <Text size="sm" fw={900} c="white">
                                    {slugHelpText}
                                  </Text>
                                </Box>
                              </Group>

                              <Text size="xs" c="rgba(255,255,255,0.60)" visibleFrom="sm">
                                Podrás usar dominio propio más adelante
                              </Text>
                            </Group>
                          </Paper>
                        )}

                        {slugSuggestions.length > 0 && (
                          <Group gap="xs" mt={10} wrap="wrap">
                            <Text size="xs" c="rgba(255,255,255,0.65)">
                              Sugerencias:
                            </Text>
                            {slugSuggestions.map((s) => (
                              <Anchor
                                key={s}
                                size="xs"
                                c="rgba(251,191,36,0.95)"
                                onClick={() => {
                                  form.setFieldValue("slug", s);
                                  checkSlug(s);
                                }}
                                style={{ fontWeight: 800 }}
                              >
                                {s}
                              </Anchor>
                            ))}
                          </Group>
                        )}
                      </Box>

                      <Divider my={4} opacity={0.25} />

                      <Text size="xs" c="rgba(255,255,255,0.65)" fw={800} tt="uppercase">
                        Administrador
                      </Text>

                      <TextInput
                        leftSection={<IconUser size={16} />}
                        label={<RequiredLabel>Tu nombre</RequiredLabel>}
                        placeholder="Juan Pérez"
                        {...form.getInputProps("ownerName")}
                        styles={{
                          input: { background: "rgba(255,255,255,0.06)" },
                          label: { marginBottom: 6 },
                        }}
                      />

                      <TextInput
                        label={<RequiredLabel>Email</RequiredLabel>}
                        placeholder="tu@email.com"
                        {...form.getInputProps("email")}
                        styles={{
                          input: { background: "rgba(255,255,255,0.06)" },
                          label: { marginBottom: 6 },
                        }}
                      />

                      <TextInput
                        label={<RequiredLabel>Teléfono</RequiredLabel>}
                        placeholder="+57 300 123 4567"
                        {...form.getInputProps("phone")}
                        styles={{
                          input: { background: "rgba(255,255,255,0.06)" },
                          label: { marginBottom: 6 },
                        }}
                      />

                      <PasswordInput
                        label={<RequiredLabel>Contraseña</RequiredLabel>}
                        placeholder="Mínimo 6 caracteres"
                        {...form.getInputProps("password")}
                        styles={{
                          input: { background: "rgba(255,255,255,0.06)" },
                          label: { marginBottom: 6 },
                        }}
                      />

                      <Button
                        type="submit"
                        fullWidth
                        mt="xs"
                        loading={isSubmitting}
                        disabled={slugStatus === "taken" || slugStatus === "invalid"}
                        styles={{
                          root: {
                            height: 44,
                            fontWeight: 900,
                            letterSpacing: 0.2,
                            background:
                              "linear-gradient(90deg, rgba(251,191,36,0.95) 0%, rgba(59,130,246,0.95) 55%, rgba(14,165,233,0.95) 100%)",
                            boxShadow: "0 14px 28px rgba(0,0,0,0.35)",
                          },
                        }}
                      >
                        Crear cuenta
                      </Button>

                      <Paper
                        radius="lg"
                        px="md"
                        py="sm"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <Text size="xs" c="rgba(255,255,255,0.65)">
                          Al finalizar, podrás entrar desde el enlace de tu negocio (dominio o
                          subdominio). Si necesitas ayuda, contáctanos.
                        </Text>
                      </Paper>
                    </Stack>
                  </form>
                </Box>
              </Paper>
            </Box>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ✅ Soporte global esquina (desktop + mobile): expanded/collapsed/hidden */}
      {supportState !== "hidden" && (
        <Box
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {supportState === "expanded" ? (
            <Paper
              radius="xl"
              px="md"
              py="sm"
              style={{
                width: "min(420px, calc(100vw - 32px))",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                pointerEvents: "auto",
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap={10} wrap="nowrap" align="flex-start">
                  <ThemeIcon radius="xl" size={38} variant="light" color="green">
                    <IconBrandWhatsapp size={18} />
                  </ThemeIcon>

                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={900} c="white">
                      ¿Necesitas ayuda?
                    </Text>
                    <Text size="xs" c="rgba(255,255,255,0.72)" mt={2}>
                      Escríbenos por WhatsApp para dudas, soporte o cualquier inquietud.
                    </Text>

                    <Group gap={10} mt={8} wrap="wrap">
                      <Anchor
                        href={SUPPORT_WA_URL}
                        target="_blank"
                        style={{
                          display: "inline-flex",
                          fontWeight: 900,
                          color: "rgba(34,197,94,0.95)",
                        }}
                      >
                        {SUPPORT_WA_TEXT}
                      </Anchor>

                      <Anchor
                        href={SUPPORT_WA_URL}
                        target="_blank"
                        style={{
                          display: "inline-flex",
                          fontWeight: 800,
                          color: "rgba(191,219,254,0.95)",
                        }}
                      >
                        Abrir chat
                      </Anchor>
                    </Group>
                  </Box>
                </Group>

                {/* X para colapsar sin esperar */}
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label="Cerrar"
                  onClick={() => setSupportState("collapsed")}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Group>
            </Paper>
          ) : (
            <Paper
              radius="xl"
              px={10}
              py={10}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                pointerEvents: "auto",
              }}
            >
              {/* Botón WA */}
              <ActionIcon
                radius="xl"
                size={44}
                variant="filled"
                color="green"
                component="a"
                href={SUPPORT_WA_URL}
                target="_blank"
                aria-label="Soporte por WhatsApp"
              >
                <IconBrandWhatsapp size={22} />
              </ActionIcon>

              {/* Expandir aviso */}
              <ActionIcon
                radius="xl"
                size={44}
                variant="light"
                color="blue"
                aria-label="Mostrar ayuda"
                onClick={() => setSupportState("expanded")}
              >
                <IconMessage2 size={22} />
              </ActionIcon>

              {/* Ocultar por completo */}
              <ActionIcon
                radius="xl"
                size={44}
                variant="subtle"
                color="gray"
                aria-label="Ocultar"
                onClick={() => setSupportState("hidden")}
              >
                <IconX size={22} />
              </ActionIcon>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
    .slice(0, 63);
}
