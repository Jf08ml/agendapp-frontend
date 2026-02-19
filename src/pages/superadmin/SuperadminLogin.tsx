import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Alert,
  Center,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { loginSuperadmin } from "../../services/authService";
import { IoAlertCircle } from "react-icons/io5";

export default function SuperadminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email y contraseña son requeridos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await loginSuperadmin(email, password);

      dispatch(
        loginSuccess({
          userId: data.adminId,
          organizationId: "", // Superadmins no pertenecen a una organización
          token: data.token,
          role: data.userType,
          permissions: [],
          expiresAt: data.expiresAt,
        })
      );

      navigate("/superadmin/orgs");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Credenciales inválidas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ height: "100vh", backgroundColor: "#f5f5f5" }}>
      <Paper p="xl" radius="md" w={380} withBorder shadow="md">
        <Stack gap="lg">
          <div>
            <Title order={3}>Panel de Plataforma</Title>
            <Text size="sm" c="dimmed">
              Acceso restringido a superadmins
            </Text>
          </div>

          {error && (
            <Alert icon={<IoAlertCircle />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <TextInput
            label="Email"
            placeholder="superadmin@agenditapp.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="email"
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoComplete="current-password"
          />

          <Button
            fullWidth
            onClick={handleLogin}
            loading={loading}
            mt="sm"
          >
            Ingresar
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
