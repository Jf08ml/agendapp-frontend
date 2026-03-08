import { apiGeneral } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export interface Expense {
  _id: string;
  organizationId: string;
  date: string;
  concept: string;
  amount: number;
  category?: string;
  registeredBy?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

export const getExpenses = async (
  startDate: string,
  endDate: string
): Promise<Expense[]> => {
  try {
    const response = await apiGeneral.get<ApiResponse<Expense[]>>("/expenses", {
      params: { startDate, endDate },
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los gastos");
    return [];
  }
};

export const createExpense = async (
  data: Omit<Expense, "_id" | "organizationId" | "createdAt">
): Promise<Expense | undefined> => {
  try {
    const response = await apiGeneral.post<ApiResponse<Expense>>(
      "/expenses",
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al registrar el gasto");
  }
};

export const deleteExpense = async (id: string): Promise<void> => {
  try {
    await apiGeneral.delete(`/expenses/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el gasto");
  }
};

export const updateExpense = async (
  id: string,
  data: Partial<Omit<Expense, "_id" | "organizationId" | "createdAt">>
): Promise<Expense | undefined> => {
  try {
    const response = await apiGeneral.put<ApiResponse<Expense>>(
      `/expenses/${id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el gasto");
  }
};
