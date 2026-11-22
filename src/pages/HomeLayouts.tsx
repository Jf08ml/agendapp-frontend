import { ReactNode } from "react";

// Tipos compartidos
export interface Feature {
  title: string;
  icon: ReactNode;
  link: string;
  show?: boolean;
}

export interface HomeLayoutProps {
  features: Feature[];
  welcomeTitle: string;
  welcomeDescription: string;
  organizationId?: string;
}

// Re-exportar todos los layouts desde la carpeta homeLayouts. Minimal, Cards y
// Modern muestran hoy la misma plantilla Esencial (rediseño); se conservan los
// nombres para no cambiar qué ve cada negocio según su `homeLayout`.
export { EssentialLayout as ModernLayout } from "./homeLayouts/EssentialLayout";
export { EssentialLayout as MinimalLayout } from "./homeLayouts/EssentialLayout";
export { EssentialLayout as CardsLayout } from "./homeLayouts/EssentialLayout";
export { LandingLayout } from "./homeLayouts/LandingLayout";
export { AcademyLandingLayout } from "./homeLayouts/AcademyLandingLayout";
