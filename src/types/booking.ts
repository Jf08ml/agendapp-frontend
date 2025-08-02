
export interface SelectedService {
  serviceId: string;
  employeeId: string | null;
}

export interface BookingCustomerDetails {
  name: string;
  email: string;
  phone: string;
  birthDate: Date | null;
}

export interface BookingData {
  services: SelectedService[];
  startDate: Date | ""; // puede ser string si lo manejas así
  customerDetails: BookingCustomerDetails;
  organizationId?: string;
  status: "pending" | "approved" | "rejected";
}
