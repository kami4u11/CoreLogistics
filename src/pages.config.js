/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 *
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import Accounting from './pages/Accounting';
import AdminLedger from './pages/AdminLedger';
import AdminPanel from './pages/AdminPanel';
import AdminPnL from './pages/AdminPnL';
import AdminSettings from './pages/AdminSettings';
import AdminStations from './pages/AdminStations';
import AdminUsers from './pages/AdminUsers';
import AdminVehicleTypes from './pages/AdminVehicleTypes';
import Assets from './pages/Assets';
import AttendancePage from './pages/AttendancePage';
import BalanceSheet from './pages/BalanceSheet';
import BankAccounts from './pages/BankAccounts';
import BiltyForm from './pages/BiltyForm';
import BrokerAccounts from './pages/BrokerAccounts';
import Brokers from './pages/Brokers';
import ClientAccounts from './pages/ClientAccounts';
import Clients from './pages/Clients';
import CompanyProfile from './pages/CompanyProfile';
import ComprehensiveDashboard from './pages/ComprehensiveDashboard';
import ConfirmLoad from './pages/ConfirmLoad';
import Dashboard from './pages/Dashboard';
import DataAnalysis from './pages/DataAnalysis';
import Documentation from './pages/Documentation';
import DriverAccounts from './pages/DriverAccounts';
import EmployeeAdvance from './pages/EmployeeAdvance';
import EmployeeBonus from './pages/EmployeeBonus';
import EmployeeLedger from './pages/EmployeeLedger';
import Employees from './pages/Employees';
import Fleet from './pages/Fleet';
import FleetExpenses from './pages/FleetExpenses';
import FleetMaintenance from './pages/FleetMaintenance';
import FleetODOTracking from './pages/FleetODOTracking';
import FleetPnL from './pages/FleetPnL';
import FleetTrips from './pages/FleetTrips';
import FuelRateManager from './pages/FuelRateManager';
import GPSTracking from './pages/GPSTracking';
import GeneralLedger from './pages/GeneralLedger';
import HRPayroll from './pages/HRPayroll';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceForm from './pages/InvoiceForm';
import Invoices from './pages/Invoices';
import LabourAnalytics from './pages/LabourAnalytics';
import LabourEntry from './pages/LabourEntry';
import LabourLedger from './pages/LabourLedger';
import LoadDetail from './pages/LoadDetail';
import LoadForm from './pages/LoadForm';
import Loads from './pages/Loads';
import MaintenanceAnalytics from './pages/MaintenanceAnalytics';
import MaintenancePredictions from './pages/MaintenancePredictions';
import MonthlyClosing from './pages/MonthlyClosing';
import Notifications from './pages/Notifications';
import PayrollPage from './pages/PayrollPage';
import ProfitLoss from './pages/ProfitLoss';
import Reports from './pages/Reports';
import RequestAccess from './pages/RequestAccess';
import TrialBalance from './pages/TrialBalance';
import TripCostCalculator from './pages/TripCostCalculator';
import TripPnLForm from './pages/TripPnLForm';
import Vehicles from './pages/Vehicles';
import VendorAccounts from './pages/VendorAccounts';
import Vendors from './pages/Vendors';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Accounting": Accounting,
    "AdminLedger": AdminLedger,
    "AdminPanel": AdminPanel,
    "AdminPnL": AdminPnL,
    "AdminSettings": AdminSettings,
    "AdminStations": AdminStations,
    "AdminUsers": AdminUsers,
    "AdminVehicleTypes": AdminVehicleTypes,
    "Assets": Assets,
    "AttendancePage": AttendancePage,
    "BalanceSheet": BalanceSheet,
    "BankAccounts": BankAccounts,
    "BiltyForm": BiltyForm,
    "BrokerAccounts": BrokerAccounts,
    "Brokers": Brokers,
    "ClientAccounts": ClientAccounts,
    "Clients": Clients,
    "CompanyProfile": CompanyProfile,
    "ComprehensiveDashboard": ComprehensiveDashboard,
    "ConfirmLoad": ConfirmLoad,
    "Dashboard": Dashboard,
    "DataAnalysis": DataAnalysis,
    "Documentation": Documentation,
    "DriverAccounts": DriverAccounts,
    "EmployeeAdvance": EmployeeAdvance,
    "EmployeeBonus": EmployeeBonus,
    "EmployeeLedger": EmployeeLedger,
    "Employees": Employees,
    "Fleet": Fleet,
    "FleetExpenses": FleetExpenses,
    "FleetMaintenance": FleetMaintenance,
    "FleetODOTracking": FleetODOTracking,
    "FleetPnL": FleetPnL,
    "FleetTrips": FleetTrips,
    "FuelRateManager": FuelRateManager,
    "GPSTracking": GPSTracking,
    "GeneralLedger": GeneralLedger,
    "HRPayroll": HRPayroll,
    "InvoiceDetail": InvoiceDetail,
    "InvoiceForm": InvoiceForm,
    "Invoices": Invoices,
    "LabourAnalytics": LabourAnalytics,
    "LabourEntry": LabourEntry,
    "LabourLedger": LabourLedger,
    "LoadDetail": LoadDetail,
    "LoadForm": LoadForm,
    "Loads": Loads,
    "MaintenanceAnalytics": MaintenanceAnalytics,
    "MaintenancePredictions": MaintenancePredictions,
    "MonthlyClosing": MonthlyClosing,
    "Notifications": Notifications,
    "PayrollPage": PayrollPage,
    "ProfitLoss": ProfitLoss,
    "Reports": Reports,
    "RequestAccess": RequestAccess,
    "TrialBalance": TrialBalance,
    "TripCostCalculator": TripCostCalculator,
    "TripPnLForm": TripPnLForm,
    "Vehicles": Vehicles,
    "VendorAccounts": VendorAccounts,
    "Vendors": Vendors,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};