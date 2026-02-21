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
import OrganizationInfo from "../pages/admin/OrganizationInfo/index";
import EmployeeInfo from "../pages/account/EmployeeInfo";
import DailyCashbox from "../pages/account/DailyCashbox";
// import Booking from "../pages/onlineReservation/Booking";
import ReservationsList from "../pages/admin/manageReservation";
import Home from "../pages/Home";
import Location from "../pages/location/location";
import WhatsappMultiSession from "../pages/admin/manageWhatsapp";
import SuperadminManagement from "../pages/superadmin/SuperadminManagement";
import SuperadminOrganizationEdit from "../pages/superadmin/SuperadminOrganizationEdit";
import SuperadminOrganizations from "../pages/superadmin/SuperadminOrganizations";
import SuperadminLogin from "../pages/superadmin/SuperadminLogin";

import MyMembership from "../pages/admin/MyMembership";
import MultiBookingWizard from "../pages/onlineReservationMulti";
import AdminAnalyticsDashboard from "../pages/admin/analyticsDashboard";
import PublicCancelPage from "../pages/public/PublicCancelPage";
import WhatsappTemplateEditor from "../pages/admin/WhatsappTemplateEditor";
import MembershipPlans from "../pages/public/MembershipPlans";
import CampaignList from "../pages/admin/campaigns/CampaignList";
import CampaignWizard from "../pages/admin/campaigns/CampaignWizard";
import CampaignDetail from "../pages/admin/campaigns/CampaignDetail";
import ManagePackages from "../pages/admin/managePackages";
import SignupPage from "../pages/public/SignupPage";
import ExchangePage from "../pages/public/ExchangePage";
import PaymentSuccess from "../pages/public/PaymentSuccess";
import SuperadminPlans from "../pages/superadmin/SuperadminPlans";

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
    path: "/plans",
    component: MembershipPlans,
    MediaMetadata: {
      title: "Planes",
      description: "Elige y paga tu plan de membresía",
    },
  },
  {
    path: "/cancel",
    component: PublicCancelPage,
    MediaMetadata: {
      title: "Cancelar Reserva",
      description: "Cancelación de reserva o cita.",
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
      title: "Nuestros Servicios",
      description: "Consulta nuestros  en Galaxia Glamour.",
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
    path: "/gestionar-paquetes",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <ManagePackages {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Gestionar Paquetes",
      description: "Gestiona los paquetes de sesiones.",
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
  {
    path: "/mensajes-whatsapp",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <WhatsappTemplateEditor {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Mensajes de WhatsApp",
      description: "Personaliza los mensajes automáticos de WhatsApp.",
    },
  },
    {
    path: "/analytics-dashboard",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <AdminAnalyticsDashboard {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Analiticas del negocio",
      description: "Ve analiticas del negocio",
    },
  },
  {
    path: "/my-membership",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <MyMembership {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Mi Membresía",
      description: "Ver detalles de tu membresía y plan",
    },
  },
  // Campaign routes
  {
    path: "/admin/campaigns",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <CampaignList {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Campañas de WhatsApp",
      description: "Gestiona tus campañas masivas de WhatsApp",
    },
  },
  {
    path: "/admin/campaigns/new",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <CampaignWizard {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Nueva Campaña",
      description: "Crea una nueva campaña de WhatsApp",
    },
  },
  {
    path: "/admin/campaigns/:campaignId",
    component: (props: JSX.IntrinsicAttributes) => (
      <ProtectedRoute>
        <CampaignDetail {...props} />
      </ProtectedRoute>
    ),
    MediaMetadata: {
      title: "Detalle de Campaña",
      description: "Ver detalles y métricas de campaña",
    },
  },

  // Public registration routes (app.agenditapp.com)
  {
    path: "/signup",
    component: SignupPage,
    MediaMetadata: {
      title: "Crear cuenta",
      description: "Crea tu cuenta en AgenditApp",
    },
  },
  {
    path: "/exchange",
    component: ExchangePage,
    MediaMetadata: {
      title: "Accediendo",
      description: "Configurando tu cuenta",
    },
  },
  {
    path: "/payment-success",
    component: PaymentSuccess,
    MediaMetadata: {
      title: "Pago exitoso",
      description: "Tu pago fue procesado correctamente",
    },
  },

  // Superadmin routes
  {
    path: "/superadmin-login",
    component: SuperadminLogin,
    MediaMetadata: {
      title: "Acceso de plataforma",
      description: "Login de superadmin",
    },
  },
  {
    path: "/superadmin",
    component: (props: JSX.IntrinsicAttributes) => (
      <SuperadminManagement {...props} />
    ),
    MediaMetadata: {
      title: "Panel de Superadmin",
      description: "Administra organizaciones y membresías.",
    },
  },
  {
    path: "/superadmin/orgs",
    component: SuperadminOrganizations,
    MediaMetadata: {
      title: "Organizaciones",
      description: "Lista de organizaciones — Superadmin",
    },
  },
  {
    path: "/superadmin/planes",
    component: SuperadminPlans,
    MediaMetadata: {
      title: "Gestión de Planes",
      description: "Crea y edita los planes de la plataforma",
    },
  },
  {
    path: "/superadmin/organizaciones/:id",
    component: (props: JSX.IntrinsicAttributes) => (
      <SuperadminOrganizationEdit {...props} />
    ),
    MediaMetadata: {
      title: "Editar Organización",
      description: "Edita todos los campos de una organización.",
    },
  },
];

export default generalRoutes;
