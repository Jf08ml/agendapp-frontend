import { apiAdvance } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Employee } from "./employeeService";

// Definir la estructura de un avance
export interface Advance {
  _id?: string | null | undefined;
  employee: string | Employee;
  description: string;
  amount: number;
  date: Date;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Crear un avance
export const createAdvance = async (
  advance: Advance
): Promise<Advance | undefined> => {
  try {
    const response = await apiAdvance.post<Response<Advance>>("/", advance);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el avance");
  }
};

// Actualizar un avance
export const updateAdvance = async (
  advanceId: string,
  advance: Advance
): Promise<Advance | undefined> => {
  try {
    const response = await apiAdvance.put<Response<Advance>>(
      `/${advanceId}`,
      advance
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el avance");
  }
};

// Eliminar un avance
export const deleteAdvance = async (advanceId: string) => {
  try {
    await apiAdvance.delete(`/${advanceId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el avance");
  }
};

// Obtener todos los avances
export const getAdvances = async (): Promise<Advance[]> => {
  try {
    const response = await apiAdvance.get<Response<Advance[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los avances");
    return [];
  }
};

// Obtener un avance por ID
export const getAdvanceById = async (
  advanceId: string
): Promise<Advance | undefined> => {
  try {
    const response = await apiAdvance.get<Response<Advance>>(`/${advanceId}`);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el avance");
  }
};

// Obtener los avances de un profesional
export const getAdvancesByEmployee = async (
  employeeId: string
): Promise<Advance[]> => {
  try {
    const response = await apiAdvance.get<Response<Advance[]>>(
      `/employee/${employeeId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los avances");
    return [];
  }
};
