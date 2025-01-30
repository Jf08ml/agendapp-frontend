import React, { useRef } from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./subcomponents/ItemTypes";
import AppointmentCard from "./AppointmentCard";
import { Appointment } from "../../../services/appointmentService";
import { Paper, Button } from "@mantine/core";
import { BiExpand } from "react-icons/bi";
import { MdExpandMore } from "react-icons/md";

interface DraggableAppointmentCardProps {
  appointment: Appointment;
  appoinments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onConfirmAppointment: (appointmentId: string) => void;
  isExpanded: (appointment: Appointment) => boolean;
  handleToggleExpand: (appointmentId: string) => void;
}

const DraggableAppointmentCard: React.FC<DraggableAppointmentCardProps> = ({
  appointment,
  appoinments,
  setAppointments,
  onEditAppointment,
  onCancelAppointment,
  onConfirmAppointment,
  isExpanded,
  handleToggleExpand,
}) => {
  // Ref local para acceder al DOM de la tarjeta
  const cardRef = useRef<HTMLDivElement | null>(null);

  /**
   * useDrag:
   * - Definimos un item "dinámico": la función `item: (monitor) => ...`
   *   nos permite calcular offsetY según dónde se inició el drag.
   */
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

  /**
   * Combinar ref local (cardRef) con la ref de React DnD (drag).
   * Así podemos acceder al DOM y también hacer draggable la tarjeta.
   */
  const setRefs = (node: HTMLDivElement | null) => {
    cardRef.current = node; // nuestro ref
    drag(node); // ref de React DnD
  };

  return (
    <Paper
      ref={setRefs}
      className="appointment-card"
      withBorder
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Botón para expandir */}
      <Button
        size="compact-xs"
        variant="subtle"
        style={{
          position: "absolute",
          top: 0,
          right: -5,
          zIndex: 10, // Asegura que esté por encima del contenido
        }}
        onClick={(e) => {
          e.stopPropagation(); // Evita interferencias con el drag and drop
          handleToggleExpand(appointment._id);
        }}
      >
        {isExpanded(appointment) ? (
          <MdExpandMore size={16} />
        ) : (
          <BiExpand size={16} />
        )}
      </Button>

      <AppointmentCard
        appointment={appointment}
        setAppointments={setAppointments}
        appoinments={appoinments}
        onEditAppointment={onEditAppointment}
        onCancelAppointment={onCancelAppointment}
        onConfirmAppointment={onConfirmAppointment}
      />
    </Paper>
  );
};

export default DraggableAppointmentCard;
