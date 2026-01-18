import { apiEmployee, apiEmployeePublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";
import { Service } from "./serviceService";

interface Role {
  name: string;
  permissions: string[];
}

// Definir la estructura de un empleado
export interface Employee {
  _id: string;
  names: string;
  position: string;
  services?: Service[];
  email: string;
  password?: string;
  phoneNumber: string;
  organizationId: string;
  role: Role;
  customPermissions: string[];
  isActive: boolean;
  profileImage: string;
  color: string;
  order?: number;
  commissionPercentage?: number; // % de comisión sobre las ventas
}

interface CreateEmployeePayload {
  names: string;
  position: string;
  email: string;
  phoneNumber: string;
  services?: Partial<Service>[];
  organizationId: string;
  password: string;
  isActive: boolean;
  profileImage: string;
  commissionPercentage?: number;
}

interface Response<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// Obtener todos los empleados
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const response = await apiEmployee.get<Response<Employee[]>>("/");
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los empleados");
    return [];
  }
};

// Obtener empleados por organizationId
export const getEmployeesByOrganizationId = async (
  organizationId: string
): Promise<Employee[]> => {
  try {
    const response = await apiEmployeePublic.get<Response<Employee[]>>(
      `/organization/${organizationId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los empleados por organización");
    return [];
  }
};

// Obtener un empleado por ID
export const getEmployeeById = async (
  employeeId: string
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.get<Response<Employee>>(
      `/${employeeId}`
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener el empleado");
  }
};

// Crear un nuevo empleado
export const createEmployee = async (
  employeeData: CreateEmployeePayload
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.post<Response<Employee>>(
      "/",
      employeeData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el empleado");
  }
};

// Actualizar un empleado
export const updateEmployee = async (
  employeeId: string,
  updatedData: Partial<Employee>
): Promise<Employee | undefined> => {
  try {
    const response = await apiEmployee.put<Response<Employee>>(
      `/${employeeId}`,
      updatedData
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el empleado");
  }
};

// Eliminar un empleado
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    await apiEmployee.delete<Response<void>>(`/${employeeId}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el empleado");
  }
};
