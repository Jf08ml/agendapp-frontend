// DayModalTimeGrid.tsx
import { FC } from "react";
import { Box } from "@mantine/core";
import { HOUR_HEIGHT } from "../DayModal";

interface TimeGridProps {
  timeIntervals: Date[];
  hasPermission: (permission: string) => boolean;
  selectedDay: Date;
  onOpenModal: (selectedDay: Date, interval: Date, employeeId?: string) => void;
}

const DayModalTimeGrid: FC<TimeGridProps> = ({
  timeIntervals,
  hasPermission,
  onOpenModal,
  selectedDay,
}) => {
  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 0, 
      }}
    >
      {timeIntervals.map((interval, index) => (
        <Box
          key={index}
          style={{
            position: "absolute",
            top: `${index * HOUR_HEIGHT}px`,
            left: 0,
            right: 0,
            borderTop: "1px solid #e0e0e0"
          }}
          onClick={() =>
            hasPermission("appointments:create") &&
            onOpenModal(selectedDay, interval)
          }
        />
      ))}
    </Box>
  );
};

export default DayModalTimeGrid;
