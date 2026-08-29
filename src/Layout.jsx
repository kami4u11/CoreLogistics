import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Package, Truck, FileText, Users,
  Handshake, Menu, X, BarChart2, BookOpen, Calculator,
  Wrench, Gauge, Navigation, CreditCard, MapPin,
  Fuel, Shield, Bell, ChevronRight, Home, DollarSign, Sun, Moon, Settings2,
} from "lucide-react";
import { AppSettingsProvider, useAppSettings } from "@/components/AppSettings";
import { useRole } from "@/components/useRole";
import ODOReminder from "@/components/ODOReminder";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import GlobalSearch from "@/components/GlobalSearch";

const TMS_LOGO_FALLBACK = null; // No default image — show "TMS" text instead

// ── Pages that have their own top navbar (skip bottom bar) ────────────────────
const FLEET_PAGES = [
  "Fleet","FleetTrips","FleetExpenses","FleetPnL","FleetODOTracking",
  "FleetMaintenance","FleetDocs","FuelRateManager","GPSTracking",
  "FleetInstallments","OwnFleetLedger",
];
const ACCOUNTING_PAGES = [
  "Accounting","GeneralLedger","TrialBalance","BalanceSheet","ProfitLoss",
  "CashFlowDashboard","BankAccounts","ClientAccounts","BrokerAccounts",
  "DriverAccounts","VendorAccounts","AdminLedger","AdminPnL","MonthlyClosing",
  "ChartOfAccounts","ExpenseMasterLedger","CashbookManager",
];
const HIDE_BOTTOM_PAGES = [
  "LoadForm","ConfirmLoad","BiltyForm","InvoiceForm","AdminPanel",
  "AdminUsers","AdminVehicleTypes","AdminStations","AdminSettings",
  "TripPnLForm","CompanyProfile","DataAnalysis","RequestAccess",
  "ComprehensiveDashboard","ClientPortal",
  ...FLEET_PAGES,
];

// ── Bottom tab sets ───────────────────────────────────────────────────────────
const TABS_DEFAULT = [
  { page:"Dashboard",  icon:LayoutDashboard, label:"Home"     },
  { page:"Loads",      icon:Package,         label:"Loads"    },
  { page:"Fleet",      icon:Truck,           label:"Fleet"    },
  { page:"Accounting", icon:FileText,        label:"Accounts" },
];
const TABS_ACCOUNTING = [
  { page:"Accounting",        icon:Home,      label:"Accounts"  },
  { page:"GeneralLedger",     icon:BookOpen,  label:"Ledger"    },
  { page:"TrialBalance",      icon:BarChart2, label:"Trial Bal" },
  { page:"CashFlowDashboard", icon:FileText,  label:"Cash Flow" },
  { page:"ClientAccounts",    icon:Users,     label:"Clients"   },
];

// ── Side menu sections ────────────────────────────────────────────────────────
const SIDE_SECTIONS = [
  {
    title:"Loads & Bilties", color:"#3b82f6",
    items:[
      { page:"Loads",              icon:Package,      label:"Loads / Bilties"   },
      { page:"TripCostCalculator", icon:Calculator,   label:"Trip Cost Calc"    },
    ]
  },
  {
    title:"Fleet Pro", color:"#10b981",
    items:[
      { page:"Fleet",              icon:Truck,        label:"Fleet Hub"         },
      { page:"FleetTrips",         icon:Navigation,   label:"Fleet Trips"       },
      { page:"FleetExpenses",      icon:CreditCard,   label:"Fleet Expenses"    },
      { page:"FleetPnL",           icon:BarChart2,    label:"Fleet P&L"         },
      { page:"FleetMaintenance",   icon:Wrench,       label:"Maintenance"       },
      { page:"FleetODOTracking",   icon:Gauge,        label:"ODO & Fuel"        },
      { page:"FleetDocs",          icon:Shield,       label:"Fleet Documents"   },
      { page:"FuelRateManager",    icon:Fuel,         label:"Fuel Rates"        },
      { page:"GPSTracking",        icon:MapPin,       label:"GPS Tracking"      },
    ]
  },
  {
    title:"Accounting", color:"#7c3aed",
    items:[
      { page:"Accounting",         icon:FileText,     label:"Accounting"        },
      { page:"GeneralLedger",      icon:BookOpen,     label:"General Ledger"    },
      { page:"TrialBalance",       icon:BarChart2,    label:"Trial Balance"     },
      { page:"BalanceSheet",       icon:FileText,     label:"Balance Sheet"     },
      { page:"ProfitLoss",         icon:BarChart2,    label:"P&L Report"        },
      { page:"CashFlowDashboard",  icon:FileText,     label:"Cash Flow"         },
      { page:"BankAccounts",       icon:DollarSign,   label:"Bank Accounts"     },
      { page:"ClientAccounts",     icon:Users,        label:"Client Accounts"   },
      { page:"BrokerAccounts",     icon:Handshake,    label:"Broker Accounts"   },
      { page:"AdminLedger",        icon:BarChart2,    label:"Admin Ledger"      },
    ]
  },
  {
    title:"HR & Payroll", color:"#f59e0b",
    items:[
      { page:"HRPayroll",          icon:Users,        label:"HR & Payroll"      },
      { page:"Employees",          icon:Users,        label:"Employees"         },
      { page:"LabourLedger",       icon:BookOpen,     label:"Labour Ledger"     },
    ]
  },
  {
    title:"Master Data", color:"#0d9488",
    items:[
      { page:"Clients",            icon:Users,        label:"Clients"           },
      { page:"Brokers",            icon:Handshake,    label:"Brokers"           },
      { page:"Vehicles",           icon:Truck,        label:"Vehicles (Pool)"   },
      { page:"Vendors",            icon:Users,        label:"Vendors"           },
    ]
  },
  {
    title:"Reports & Tools", color:"#6b7280",
    items:[
      { page:"Dashboard",          icon:LayoutDashboard, label:"Dashboard"      },
      { page:"DataAnalysis",       icon:BarChart2,    label:"Data Analysis"     },
      { page:"Reports",            icon:FileText,     label:"Reports"           },
      { page:"DecisionDashboard",  icon:BarChart2,    label:"Decision Dash"     },
      { page:"Documentation",      icon:BookOpen,     label:"Documentation"     },
      { page:"Notifications",      icon:Bell,         label:"Notifications"     },
      { page:"AppSettingsPage",    icon:Settings2,    label:"Master Settings"   },
      { page:"DocumentVault",      icon:Shield,       label:"Document Vault"    },
    ]
  },
];

// ── Rainbow gradients for side drawer ────────────────────────────────────────
const RAINBOW_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#0ea5e9,#6366f1)",
  "linear-gradient(135deg,#ec4899,#f43f5e)",
];
const RAINBOW_BORDERS = ["#8b5cf6","#10b981","#a855f7","#f59e0b","#0ea5e9","#ec4899"];

// ── SIDE DRAWER ───────────────────────────────────────────────────────────────
function SideDrawer({ open, onClose, companyProfile, isAdmin }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:500}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)"}}/>
      <div style={{
        position:"absolute",left:0,top:0,bottom:0,width:300,
        background:"linear-gradient(180deg,#0a0f1e 0%,#0d1425 40%,#0a0e1a 100%)",
        borderRight:"1px solid rgba(255,255,255,0.06)",
        overflowY:"auto",display:"flex",flexDirection:"column",
        boxShadow:"4px 0 40px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{
          padding:"0 0 0",flexShrink:0,
          background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e3a5f 100%)",
          borderBottom:"1px solid rgba(255,255,255,0.08)",
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(139,92,246,0.2)",filter:"blur(20px)"}}/>
          <div style={{position:"absolute",bottom:-10,left:10,width:60,height:60,borderRadius:"50%",background:"rgba(16,185,129,0.15)",filter:"blur(16px)"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 18px 14px",position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:48,height:48,borderRadius:14,overflow:"hidden",border:"2px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 12px rgba(139,92,246,0.3)"}}>
                {companyProfile?.logo_url
                  ? <img src={companyProfile.logo_url} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.target.style.display="none";}}/>
                  : <span style={{fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.5px"}}>TMS</span>
                }
              </div>
              <div>
                <p style={{fontSize:13,fontWeight:800,color:"#fff",margin:0,lineHeight:1.2}}>{companyProfile?.company_name||companyProfile?.name||"TMS"}</p>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.45)",margin:"2px 0 0",fontWeight:500}}>Transport Management</p>
              </div>
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <X size={14} color="rgba(255,255,255,0.6)"/>
            </button>
          </div>
        </div>

        {/* Admin Panel quick button */}
        {isAdmin && (
          <div style={{padding:"10px 14px 0",flexShrink:0}}>
            <Link to={createPageUrl("AdminPanel")} onClick={onClose}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                background:"linear-gradient(135deg,#7c3aed,#6d28d9)",
                borderRadius:12,textDecoration:"none",
                border:"1px solid rgba(167,139,250,0.3)",
                boxShadow:"0 2px 12px rgba(124,58,237,0.4)",
              }}>
              <div style={{width:32,height:32,borderRadius:8,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <LayoutDashboard size={16} color="#fff" strokeWidth={2}/>
              </div>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:12,fontWeight:800,color:"#fff",lineHeight:1.2}}>Admin Dashboard</p>
                <p style={{margin:0,fontSize:9,color:"rgba(255,255,255,0.6)",fontWeight:500}}>Control Panel &amp; Analytics</p>
              </div>
              <ChevronRight size={13} color="rgba(255,255,255,0.4)"/>
            </Link>
          </div>
        )}

        {/* Nav sections */}
        <div style={{flex:1,padding:"12px 0 80px",overflowY:"auto"}}>
          {SIDE_SECTIONS.map((sec,si)=>{
            const grad = RAINBOW_GRADIENTS[si % RAINBOW_GRADIENTS.length];
            const border = RAINBOW_BORDERS[si % RAINBOW_BORDERS.length];
            return (
              <div key={sec.title} style={{marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 14px 6px"}}>
                  <div style={{background:grad,borderRadius:6,padding:"2px 10px",fontSize:9,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:"0.1em",boxShadow:`0 2px 8px ${border}40`}}>{sec.title}</div>
                  <div style={{flex:1,height:1,background:`linear-gradient(90deg,${border}40,transparent)`}}/>
                </div>
                {sec.items.map((item)=>(
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={onClose}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",textDecoration:"none",color:"rgba(255,255,255,0.7)",transition:"all 0.12s",borderLeft:`2px solid transparent`}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${border}15`;e.currentTarget.style.borderLeftColor=border;e.currentTarget.style.color="#fff";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderLeftColor="transparent";e.currentTarget.style.color="rgba(255,255,255,0.7)";}}>
                    <div style={{width:30,height:30,borderRadius:8,background:grad,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 6px ${border}50`,opacity:0.85}}>
                      <item.icon size={14} color="#fff" strokeWidth={2}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:600,flex:1}}>{item.label}</span>
                    <ChevronRight size={11} color="rgba(255,255,255,0.2)"/>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>

        {/* Logout */}
        <div style={{padding:"12px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0,background:"rgba(0,0,0,0.2)"}}>
          <button onClick={()=>base44.auth.logout()} style={{width:"100%",padding:"10px",background:"linear-gradient(135deg,#7f1d1d,#991b1b)",color:"#fca5a5",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(239,68,68,0.2)"}}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ── THEME TOGGLE BUTTONS ───────────────────────────────────────────────────────
function ThemeToggleButton() {
  const { isDark, toggleMode } = useTheme();
  return (
    <button
      onClick={toggleMode}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 10,
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff", cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
      }}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

// Small bottom-bar theme toggle
function ThemeBottomToggle() {
  const { isDark, toggleMode } = useTheme();
  return (
    <button onClick={toggleMode}
      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,padding:"5px 2px",background:"none",border:"none",cursor:"pointer"}}>
      {isDark ? <Sun size={20} strokeWidth={1.8} color="rgba(255,255,255,0.65)"/> : <Moon size={20} strokeWidth={1.8} color="rgba(255,255,255,0.65)"/>}
      <span style={{fontSize:9,fontWeight:500,color:"rgba(255,255,255,0.65)"}}>{isDark?"Light":"Dark"}</span>
    </button>
  );
}

// ── BOTTOM NAVBAR ─────────────────────────────────────────────────────────────
function BottomNav({ currentPageName, showLoads, showFleet, showAccounting, companyProfile, isAdmin }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isAccountingPage = ACCOUNTING_PAGES.includes(currentPageName);
  const baseTabs = isAccountingPage ? TABS_ACCOUNTING : TABS_DEFAULT;
  // Inject Admin Panel tab for admins on accounting pages
  const tabs = (isAccountingPage && isAdmin)
    ? [{ page:"AdminPanel", icon:LayoutDashboard, label:"Admin" }, ...baseTabs]
    : baseTabs;

  const visibleTabs = tabs.filter(t=>{
    if(t.page==="Loads"      && !showLoads)      return false;
    if(t.page==="Fleet"      && !showFleet)      return false;
    if(t.page==="Accounting" && !showAccounting) return false;
    return true;
  });

  const isActive = p => currentPageName === p;
  const isAccounting = isAccountingPage;

  const navStyle = {
    position:"fixed", bottom:0, left:0, right:0, zIndex:200,
    background:"linear-gradient(180deg,rgba(30,27,75,0.97) 0%,rgba(15,10,45,0.99) 100%)",
    backdropFilter:"blur(20px)",
    WebkitBackdropFilter:"blur(20px)",
    borderTop:"1px solid rgba(139,92,246,0.2)",
    paddingBottom:"env(safe-area-inset-bottom,0px)",
    boxShadow:"0 -4px 24px rgba(0,0,0,0.4)",
  };

  return (
    <>
      <SideDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} companyProfile={companyProfile} isAdmin={isAdmin}/>
      <div style={navStyle}>
        {isAccounting && <div style={{height:2,background:"linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed)"}}/>}
        <div style={{display:"flex",alignItems:"stretch",padding:"6px 0 8px"}}>
          {visibleTabs.map(tab=>{
            const active=isActive(tab.page);
            const activeColor = isAccounting ? "#a78bfa" : "#93c5fd";
            const inactiveColor = "rgba(255,255,255,0.65)";
            return(
              <Link key={tab.page} to={createPageUrl(tab.page)}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,padding:"5px 2px",textDecoration:"none",position:"relative"}}>
                {active&&<div style={{position:"absolute",top:-1,left:"50%",transform:"translateX(-50%)",width:28,height:2.5,borderRadius:99,background:activeColor,boxShadow:`0 0 8px ${activeColor}`}}/>}
                <tab.icon size={22} strokeWidth={active?2.5:1.8} color={active?activeColor:inactiveColor}/>
                <span style={{fontSize:9,fontWeight:active?800:500,color:active?"#fff":inactiveColor,letterSpacing:"0.03em"}}>{tab.label}</span>
              </Link>
            );
          })}
          <button onClick={()=>setDrawerOpen(true)}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,padding:"5px 2px",background:"none",border:"none",cursor:"pointer"}}>
            <Menu size={22} strokeWidth={1.8} color="rgba(255,255,255,0.65)"/>
            <span style={{fontSize:9,fontWeight:500,color:"rgba(255,255,255,0.65)"}}>More</span>
          </button>
          <ThemeBottomToggle />
        </div>
      </div>
    </>
  );
}

// ── MAIN LAYOUT ───────────────────────────────────────────────────────────────
function LayoutInner({ children, currentPageName }) {
  const [companyProfile, setCompanyProfile] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("company_profile")||"null");}catch{return null;}
  });
  const [profileDone, setProfileDone] = useState(false);

  const { isDark, palette } = useTheme();
  const { setCountry } = useAppSettings();
  const {
    user, loading:roleLoading,
    isAdmin, isManagement, isSleepingPartner,
    canSeeAccounting,
    isDriver, isFleetManager,
    isOperations, isAccounting,
    isClient, isGamer,
  } = useRole();
  const navigate = useNavigate();

  useEffect(()=>{
    if(roleLoading) return;
    if(profileDone) return;
    // Load company profile for all logged-in users
    base44.entities.CompanyProfile?.list()
      .then(ps=>{
        if(ps?.length>0){
          const active = ps.find(p=>p.is_active) || ps[0];
          localStorage.setItem("company_profile",JSON.stringify(active));
          setCompanyProfile(active);
        }
        setProfileDone(true);
      })
      .catch(()=>setProfileDone(true));
  },[roleLoading,profileDone]);

  useEffect(()=>{
    if(!roleLoading&&isClient&&user&&currentPageName!=="ClientAccounts")
      navigate(createPageUrl("ClientAccounts"),{replace:true});
  },[roleLoading,isClient,user,currentPageName,navigate]);

  const hideBottom = HIDE_BOTTOM_PAGES.includes(currentPageName);
  const showLoads        = !isDriver;
  const showFleet        = isAdmin||isManagement||isFleetManager||isAccounting||isOperations||isDriver||isSleepingPartner;
  const showAccounting   = canSeeAccounting;



  const appBg = isDark ? "#060b14" : "#f1f5f9";

  return (
    <div style={{minHeight:"100vh",background:appBg,transition:"background 0.3s"}}>
      <main style={{minHeight:"100vh", paddingBottom: hideBottom ? 0 : 68}}>
        {children}
      </main>

      <ODOReminder/>
      <GlobalSearch />

      {!hideBottom && (
        <BottomNav
          currentPageName={currentPageName}
          showLoads={showLoads}
          showFleet={showFleet}
          showAccounting={showAccounting}
          companyProfile={companyProfile}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <AppSettingsProvider>
      <LayoutInner currentPageName={currentPageName}>
        {children}
      </LayoutInner>
    </AppSettingsProvider>
  );
}