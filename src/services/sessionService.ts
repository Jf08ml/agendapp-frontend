import { apiOrganization } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export interface ActiveSession {
  _id: string;
  userId: string;
  userType: "admin" | "employee";
  displayName: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener las sesiones activas (dispositivos logueados) del equipo de una organización
export const getSessions = async (organizationId: string): Promise<ActiveSession[]> => {
  try {
    const response = await apiOrganization.get<Response<ActiveSession[]>>(
      `/${organizationId}/sessions`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las sesiones activas");
    return [];
  }
};

// Cerrar (revocar) una sesión puntual
export const revokeSession = async (
  organizationId: string,
  sessionId: string
): Promise<boolean> => {
  try {
    await apiOrganization.delete<Response<void>>(`/${organizationId}/sessions/${sessionId}`);
    return true;
  } catch (error) {
    handleAxiosError(error, "Error al cerrar la sesión");
    return false;
  }
};
