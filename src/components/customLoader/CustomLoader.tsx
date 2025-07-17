// CustomLoader.tsx
import { forwardRef } from "react";
import { Image, Text, Center, Stack } from "@mantine/core";
import { useSelector } from "react-redux";
import classes from "./CustomLoader.module.css";
import { RootState } from "../../app/store";

interface CustomLoaderProps {
  loadingText?: string;
  logoUrl?: string;
}

export const CustomLoader = forwardRef<HTMLImageElement, CustomLoaderProps>(
  ({ loadingText = "Cargando...", logoUrl }, ref) => {
    // 1. Traemos el logo desde el store
    const organization = useSelector(
      (state: RootState) => state.organization.organization
    );
    // 2. Elige el logo en orden de prioridad: prop, store, fallback
    const finalLogo =
      logoUrl ||
      organization?.branding?.logoUrl ||
      "/logo_default.png";

    return (
      <Center style={{ height: "100vh", flexDirection: "column" }}>
        <Stack align="center" m="md">
          <Image
            src={finalLogo}
            alt="Logo"
            className={classes.imageLoader}
            ref={ref}
          />
          <Text size="xl" fw={700} c="dark">
            {loadingText}
          </Text>
        </Stack>
      </Center>
    );
  }
);

export default CustomLoader;
