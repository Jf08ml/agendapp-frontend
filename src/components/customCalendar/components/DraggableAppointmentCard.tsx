import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./subcomponents/ItemTypes";
import AppointmentCard from "./AppointmentCard";
import { Appointment } from "../../../services/appointmentService";
import { Paper } from "@mantine/core";

interface DraggableAppointmentCardProps {
  appointment: Appointment;
  appoinments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  onMarkAttendance: (appointmentId: string, status: "attended" | "no_show") => void;
  isExpanded: (appointment: Appointment) => boolean;
  handleToggleExpand: (appointmentId: string) => void;
  timezone?: string; // 🌍 Timezone de la organización
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  appointment,
  appoinments,
  setAppointments,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  onMarkAttendance,
  isExpanded,
  handleToggleExpand,
  timezone = 'America/Bogota', // 🌍 Default timezone
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.APPOINTMENT,
    item: (monitor) => {
      if (!cardRef.current) {
        return {
          appointmentId: appointment._id,
          offsetY: 0,
          cardHeightPx: 0,
        };
      }
      const rect = cardRef.current.getBoundingClientRect();
      const mousePos = monitor.getClientOffset();
      if (!mousePos) {
        return {
          appointmentId: appointment._id,
          offsetY: 0,
          cardHeightPx: rect.height,
        };
      }
      const offsetY = mousePos.y - rect.top;
      return {
        appointmentId: appointment._id,
        offsetY,
        cardHeightPx: rect.height,
      };
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const setRefs = (node: HTMLDivElement | null) => {
    cardRef.current = node;
    drag(node);
  };

  const expanded = isExpanded(appointment);

  return (
    <Paper
      ref={setRefs}
      className="appointment-card"
      radius="xs"
      shadow={expanded ? "sm" : "xs"}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        transition: "box-shadow 120ms ease, transform 120ms ease",
        transform: expanded ? "translateY(-1px)" : "none",
      }}
    >
      <AppointmentCard
        appointment={appointment}
        setAppointments={setAppointments}
        appoinments={appoinments}
        onEditAppointment={onEditAppointment}
        onCancelAppointment={onCancelAppointment}
        onConfirmAppointment={onConfirmAppointment}
        onMarkAttendance={onMarkAttendance}
        isExpanded={isExpanded}
        handleToggleExpand={handleToggleExpand}
        timezone={timezone}
      />
    </Paper>
  );
};

export default React.memo(DraggableAppointmentCard);
