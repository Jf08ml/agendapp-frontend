import { useEffect, useState } from "react";
import { Switch, Select, Flex, Text, Loader } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  getMyReminderPreferences,
  updateMyReminderPreferences,
  EmployeeReminderPreferences,
} from "../services/employeeService";

const HOURS_OPTIONS = [
  { value: "1", label: "1 hora antes" },
  { value: "2", label: "2 horas antes" },
  { value: "6", label: "6 horas antes" },
  { value: "24", label: "24 horas antes" },
];

const DEFAULT_PREFERENCES: EmployeeReminderPreferences = {
  enabled: true,
  hoursBefore: 1,
};

const EmployeeReminderPreference = () => {
  const [preferences, setPreferences] = useState<EmployeeReminderPreferences>(
    DEFAULT_PREFERENCES,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const data = await getMyReminderPreferences();
        if (data) setPreferences(data);
      } catch (error) {
        console.error("Error al obtener la preferencia de recordatorio:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPreferences();
  }, []);

  const applyUpdate = async (patch: Partial<EmployeeReminderPreferences>) => {
    const previous = preferences;
    setPreferences((prev) => ({ ...prev, ...patch }));

    try {
      await updateMyReminderPreferences(patch);
    } catch (error) {
      console.error("Error al actualizar la preferencia de recordatorio:", error);
      setPreferences(previous);
      showNotification({
        title: "❌ Error",
        message: "No se pudo actualizar el recordatorio de cita",
        color: "red",
      });
    }
  };

  const handleToggle = () => {
    void applyUpdate({ enabled: !preferences.enabled });
  };

  const handleHoursChange = (value: string | null) => {
    if (!value) return;
    void applyUpdate({
      hoursBefore: Number(value) as EmployeeReminderPreferences["hoursBefore"],
    });
  };

  return (
    <Flex direction="column" gap={4}>
      <Flex align="center" gap="md">
        <Switch
          checked={preferences.enabled}
          onChange={handleToggle}
          disabled={loading}
          size="xs"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <Text size="xs">
          {preferences.enabled ? "Recordatorio de cita" : "Recordatorio desactivado"}
        </Text>
        {loading && <Loader size="xs" />}
      </Flex>

      {preferences.enabled && (
        <Select
          size="xs"
          w={140}
          data={HOURS_OPTIONS}
          value={String(preferences.hoursBefore)}
          onChange={handleHoursChange}
          allowDeselect={false}
          disabled={loading}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          comboboxProps={{ withinPortal: true }}
        />
      )}
    </Flex>
  );
};

export default EmployeeReminderPreference;
