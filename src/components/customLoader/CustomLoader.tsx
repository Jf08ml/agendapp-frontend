// CustomLoader.tsx
import { forwardRef } from "react";
import { Image, Text, Center, Stack, MantineLoaderComponent } from "@mantine/core";
import classes from "./CustomLoader.module.css";

interface CustomLoaderProps {
  loadingText?: string;
}

export const CustomLoader: MantineLoaderComponent = forwardRef<
  HTMLImageElement,
  CustomLoaderProps
>(({ loadingText = "Cargando...", ...others }, ref) => (
  <Center style={{ height: "100vh", flexDirection: "column" }}>
    <Stack align="center" m="md">
      <Image
        src="/estudio_rosa.png"
        alt="Estudio Rosa Logo"
        className={classes.imageLoader}
        {...others}
        ref={ref}
      />
      <Text size="xl" fw={700} c="dark">
        {loadingText}
      </Text>
    </Stack>
  </Center>
));

export default CustomLoader;
