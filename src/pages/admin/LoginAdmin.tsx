import React, { useState, useEffect } from "react";
import {
  TextInput,
  Button,
  Text,
  Card,
  Flex,
  Checkbox,
  Loader,
} from "@mantine/core";
import colors from "../../theme/colores";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../../features/auth/sliceAuth";
import { login } from "../../services/authService";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { useMediaQuery } from "@mantine/hooks";
import { RootState } from "../../app/store";

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

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (!organization?._id) {
        setError("No se ha cargado la organización correctamente.");
        setIsLoading(false);
        return;
      }

      console.log(organization);

      const organizationId = organization?._id as string;

      const data = await login(email, password, organizationId);
      if (data) {
        const organizationId =
          data.userType === "admin" ? data.userId : data.organizationId;
        dispatch(
          loginSuccess({
            userId: data.userId,
            organizationId,
            token: data.token,
            role: data.userType,
            permissions: data.userPermissions,
          })
        );
        navigation("/gestionar-agenda");

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      } else {
        setError("Credenciales incorrectas");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError("Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex justify="center" align="center" style={{ height: "100%" }}>
      <Card
        style={{
          width: isMobile ? "90%" : "auto",
          margin: "auto",
          padding: "2rem",
          backgroundColor: organization?.branding?.primaryColor,
          color: organization?.branding?.secondaryColor,
          borderRadius: "8px",
          boxShadow: "0 0 20px rgba(0, 0, 0, 1)",
        }}
      >
        <Text size="xl" mb="xl">
          ¡Bienvenido!
        </Text>
        <TextInput
          placeholder="Ingresa tu correo *"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          mb="md"
        />
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <TextInput
            placeholder="Ingresa tu contraseña *"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
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
        />
        {error && (
          <Text c={colors.errorText} mb="md">
            {error}
          </Text>
        )}
        <Button
          fullWidth
          variant="gradient"
          onClick={handleLogin}
          disabled={isLoading}
          leftSection={isLoading && <Loader size="xs" />}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </Card>
    </Flex>
  );
};

export default LoginAdmin;
