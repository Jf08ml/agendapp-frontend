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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
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
    .regex(
      /^[a-z]{3,63}$/,
      "Solo letras minúsculas, sin números, guiones ni espacios."
    ),
  businessName: z.string().min(2, "Mínimo 2 caracteres"),
  ownerName: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  phone: z.string().min(7, "Teléfono inválido"),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced slug check
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

  // Auto-generate slug from business name
  const handleBusinessNameChange = (value: string) => {
    form.setFieldValue("businessName", value);
    if (!form.values.slug || form.values.slug === slugifyName(form.values.businessName)) {
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

      // Redirect to tenant subdomain with exchange code
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

  return (
    <Container size={460} my={40}>
      <Title ta="center" order={2}>
        Crea tu cuenta en AgenditApp
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Configura tu negocio en minutos. 7 días de prueba gratis.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
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

            <TextInput
              label="Nombre del negocio"
              placeholder="Mi Salón de Belleza"
              required
              value={form.values.businessName}
              onChange={(e) => handleBusinessNameChange(e.currentTarget.value)}
              error={form.errors.businessName}
            />

            <div>
              <TextInput
                label="Dirección web"
                placeholder="misalon"
                required
                value={form.values.slug}
                onChange={(e) => handleSlugChange(e.currentTarget.value)}
                error={
                  form.errors.slug ||
                  (slugStatus === "taken" && "Este nombre ya está en uso") ||
                  (slugStatus === "invalid" && "Solo letras minúsculas, sin números ni guiones")
                }
                rightSection={slugRightSection()}
              />
              {form.values.slug && (
                <Text size="xs" c="dimmed" mt={4}>
                  Tu dirección: <strong>{form.values.slug}.agenditapp.com</strong>
                </Text>
              )}
              {slugSuggestions.length > 0 && (
                <Group gap="xs" mt={4}>
                  <Text size="xs" c="dimmed">
                    Sugerencias:
                  </Text>
                  {slugSuggestions.map((s) => (
                    <Anchor
                      key={s}
                      size="xs"
                      onClick={() => {
                        form.setFieldValue("slug", s);
                        checkSlug(s);
                      }}
                    >
                      {s}
                    </Anchor>
                  ))}
                </Group>
              )}
            </div>

            <TextInput
              label="Tu nombre"
              placeholder="Juan Pérez"
              required
              {...form.getInputProps("ownerName")}
            />

            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              {...form.getInputProps("email")}
            />

            <TextInput
              label="Teléfono"
              placeholder="+57 300 123 4567"
              required
              {...form.getInputProps("phone")}
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              required
              {...form.getInputProps("password")}
            />

            <Button
              type="submit"
              fullWidth
              mt="md"
              loading={isSubmitting}
              disabled={slugStatus === "taken" || slugStatus === "invalid"}
            >
              Crear cuenta gratis
            </Button>

            <Text size="xs" c="dimmed" ta="center">
              ¿Ya tienes cuenta?{" "}
              <Anchor href="/login-admin" size="xs">
                Iniciar sesión
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z]/g, "") // Keep only lowercase letters
    .slice(0, 63);
}
