import React, { createContext, useContext } from "react";

export const COUNTRIES = {
  pakistan: {
    code: "pakistan",
    label: "Pakistan",
    currency: "PKR",
    symbol: "₨",
    taxLabel: "FBR / GST",
    weightUnit: "Tons",
    distanceUnit: "KM",
    complianceNote: "Federal Board of Revenue (FBR) documentation rules apply.",
    flag: "🇵🇰",
    requiredCompliance: ["NTN", "CNIC", "Vehicle Fitness Certificate", "Route Permit", "PTA"],
    documentTypes: ["Bilty / GR", "Delivery Receipt", "Gate Pass", "Weighment Slip", "LR Copy"],
    regulations: "FBR Sales Tax Act, Motor Vehicles Ordinance, NTRC Rules",
    vehicleCompliance: ["Vehicle Fitness Certificate (Annually)", "Route Permit", "Token Tax", "Third Party Insurance", "PTV/CPLC Clearance"],
    driverDocs: ["CNIC", "Professional Driving Licence (PDL)", "Medical Fitness Certificate", "Police Character Certificate"],
    docName: "Bilty",
    docNumberLabel: "Bilty No.",
    consignorLabel: "Consignor / Sender",
    consigneeLabel: "Consignee / Receiver",
    freightLabel: "Freight Charges",
    cities: [
      "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta",
      "Hyderabad", "Sialkot", "Gujranwala", "Sargodha", "Bahawalpur", "Sukkur", "Larkana",
      "Sheikhupura", "Jhang", "Rahim Yar Khan", "Gujrat", "Kasur", "Mardan", "Mingora",
      "Nawabshah", "Mirpur Khas", "Okara", "Sahiwal", "Chiniot", "Kotri", "Turbat", "Abbottabad",
      "Muzaffarabad", "Gilgit", "Hub", "Jacobabad", "Khuzdar", "Dera Ghazi Khan", "Dera Ismail Khan"
    ],
  },
};

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const settings = COUNTRIES.pakistan;

  const fmt = (amount) => {
    if (amount === undefined || amount === null || amount === "") return "";
    const n = Number(amount);
    // Remove unnecessary .00 — show decimals only if non-zero
    const formatted = n % 1 === 0 ? n.toLocaleString() : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${settings.symbol}${formatted}`;
  };

  const fmtK = (amount) => {
    if (!amount && amount !== 0) return `${settings.symbol}0`;
    const n = Number(amount);
    if (Math.abs(n) >= 1_000_000) return `${settings.symbol}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (Math.abs(n) >= 1_000) return `${settings.symbol}${(n / 1_000).toFixed(0)}K`;
    return `${settings.symbol}${n % 1 === 0 ? n.toLocaleString() : n.toFixed(0)}`;
  };

  return (
    <AppSettingsContext.Provider value={{
      country: "pakistan",
      setCountry: () => {},
      settings,
      fmt,
      fmtK,
    }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    return {
      country: "pakistan",
      settings: COUNTRIES.pakistan,
      fmt: (n) => { const v = Number(n||0); return `₨${v%1===0?v.toLocaleString():v.toFixed(2).replace(/\.00$/,"")}`; },
      fmtK: (n) => { const v=Number(n||0); if(Math.abs(v)>=1_000_000) return `₨${(v/1_000_000).toFixed(1).replace(/\.0$/,"")}M`; if(Math.abs(v)>=1_000) return `₨${(v/1_000).toFixed(0)}K`; return `₨${v}`; },
      setCountry: () => {},
    };
  }
  return ctx;
}