// CustomLoader.tsx
import { forwardRef } from "react";
import { Image, Text, Box, Stack } from "@mantine/core";
import { useSelector } from "react-redux";
import classes from "./CustomLoader.module.css";
import { RootState } from "../../app/store";

interface CustomLoaderProps {
  loadingText?: string;
  logoUrl?: string;
  overlay?: boolean;
}

export const CustomLoader = forwardRef<HTMLImageElement, CustomLoaderProps>(
  ({ loadingText = "Cargando...", logoUrl, overlay }, ref) => {
    const organization = useSelector(
      (state: RootState) => state.organization.organization
    );
    const finalLogo =
      logoUrl || organization?.branding?.logoUrl || "/logo_default.png";

    return (
      <Box
        style={{
          display: "grid",
          placeItems: "center",
          width: "100%",
          height: overlay ? "100%" : "100vh",
          minHeight: overlay ? 180 : undefined,
          background: overlay ? "transparent" : undefined,
          zIndex: overlay ? 99 : undefined,
        }}
      >
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
      </Box>
    );
  }
);

export default CustomLoader;
