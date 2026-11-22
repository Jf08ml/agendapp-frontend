// Acceso del equipo (rediseño, AccesoEquipo): tarjeta clara con el logo del
// negocio, etiquetas visibles, mostrar/ocultar contraseña, «¿Olvidaste tu
// contraseña?» junto a la etiqueta y el error en línea bajo el campo. La
// lógica de inicio de sesión no cambia.
import React, { useState, useEffect } from "react";
import { Anchor, Button, Checkbox, Group, PasswordInput, Text, TextInput } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { login } from "../../services/authService";
import { RootState } from "../../app/store";
import { extractTenantFromHost } from "../../utils/domainUtils";
import { AGENDITAPP_SUPPORT_WA_URL, loginFailureMessage, RECOVER_ACCESS_PATH } from "../../utils/panelAccess";
import AuthCard from "../../components/auth/AuthCard";

const LoginAdmin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigate();
  const dispatch = useDispatch();
  const organization = useSelector((state: RootState) => state.organization.organization);

  // «Recordar mi correo»: solo guarda el correo en este navegador para
  // precargarlo; la sesión dura lo mismo con o sin la casilla.
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (!organization?._id) {
        setError("No se ha cargado la organización correctamente.");
        setIsLoading(false);
        return;
      }

      const initialOrgId = organization?._id as string;
      const normalizedEmail = email.replace(/\s+/g, "").toLowerCase();
      const data = await login(normalizedEmail, password, initialOrgId);
      if (data) {
        const organizationId =
          data.userType === "admin" ? data.userId : (data.organizationId || initialOrgId);
        dispatch(
          loginSuccess({
            userId: data.userId,
            organizationId,
            token: data.token,
            sessionId: data.sessionId,
            role: data.userType,
            permissions: data.userPermissions || [],
            expiresAt: data.expiresAt, // Agregar el timestamp de expiración
          })
        );
        navigation("/gestionar-agenda");

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", normalizedEmail);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      } else {
        setError("Correo o contraseña incorrectos.");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError(loginFailureMessage((error as { response?: { status?: number } })?.response?.status));
    } finally {
      setIsLoading(false);
    }
  };

  // En app.agenditapp.com no hay negocio cargado y el login del dueño necesita
  // su organización: el formulario solo podía fallar con "No se ha cargado la
  // organización". Explicar dónde se entra.
  if (extractTenantFromHost().type === "signup") {
    return (
      <AuthCard platform title="Entra desde el enlace de tu negocio">
        <Text size="sm">
          Cada negocio tiene su propio enlace, por ejemplo{" "}
          <Text span fw={600}>tunegocio.agenditapp.com/login-admin</Text>. Ahí inicias sesión con tu correo y tu
          contraseña.
        </Text>
        <Text size="sm" c="var(--ink-muted)">
          Lo encuentras en el correo y el WhatsApp de bienvenida de AgenditApp. Si no lo tienes o olvidaste tu
          contraseña, te enviamos un código para entrar.
        </Text>
        <Button component="a" href={RECOVER_ACCESS_PATH} fullWidth size="lg">
          Entrar con un código
        </Button>
        <Button component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" fullWidth variant="default">
          Escribir a soporte por WhatsApp
        </Button>
      </AuthCard>
    );
  }

  const showClientLink =
    (organization?.enableOnlineBooking ?? true) || !!organization?.enableClassBooking;

  return (
    <AuthCard title="Acceso para el equipo">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading) void handleLogin();
        }}
        style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      >
        <TextInput
          label="Correo"
          type="email"
          autoComplete="username"
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          withAsterisk={false}
        />

        <PasswordInput
          // «¿Olvidaste tu contraseña?» junto a la etiqueta (solo dueños: los
          // empleados piden el cambio al administrador)
          label={
            <Group justify="space-between" wrap="nowrap" w="100%" gap="xs">
              <span>Contraseña</span>
              <Anchor href={RECOVER_ACCESS_PATH} className="ag-link" underline="never">
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>
          }
          styles={{ label: { display: "flex", width: "100%" } }}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          withAsterisk={false}
          visibilityToggleButtonProps={{ "aria-label": "Mostrar u ocultar la contraseña" }}
          error={
            error ? (
              <span style={{ display: "inline-flex", gap: 4, alignItems: "flex-start" }}>
                <IconAlertCircle size={14} style={{ flex: "none", marginTop: 2 }} />
                {error}
              </span>
            ) : undefined
          }
        />

        <Checkbox
          size="xs"
          label="Recordar mi correo en este dispositivo"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.currentTarget.checked)}
          styles={{ label: { color: "var(--ink-muted)" } }}
        />

        <Button type="submit" fullWidth size="lg" loading={isLoading}>
          Iniciar sesión
        </Button>
      </form>

      {showClientLink && (
        <p className="ag-subtle" style={{ margin: 0, textAlign: "center" }}>
          ¿Eres cliente?{" "}
          <Link className="ag-link" to="/mis-reservas">
            Ver mis reservas
          </Link>
        </p>
      )}
    </AuthCard>
  );
};

export default LoginAdmin;
