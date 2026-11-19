import React, { useState, useEffect, useMemo } from "react";
import {
  TextInput,
  Button,
  Text,
  Card,
  Flex,
  Checkbox,
  Loader,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { login } from "../../services/authService";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useMediaQuery } from "@mantine/hooks";
import { RootState } from "../../app/store";
import colors from "../../theme/colores";
import { extractTenantFromHost } from "../../utils/domainUtils";
import { AGENDITAPP_SUPPORT_WA_URL, loginFailureMessage, RECOVER_ACCESS_PATH } from "../../utils/panelAccess";

const isColorDark = (hexColor: string): boolean => {
  // Calcula el brillo promedio del color (0-255)
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128; // oscuro si < 128
};

const LoginAdmin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigate();
  const dispatch = useDispatch();
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );

  const isMobile = useMediaQuery("(max-width: 768px)") ?? false;

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const primaryColor = organization?.branding?.primaryColor || "#ffffff";

  // Determinar color de texto contrastante
  const contrastText = useMemo(() => {
    return isColorDark(primaryColor) ? "#FFFFFF" : "#1A1A1A";
  }, [primaryColor]);

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
      <Flex justify="center" align="center" style={{ height: "100%" }}>
        <Card withBorder shadow="md" radius="md" p="xl" style={{ width: isMobile ? "90%" : 440, margin: "auto" }}>
          <Text size="xl" fw={700} mb="sm">
            Entra desde el enlace de tu negocio
          </Text>
          <Text size="sm" mb="sm">
            Cada negocio tiene su propio enlace, por ejemplo{" "}
            <Text span fw={700}>tunegocio.agenditapp.com/login-admin</Text>. Ahí inicias sesión con tu
            correo y tu contraseña.
          </Text>
          <Text size="sm" c="dimmed" mb="lg">
            Lo encuentras en el correo y el WhatsApp de bienvenida de AgenditApp. Si no lo tienes o
            olvidaste tu contraseña, te enviamos un código para entrar.
          </Text>
          <Button component="a" href={RECOVER_ACCESS_PATH} fullWidth mb="sm">
            Entrar con un código
          </Button>
          <Button component="a" href={AGENDITAPP_SUPPORT_WA_URL} target="_blank" rel="noopener noreferrer" fullWidth variant="light">
            Escribir a soporte por WhatsApp
          </Button>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex justify="center" align="center" style={{ height: "100%" }}>
      <Card
        style={{
          width: isMobile ? "90%" : "auto",
          margin: "auto",
          padding: "2rem",
          backgroundColor: primaryColor,
          color: contrastText,
          borderRadius: "12px",
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
          transition: "all 0.3s ease",
        }}
      >
        <Text size="xl" mb="xl" fw={700}>
          ¡Bienvenido!
        </Text>

        <TextInput
          placeholder="Ingresa tu correo *"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          mb="md"
          styles={{
            input: {
              backgroundColor: "rgba(255,255,255,0.9)",
              color: "#000",
            }
          }}
        />

        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <TextInput
            placeholder="Ingresa tu contraseña *"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            styles={{
              input: {
                backgroundColor: "rgba(255,255,255,0.9)",
                color: "#000",
              }
            }}
          />
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              top: "50%",
              right: "-0.5rem",
              transform: "translateY(-50%)",
              color: contrastText,
            }}
          >
            {showPassword ? <IoEyeOff size={16} /> : <IoEye size={16} />}
          </Button>
        </div>

        <Checkbox
          label="Recordar mis datos"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.currentTarget.checked)}
          mb="md"
          styles={{
            label: { color: contrastText },
            input: {
              borderColor: contrastText,
            },
          }}
        />

        {error && (
          <Text c={contrastText === "#FFFFFF" ? "#FFD2D2" : colors.errorText} mb="md">
            {error}
          </Text>
        )}

        <Button
          fullWidth
          variant="filled"
          onClick={handleLogin}
          disabled={isLoading}
          color={isColorDark(primaryColor) ? "gray.0" : "dark"}
          style={{
            backgroundColor: isColorDark(primaryColor)
              ? "#FFFFFF"
              : "#000000",
            color: isColorDark(primaryColor) ? "#000000" : "#FFFFFF",
            transition: "0.2s",
          }}
          leftSection={isLoading && <Loader size="xs" />}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>

        {/* Solo dueños: los empleados piden el cambio al administrador. */}
        <Text size="sm" ta="center" mt="md">
          <a
            href={RECOVER_ACCESS_PATH}
            style={{ color: contrastText, textDecoration: "underline" }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </Text>
      </Card>
    </Flex>
  );
};

export default LoginAdmin;
