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

// Re-exportar todos los layouts desde la carpeta homeLayouts
export { ModernLayout } from "./homeLayouts/ModernLayout";
export { MinimalLayout } from "./homeLayouts/MinimalLayout";
export { CardsLayout } from "./homeLayouts/CardsLayout";
export { LandingLayout } from "./homeLayouts/LandingLayout";
