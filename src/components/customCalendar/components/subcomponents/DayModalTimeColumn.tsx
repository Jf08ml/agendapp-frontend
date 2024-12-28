import { FC } from "react";
import { Box, Text } from "@mantine/core";
import { format } from "date-fns";
import { HOUR_HEIGHT } from "../DayModal";

interface TimeColumnProps {
  timeIntervals: Date[];
}

const DayModalTimeColumn: FC<TimeColumnProps> = ({ timeIntervals }) => {
  return (
    <Box style={{ width: "80px" }}>
      {timeIntervals.map((interval, index) => (
        <Box
          key={index}
          style={{
            height: `${HOUR_HEIGHT}px`,
            borderTop: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "1px solid #e0e0e0",
          }}
        >
          <Text size="sm">{format(interval, "h a")}</Text>
        </Box>
      ))}
    </Box>
  );
};

export default DayModalTimeColumn;
