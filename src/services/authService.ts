import { apiAuth, apiGeneral } from "./axiosConfig";
import { AxiosResponse } from "axios";

// Definir el tipo de respuesta para el inicio de sesión
interface LoginResponse {
  userId: string;
  organizationId?: string;
  token: string;
  userType: string;
  userPermissions?: string[];
  expiresAt?: string; // ISO timestamp de expiración
}

interface SuperadminLoginResponse {
  token: string;
  adminId: string;
  name: string;
  userType: "superadmin";
  expiresAt: string;
}

// Función para iniciar sesión
export const login = async (
  email: string,
  password: string,
  organizationId: string
): Promise<LoginResponse | null> => {
  try {
    const response: AxiosResponse<{ data: LoginResponse }> = await apiAuth.post(
      "/",
      {
        email,
        password,
        organizationId
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return null;
  }
};

// Función para iniciar sesión como superadmin de plataforma
// Llama a POST /api/admin/login (no depende de organización)
export const loginSuperadmin = async (
  email: string,
  password: string
): Promise<SuperadminLoginResponse> => {
  const response: AxiosResponse<{ data: SuperadminLoginResponse }> =
    await apiGeneral.post("/admin/login", { email, password });
  return response.data.data;
};

// Función para renovar el token
export const refreshToken = async (
  currentToken: string
): Promise<LoginResponse | null> => {
  try {
    const response: AxiosResponse<{ data: LoginResponse }> = await apiAuth.post(
      "/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error al renovar el token:", error);
    return null;
  }
};

// Función para guardar el token en localStorage
export const saveToken = (token: string) => {
  localStorage.setItem("app_token", token);
};

// Función para guardar el timestamp de expiración
export const saveTokenExpiry = (expiresAt: string) => {
  localStorage.setItem("app_token_expires_at", expiresAt);
};

// Función para obtener el token desde localStorage
export const getToken = (): string | null => {
  return localStorage.getItem("app_token");
};

// Función para obtener el timestamp de expiración
export const getTokenExpiry = (): string | null => {
  return localStorage.getItem("app_token_expires_at");
};

// Función para eliminar el token de localStorage
export const clearToken = () => {
  localStorage.removeItem("app_token");
  localStorage.removeItem("app_token_expires_at");
};