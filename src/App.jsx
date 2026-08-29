import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import Layout from './Layout';
import { ThemeProvider } from '@/context/ThemeContext';
import AppSettingsPage from '@/pages/AppSettingsPage';

// ─── PAGES ───────────────────────────────────────────────────────────────────
import AdminPanel from '@/pages/AdminPanel';
import Dashboard from '@/pages/Dashboard';
import Loads from '@/pages/Loads';
import LoadDetail from '@/pages/LoadDetail';
import LoadForm from '@/pages/LoadForm';
import Fleet from '@/pages/Fleet';
import FleetTrips from '@/pages/FleetTrips';
import FleetExpenses from '@/pages/FleetExpenses';
import FleetPnL from '@/pages/FleetPnL';
import Accounting from '@/pages/Accounting';
import Invoices from '@/pages/Invoices';
import InvoiceDetail from '@/pages/InvoiceDetail';
import InvoiceForm from '@/pages/InvoiceForm';
import Clients from '@/pages/Clients';
import Brokers from '@/pages/Brokers';
import Vehicles from '@/pages/Vehicles';
import DataAnalysis from '@/pages/DataAnalysis';
import Documentation from '@/pages/Documentation';
import Notifications from '@/pages/Notifications';
import AdminSettings from '@/pages/AdminSettings';
import AdminUsers from '@/pages/AdminUsers';
import AdminVehicleTypes from '@/pages/AdminVehicleTypes';
import AdminStations from '@/pages/AdminStations';
import AdminLedger from '@/pages/AdminLedger';
import AdminPnL from '@/pages/AdminPnL';
import TripPnLForm from '@/pages/TripPnLForm';
import CompanyProfile from '@/pages/CompanyProfile';
import RequestAccess from '@/pages/RequestAccess';
import ComprehensiveDashboard from '@/pages/ComprehensiveDashboard';
import FleetODOTracking from '@/pages/FleetODOTracking';
import ClientAccounts from '@/pages/ClientAccounts';
import GeneralLedger from '@/pages/GeneralLedger';
import BankAccounts from '@/pages/BankAccounts';
import HRPayroll from '@/pages/HRPayroll';
import Employees from '@/pages/Employees';
import AttendancePage from '@/pages/AttendancePage';
import PayrollPage from '@/pages/PayrollPage';
import VendorAccounts from '@/pages/VendorAccounts';
import BrokerAccounts from '@/pages/BrokerAccounts';
import DriverAccounts from '@/pages/DriverAccounts';
import ConfirmLoad from '@/pages/ConfirmLoad';
import BiltyForm from '@/pages/BiltyForm';
import TripCostCalculator from '@/pages/TripCostCalculator';
import LabourEntry from '@/pages/LabourEntry';
import LabourAnalytics from '@/pages/LabourAnalytics';
import LabourLedger from '@/pages/LabourLedger';
import Assets from '@/pages/Assets';
import BalanceSheet from '@/pages/BalanceSheet';
import EmployeeAdvance from '@/pages/EmployeeAdvance';
import EmployeeBonus from '@/pages/EmployeeBonus';
import EmployeeLedger from '@/pages/EmployeeLedger';
import FleetMaintenance from '@/pages/FleetMaintenance';
import FuelRateManager from '@/pages/FuelRateManager';
import GPSTracking from '@/pages/GPSTracking';
import MaintenanceAnalytics from '@/pages/MaintenanceAnalytics';
import MaintenancePredictions from '@/pages/MaintenancePredictions';
import MonthlyClosing from '@/pages/MonthlyClosing';
import ProfitLoss from '@/pages/ProfitLoss';
import Reports from '@/pages/Reports';
import TrialBalance from '@/pages/TrialBalance';
import Vendors from '@/pages/Vendors';
import CashbookManager from '@/pages/CashbookManager';
import CashFlowDashboard from '@/pages/CashFlowDashboard';
import DecisionDashboard from '@/pages/DecisionDashboard';
import UserGuide from '@/pages/UserGuide';
import ChartOfAccounts from '@/pages/ChartOfAccounts';
import ExpenseMasterLedger from '@/pages/ExpenseMasterLedger';
import OwnFleetLedger from '@/pages/OwnFleetLedger';
import FleetInstallments from '@/pages/FleetInstallments';
import FleetDocs from '@/pages/FleetDocs';
import FuelAnalytics from '@/pages/FuelAnalytics';
import SavedTripExpenses from '@/pages/SavedTripExpenses';
import DocumentVault from '@/pages/DocumentVault';
import NotFound from '@/lib/PageNotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function P({ name, children }) {
  return <Layout currentPageName={name}>{children}</Layout>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <Router>
        <Routes>
          {/* Root */}
          <Route path="/"                          element={<P name="Dashboard"><Dashboard /></P>} />

          {/* Dashboard */}
          <Route path="/Dashboard"                 element={<P name="Dashboard"><Dashboard /></P>} />

          {/* Loads / Bilties */}
          <Route path="/Loads"                     element={<P name="Loads"><Loads /></P>} />
          <Route path="/LoadDetail"                element={<P name="LoadDetail"><LoadDetail /></P>} />
          <Route path="/LoadForm"                  element={<P name="LoadForm"><LoadForm /></P>} />
          <Route path="/ConfirmLoad"               element={<P name="ConfirmLoad"><ConfirmLoad /></P>} />
          <Route path="/BiltyForm"                 element={<P name="BiltyForm"><BiltyForm /></P>} />
          <Route path="/TripCostCalculator"        element={<P name="TripCostCalculator"><TripCostCalculator /></P>} />

          {/* Fleet */}
          <Route path="/Fleet"                     element={<P name="Fleet"><Fleet /></P>} />
          <Route path="/FleetTrips"                element={<P name="FleetTrips"><FleetTrips /></P>} />
          <Route path="/FleetExpenses"             element={<P name="FleetExpenses"><FleetExpenses /></P>} />
          <Route path="/FleetPnL"                  element={<P name="FleetPnL"><FleetPnL /></P>} />
          <Route path="/FleetODOTracking"          element={<P name="FleetODOTracking"><FleetODOTracking /></P>} />
          <Route path="/FleetMaintenance"          element={<P name="FleetMaintenance"><FleetMaintenance /></P>} />
          <Route path="/FleetInstallments"         element={<P name="FleetInstallments"><FleetInstallments /></P>} />
          <Route path="/FleetDocs"                 element={<P name="FleetDocs"><FleetDocs /></P>} />
          <Route path="/FuelAnalytics"             element={<P name="FuelAnalytics"><FuelAnalytics /></P>} />
          <Route path="/SavedTripExpenses"         element={<P name="SavedTripExpenses"><SavedTripExpenses /></P>} />
          <Route path="/GPSTracking"               element={<P name="GPSTracking"><GPSTracking /></P>} />
          <Route path="/FuelRateManager"           element={<P name="FuelRateManager"><FuelRateManager /></P>} />
          <Route path="/MaintenanceAnalytics"      element={<P name="MaintenanceAnalytics"><MaintenanceAnalytics /></P>} />
          <Route path="/MaintenancePredictions"    element={<P name="MaintenancePredictions"><MaintenancePredictions /></P>} />

          {/* Accounting */}
          <Route path="/Accounting"                element={<P name="Accounting"><Accounting /></P>} />
          <Route path="/Invoices"                  element={<P name="Invoices"><Invoices /></P>} />
          <Route path="/InvoiceDetail"             element={<P name="InvoiceDetail"><InvoiceDetail /></P>} />
          <Route path="/InvoiceForm"               element={<P name="InvoiceForm"><InvoiceForm /></P>} />
          <Route path="/GeneralLedger"             element={<P name="GeneralLedger"><GeneralLedger /></P>} />
          <Route path="/BankAccounts"              element={<P name="BankAccounts"><BankAccounts /></P>} />
          <Route path="/ClientAccounts"            element={<P name="ClientAccounts"><ClientAccounts /></P>} />
          <Route path="/VendorAccounts"            element={<P name="VendorAccounts"><VendorAccounts /></P>} />
          <Route path="/BrokerAccounts"            element={<P name="BrokerAccounts"><BrokerAccounts /></P>} />
          <Route path="/DriverAccounts"            element={<P name="DriverAccounts"><DriverAccounts /></P>} />
          <Route path="/ComprehensiveDashboard"    element={<P name="ComprehensiveDashboard"><ComprehensiveDashboard /></P>} />
          <Route path="/AdminLedger"               element={<P name="AdminLedger"><AdminLedger /></P>} />
          <Route path="/AdminPnL"                  element={<P name="AdminPnL"><AdminPnL /></P>} />
          <Route path="/TripPnLForm"               element={<P name="TripPnLForm"><TripPnLForm /></P>} />
          <Route path="/BalanceSheet"              element={<P name="BalanceSheet"><BalanceSheet /></P>} />
          <Route path="/ProfitLoss"                element={<P name="ProfitLoss"><ProfitLoss /></P>} />
          <Route path="/TrialBalance"              element={<P name="TrialBalance"><TrialBalance /></P>} />
          <Route path="/MonthlyClosing"            element={<P name="MonthlyClosing"><MonthlyClosing /></P>} />
          <Route path="/CashbookManager"           element={<P name="CashbookManager"><CashbookManager /></P>} />
          <Route path="/CashFlowDashboard"         element={<P name="CashFlowDashboard"><CashFlowDashboard /></P>} />
          <Route path="/DecisionDashboard"         element={<P name="DecisionDashboard"><DecisionDashboard /></P>} />
          <Route path="/ChartOfAccounts"           element={<P name="ChartOfAccounts"><ChartOfAccounts /></P>} />
          <Route path="/ExpenseMasterLedger"       element={<P name="ExpenseMasterLedger"><ExpenseMasterLedger /></P>} />
          <Route path="/OwnFleetLedger"            element={<P name="OwnFleetLedger"><OwnFleetLedger /></P>} />
          <Route path="/Assets"                    element={<P name="Assets"><Assets /></P>} />

          {/* HR */}
          <Route path="/HRPayroll"                 element={<P name="HRPayroll"><HRPayroll /></P>} />
          <Route path="/Employees"                 element={<P name="Employees"><Employees /></P>} />
          <Route path="/AttendancePage"            element={<P name="AttendancePage"><AttendancePage /></P>} />
          <Route path="/PayrollPage"               element={<P name="PayrollPage"><PayrollPage /></P>} />
          <Route path="/EmployeeAdvance"           element={<P name="EmployeeAdvance"><EmployeeAdvance /></P>} />
          <Route path="/EmployeeBonus"             element={<P name="EmployeeBonus"><EmployeeBonus /></P>} />
          <Route path="/EmployeeLedger"            element={<P name="EmployeeLedger"><EmployeeLedger /></P>} />

          {/* Labour */}
          <Route path="/LabourEntry"               element={<P name="LabourEntry"><LabourEntry /></P>} />
          <Route path="/LabourAnalytics"           element={<P name="LabourAnalytics"><LabourAnalytics /></P>} />
          <Route path="/LabourLedger"              element={<P name="LabourLedger"><LabourLedger /></P>} />

          {/* Master data */}
          <Route path="/Clients"                   element={<P name="Clients"><Clients /></P>} />
          <Route path="/Brokers"                   element={<P name="Brokers"><Brokers /></P>} />
          <Route path="/Vehicles"                  element={<P name="Vehicles"><Vehicles /></P>} />
          <Route path="/Vendors"                   element={<P name="Vendors"><Vendors /></P>} />

          {/* Utilities */}
          <Route path="/DataAnalysis"              element={<P name="DataAnalysis"><DataAnalysis /></P>} />
          <Route path="/Documentation"             element={<P name="Documentation"><Documentation /></P>} />
          <Route path="/Notifications"             element={<P name="Notifications"><Notifications /></P>} />
          <Route path="/Reports"                   element={<P name="Reports"><Reports /></P>} />
          <Route path="/UserGuide"                 element={<P name="UserGuide"><UserGuide /></P>} />


          {/* Admin */}
          <Route path="/AdminPanel"                element={<P name="AdminPanel"><AdminPanel /></P>} />
          <Route path="/AdminSettings"             element={<P name="AdminSettings"><AdminSettings /></P>} />
          <Route path="/AdminUsers"                element={<P name="AdminUsers"><AdminUsers /></P>} />
          <Route path="/AdminVehicleTypes"         element={<P name="AdminVehicleTypes"><AdminVehicleTypes /></P>} />
          <Route path="/AdminStations"             element={<P name="AdminStations"><AdminStations /></P>} />

          {/* Profile / Auth */}
          <Route path="/CompanyProfile"            element={<P name="CompanyProfile"><CompanyProfile /></P>} />
          <Route path="/RequestAccess"             element={<P name="RequestAccess"><RequestAccess /></P>} />

          {/* Legacy / alternate routes */}
          <Route path="/bilties"  element={<P name="Loads"><Loads /></P>} />
          <Route path="/Bilties"  element={<P name="Loads"><Loads /></P>} />

          {/* App Settings */}
          <Route path="/AppSettingsPage" element={<P name="AppSettingsPage"><AppSettingsPage /></P>} />

          {/* Document Vault */}
          <Route path="/DocumentVault" element={<P name="DocumentVault"><DocumentVault /></P>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="top-center" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;