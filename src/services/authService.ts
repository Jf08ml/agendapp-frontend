import { apiAuth } from "./axiosConfig";
import { AxiosResponse } from "axios";

// Definir el tipo de respuesta para el inicio de sesión
interface LoginResponse {
  userId: string;
  organizationId: string;
  token: string;
  userType: string;
  userPermissions: string[];
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

// Función para guardar el token en localStorage
export const saveToken = (token: string) => {
  localStorage.setItem("authToken", token);
};

// Función para obtener el token desde localStorage
export const getToken = (): string | null => {
  return localStorage.getItem("authToken");
};

// Función para eliminar el token de localStorage
export const clearToken = () => {
  localStorage.removeItem("authToken");
};
