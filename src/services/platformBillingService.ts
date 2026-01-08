// services/platformBillingService.ts
import { apiGeneral } from "./axiosConfig";

export interface CopAccount {
  type: string;
  label: string;
  accountName: string;
  accountNumber: string;
  bank?: string;
}

export interface PublicBillingInfo {
  polarCurrency: "USD";
  copTransfers: {
    accounts: CopAccount[];
    whatsapp: string | null;
    note?: string;
  };
}

export const getPublicBillingInfo = async (): Promise<PublicBillingInfo> => {
  const { data } = await apiGeneral.get("/billing/public");
  return data.data as PublicBillingInfo;
};
