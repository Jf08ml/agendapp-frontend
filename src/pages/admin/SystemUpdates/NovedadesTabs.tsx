import { Box, Tabs } from "@mantine/core";
import { IconBell, IconBulb } from "@tabler/icons-react";
import SystemUpdates from "./index";
import FeatureRequests from "./FeatureRequests";

export default function NovedadesTabs() {
  return (
    <Box maw={720} mx="auto" pt="md">
      <Tabs defaultValue="novedades">
        <Tabs.List>
          <Tabs.Tab value="novedades" leftSection={<IconBell size={16} />}>
            Novedades
          </Tabs.Tab>
          <Tabs.Tab value="solicitudes" leftSection={<IconBulb size={16} />}>
            Solicitudes
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="novedades">
          <SystemUpdates />
        </Tabs.Panel>
        <Tabs.Panel value="solicitudes">
          <FeatureRequests />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
