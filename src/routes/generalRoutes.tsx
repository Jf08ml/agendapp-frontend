import SearchClient from "../pages/loyalty/SearchClient";
import PlanViewer from "../pages/loyalty/PlanViewer";
import ServicesAndPrices from "../components/ServicesAndPrices";
import LoginAdmin from "../pages/admin/LoginAdmin";
import ClientManagement from "../pages/admin/manageClients";
import ScheduleView from "../pages/admin/manageAgenda";
import ProtectedRoute from "../components/ProtectedRoute";
import { JSX } from "react/jsx-runtime";
import AdminServices from "../pages/admin/manageServices";
import AdminEmployees from "../pages/admin/manageEmployees";
import OrganizationInfo from "../pages/account/OrganizationInfo";
import EmployeeInfo from "../pages/account/EmployeeInfo";
import DailyCashbox from "../pages/account/DailyCashbox";
// import Booking from "../pages/onlineReservation/Booking";
import ReservationsList from "../pages/admin/manageReservation";
import Home from "../pages/Home";
import Location from "../pages/location/location";
import WhatsappMultiSession from "../pages/admin/manageWhatsapp";
import SuperadminOrganizations from "../pages/superadmin/SuperadminOrganizations";
import MultiBookingWizard from "../pages/onlineReservationMulti";

const generalRoutes = [
  {
    path: "/",
    component: Home,
    MediaMetadata: {
      title: "Inicio",
      description: "Inicio de página.",
    },
  },
  {
    path: "/search-client",
    component: SearchClient,
    MediaMetadata: {
      title: "Buscar Cliente",
      description: "Búsqueda de cliente para el plan de fidelidad.",
    },
  },
  {
    path: "/plan-viewer",
    component: PlanViewer,
    MediaMetadata: {
      title: "Plan de fidelidad",
      description: "Visualización del plan de fidelidad del cliente.",
    },
  },
  {
    path: "/servicios-precios",
    component: ServicesAndPrices,
    MediaMetadata: {
      title: "Servicios y Precios",
      description: "Consulta nuestros servicios y precios en Galaxia Glamour.",
    },
  },
  // {
  //   path: "/online-reservation",
  //   component: Booking,
  //   MediaMetadata: {
  //     title: "Reserva en linea",
  //     description: "Reserva con nosotros rápido y facíl.",
  //   },
  // },

    {
    path: "/online-reservation",
    component: MultiBookingWizard,
    MediaMetadata: {
      title: "Reserva en linea",
      description: "Reserva con nosotros rápido y facíl.",
    },
  },
  {
    path: "/location",
    component: Location,
    MediaMetadata: {
      title: "Ubicación",
      description: "Ubicación en google maps.",
    },
  },
  {
    path: "/login-admin",
    component: LoginAdmin,
    MediaMetadata: {
      title: "Administrar clientes",
      description: "Administrar clientes en Galaxia Glamour.",
    },
  },
  {
    path: "/gestionar-clientes",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <ClientManagement {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Dashboard",
      description: "Dashboard de Galaxia Glamour.",
    },
  },
  {
    path: "/gestionar-agenda",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <ScheduleView {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Agenda",
      description: "Gestiona la agenda de Galaxia Glamour.",
    },
  },
  {
    path: "/gestionar-reservas-online",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <ReservationsList {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Reservas Online",
      description: "Gestiona las reservas de Galaxia Glamour.",
    },
  },
  {
    path: "/gestionar-servicios",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <AdminServices {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Servicios",
      description: "Gestiona los servicios de Galaxia Glamour.",
    },
  },
  {
    path: "/gestionar-empleados",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <AdminEmployees {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Empleados",
      description: "Gestiona los empleados de Galaxia Glamour.",
    },
  },
  {
    path: "/informacion-negocio",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <OrganizationInfo {...props} />
      </ProtectedRoute>
    ),
  },
  {
    path: "/informacion-empleado",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <EmployeeInfo {...props} />
      </ProtectedRoute>
    ),
  },
  {
    path: "/gestion-caja",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <DailyCashbox {...props} />
      </ProtectedRoute>
    ),
  },
  {
    path: "/gestionar-whatsapp",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <WhatsappMultiSession {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Empleados",
      description: "Gestiona los empleados de Galaxia Glamour.",
    },
  },

  // Superadmin routes
  {
    path: "/superadmin-organizations",
    component: (props: JSX.IntrinsicAttributes) => (

        <SuperadminOrganizations {...props} />

    ),
    MediaMetadata: {
      title: "Superadmin Organizaciones",
      description: "Administra todas las organizaciones.",
    },
  },
];

export default generalRoutes;
