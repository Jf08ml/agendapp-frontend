import { apiProduct } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

export interface Product {
  _id: string;
  organizationId: string;
  name: string;
  category?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  // Imagen del producto (URL de ImageKit); "" = sin imagen
  imageUrl?: string;
  costPrice: number;
  salePrice: number;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  commissionType?: "percentage" | "fixed" | null;
  commissionValue?: number;
  active: boolean;
  // Tienda pública: opt-in por producto (solo los marcados salen en /tienda)
  visibleInStore?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
}

export interface ProductSale {
  _id: string;
  organizationId: string;
  items: ProductSaleItem[];
  total: number;
  method: "cash" | "card" | "transfer" | "other";
  soldBy?: { _id: string; names: string } | string | null;
  commissionAmount: number;
  clientId?: { _id: string; name: string } | string | null;
  appointmentId?: string | null;
  date: string;
  note?: string;
  registeredBy?: string | null;
  createdAt?: string;
}

export interface CreateSalePayload {
  items: { productId: string; quantity: number; unitPrice?: number }[];
  method: ProductSale["method"];
  soldBy?: string | null;
  clientId?: string | null;
  appointmentId?: string | null;
  date?: string;
  note?: string;
}

interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

export const getProducts = async (params?: {
  includeInactive?: boolean;
  search?: string;
}): Promise<Product[]> => {
  try {
    const response = await apiProduct.get<ApiResponse<Product[]>>("/", {
      params,
    });
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los productos");
    return [];
  }
};

export const createProduct = async (
  data: Omit<Product, "_id" | "organizationId" | "createdAt" | "updatedAt">
): Promise<Product | undefined> => {
  try {
    const response = await apiProduct.post<ApiResponse<Product>>("/", data);
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el producto");
  }
};

export const updateProduct = async (
  id: string,
  data: Partial<Omit<Product, "_id" | "organizationId" | "createdAt" | "updatedAt">>
): Promise<Product | undefined> => {
  try {
    const response = await apiProduct.put<ApiResponse<Product>>(
      `/${id}`,
      data
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el producto");
  }
};

export const deactivateProduct = async (id: string): Promise<void> => {
  try {
    await apiProduct.delete(`/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al desactivar el producto");
  }
};

export const adjustStock = async (
  id: string,
  delta: number,
  reason: string
): Promise<Product | undefined> => {
  try {
    const response = await apiProduct.post<ApiResponse<Product>>(
      `/${id}/stock`,
      { delta, reason }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al ajustar el stock");
  }
};

export const createSale = async (
  payload: CreateSalePayload
): Promise<ProductSale | undefined> => {
  try {
    const response = await apiProduct.post<ApiResponse<ProductSale>>(
      "/sales",
      payload
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al registrar la venta");
  }
};

export const getSales = async (
  startDate: string,
  endDate: string
): Promise<ProductSale[]> => {
  try {
    const response = await apiProduct.get<ApiResponse<ProductSale[]>>(
      "/sales",
      { params: { startDate, endDate } }
    );
    return response.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las ventas");
    return [];
  }
};

export const deleteSale = async (id: string): Promise<void> => {
  try {
    await apiProduct.delete(`/sales/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al anular la venta");
  }
};
