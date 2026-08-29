// ─── FULL DETAILED GUIDE DATA ────────────────────────────────────────────────
export const GUIDE_SECTIONS = [
  {
    id: "getstarted",
    icon: "Zap",
    color: "bg-yellow-50 text-yellow-700",
    badgeColor: "#f59e0b",
    title: "Getting Started — First-Time Setup",
    content: [
      {
        heading: "Step 1: Set Up Your Company Profile",
        body: `Before using the system, add your company profile so it appears on invoices, bilties and reports.

HOW TO DO IT:
1. Tap the ☰ (hamburger menu) at the bottom right
2. Go to "Master Settings" → tap "🏢 Companies" tab
3. Tap "+ Add Company" button (top right)
4. Fill in:
   • Company Name (e.g. "Saifran Logistics") ← REQUIRED
   • Legal Name (registered name)
   • Address, City, Phone, Email
   • NTN / Tax ID number
   • Bank Name, Account Number, IBAN
   • Country & Currency (select from dropdown)
5. Tap "Upload Logo" to add your company logo (PNG/JPG)
6. Tap "Save Company"
7. Tap "Set Active" on your company to make it the default

WHERE YOUR COMPANY PROFILE IS USED:
• Printed on every Bilty document
• Appears on all Invoices sent to clients
• Shows on reports and export headers`
      },
      {
        heading: "Step 2: Add Your Fleet Vehicles",
        body: `Add all your own vehicles to the system to track trips, expenses and P&L.

HOW TO DO IT:
1. Tap Fleet (truck icon) in the bottom navigation
2. Tap "+ Add Vehicle" button
3. Fill in required fields:
   • Vehicle Number (e.g. "KHI-1234") ← REQUIRED
   • Asset Name (e.g. "ISUZU FTR 2022")
   • Vehicle Type (Trailer, Container, etc.)
   • Driver Name and Driver Phone
4. Optional financial details:
   • Purchase Date and Purchase Price
   • If bought on installments: select "Instalments" for payment method
   • Enter: Down Payment, Financed Amount, Bank Name, Monthly EMI
5. Tap Save

EXAMPLE:
Vehicle Number: TMJ-864
Asset Name: HINO 700 Trailer 2021
Driver: Muhammad Akbar | Phone: 0312-0000000
Purchase Price: ₨4,500,000
Payment: Instalments | Monthly EMI: ₨120,000 × 36 months`
      },
      {
        heading: "Step 3: Add Your Clients",
        body: `Add your freight clients so you can book loads and create invoices for them.

HOW TO DO IT:
1. Tap ☰ menu → "Clients"
2. Tap "+ Add Client" button
3. Fill in:
   • Client Name ← REQUIRED (e.g. "Kohinoor Textile Mills")
   • Contact Person, Phone, Email
   • Address, City
   • Credit Limit (PKR) — optional payment limit
   • Payment Terms: Net 30 / Net 60 / COD etc.
4. Tap Save

EXAMPLE:
Client: Lucky Cement Ltd.
Contact: Mr. Farhan Ahmed | Phone: 0333-1234567
City: Karachi | Credit Limit: ₨5,000,000 | Terms: Net 30`
      },
      {
        heading: "Step 4: Invite Your Team",
        body: `Add your staff members to the app with appropriate roles.

HOW TO DO IT:
1. Go to ☰ menu → Master Settings → Admin Dashboard
2. Tap "Users" tab → "+ Invite User"
3. Enter their email address
4. Select their role:

AVAILABLE ROLES:
• admin — Full access, delete, user management
• management — All read/write except delete
• operations — Loads, clients, fleet view
• supervisor — Bilty updates, field operations
• accounting — Full finance module
• fleet_manager — Fleet hub, trips, expenses
• driver — Own vehicle and trips only
• labour_supervisor — Labour entries and ledger
• sleeping_partner — View-only everything

5. User receives email → creates account → sees their permitted modules

TIP: Start with admin (you), operations staff, fleet manager, then accounting. Drivers last.`
      },
      {
        heading: "Step 5: Set Up Bank Accounts & Cashbooks",
        body: `Set up your payment accounts before recording any transactions.

BANK ACCOUNTS:
1. Go to Accounting → Bank Accounts → "+ Add Account"
2. Enter: Bank Name (e.g. "HBL"), Account Number, IBAN, Branch
3. Set Opening Balance (your actual current balance)
4. Save

CASHBOOKS:
1. Go to Accounting → Cashbooks → "+ Add Cashbook"
2. Types: Office Cash / Petty Cash / Driver Cash / Other
3. Set Opening Balance and assign Custodian
4. Save

EXAMPLE SETUP:
Bank 1: HBL Current — Opening Balance ₨2,500,000
Bank 2: MCB Savings — Opening Balance ₨800,000
Cashbook 1: Office Cash — ₨50,000
Cashbook 2: Driver Cash Fund — ₨30,000

WHY: Every expense must reference a specific cashbook/bank. Without this, balances will be wrong.`
      },
    ]
  },
  {
    id: "overview",
    icon: "BookOpen",
    color: "bg-blue-50 text-blue-700",
    badgeColor: "#3b82f6",
    title: "System Overview & Navigation",
    content: [
      {
        heading: "What Does This App Do?",
        body: `This is a complete Transport Management System (TMS) for freight and logistics businesses.

OPERATIONS: Book loads, assign vehicles, track deliveries, print bilty documents
FLEET: Track every vehicle's trips, fuel, maintenance, documents and profitability
ACCOUNTING: Full double-entry bookkeeping, invoices, client/vendor accounts, payroll
HR: Employee records, attendance, monthly payroll, advances and bonuses
ANALYTICS: See which vehicles make money, which routes are profitable, who owes you

EXAMPLE DAY:
8:00 AM: Operations books 3 new loads for today's dispatch
9:00 AM: Fleet manager assigns vehicles and prints bilties
10:00 AM: Drivers depart — statuses updated to "In Transit"
2:00 PM: Accounting posts yesterday's payments received from clients
4:00 PM: Fleet manager records fuel expenses with receipt photos
6:00 PM: Admin reviews dashboard: 12 loads active, ₨450K outstanding receivables`
      },
      {
        heading: "Navigation — How to Get Around",
        body: `3 MAIN NAVIGATION AREAS:

1. BOTTOM NAVIGATION BAR (always visible):
   🏠 Home (Dashboard) | 📦 Loads | 🚛 Fleet | 📄 Accounts | ☰ More

2. SIDE DRAWER (tap ☰ "More"):
   • Loads & Bilties section (blue)
   • Fleet Pro section (green)
   • Accounting section (purple)
   • HR & Payroll section (amber)
   • Master Data section (teal)
   • Reports & Tools section (grey)
   • Admin Dashboard button (admin only)

3. CONTEXT-SENSITIVE BOTTOM BAR:
   When in Accounting, bottom bar changes to:
   [Accounts] [Ledger] [Trial Bal] [Cash Flow] [Clients]

GLOBAL SEARCH: Tap the search field on Dashboard to search loads, clients, vehicles instantly.

BACK BUTTON: Every sub-page has a ← back arrow (top left) to return to parent page.`
      },
      {
        heading: "Dashboard — Understanding the Home Screen",
        body: `The Dashboard shows different info based on your role.

FOR ADMIN/MANAGEMENT — top stat cards:
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Active   │ │Dispatched│ │ Revenue  │ │   Tons   │
│   14     │ │    8     │ │  ₨1.2M   │ │  285T    │
│ 32 total │ │In transit│ │ Billed   │ │  Moved   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
Second row: Fleet Vehicles | Invoice Revenue | Pending Balance

Below cards:
• Recent Loads — last 5 loads with status badges
• Fleet Alerts — vehicles needing attention
• Monthly trend chart — revenue vs costs last 6 months

Tap any card → jumps directly to that module.`
      },
      {
        heading: "Understanding Status Badges",
        body: `Status badges (colored labels) show the current state of any record throughout the app.

LOAD STATUSES:
🔵 Booked = Accepted, not yet dispatched
🟡 Loading = Vehicle at origin, cargo being loaded
🟠 In Transit = Moving to destination
🟢 Delivered = Arrived at destination, paperwork pending
✅ Completed = Fully done, ready to invoice
🔴 Cancelled = Cancelled (reason required)

FLEET VEHICLE STATUSES:
🟢 Available = Ready for a load
🔵 Active = At origin, loading
🟠 In Transit = Moving with cargo
🔧 Maintenance = In workshop
⚫ Inactive = Out of service

ACCOUNTING MONTH RULE:
Entries dated 1st–4th → counted in PREVIOUS month
Entry dated March 4 → counted in February's books
Entry dated March 5 → counted in March's books
This prevents month-end data being split between two months.`
      },
    ]
  },
  {
    id: "loads",
    icon: "Package",
    color: "bg-green-50 text-green-700",
    badgeColor: "#10b981",
    title: "Loads & Bilties — Full Guide",
    content: [
      {
        heading: "Creating a New Load (Bilty)",
        body: `One load = one bilty document = one freight booking.

STEP-BY-STEP:
1. Tap 📦 Loads in bottom navigation
2. Tap green "+ New Load" button (top right)
3. Fill the Load Form:

PAYMENT TYPE:
• [TO PAY] — receiver pays at destination (most common)
• [PAID] — sender has already paid

BASIC INFO:
• Bilty No. — auto-generated (editable), e.g. "25-0302"
• Status — keep "Booked" for new loads
• Client — search and select (e.g. "Lucky Cement Ltd.")
• Receiver Name — who receives goods (blank = client)
• Broker — select if booked via broker

OWN FLEET toggle (blue box):
• Toggle ON if using your own vehicle
• Select from fleet list → system auto-creates a Fleet Trip

ROUTE & CARGO:
• Origin / Destination — select city or "Add New Station"
• Cargo: "Wheat Flour 50kg bags"
• Weight: 12.5 tons
• Loading Date / Delivery Date

FINANCIALS:
• Freight Amount = what client pays YOU: ₨85,000
• Broker/Hired Amount = what you pay the truck owner
• Labor Charges = loading/unloading labor
• Advance = deposit already received
• Balance = auto-calculated (Freight − Advance)

4. Tap "Create Bilty" → saved!

EXAMPLE COMPLETE LOAD:
Bilty: 25-0401 | Client: Lucky Cement Ltd.
Route: Karachi → Lahore | Cargo: OPC Cement, 24 tons
Freight: ₨125,000 TO PAY | Labor: ₨3,500`
      },
      {
        heading: "Printing a Bilty Document",
        body: `The Bilty is the legal shipping document that travels with the cargo.

FROM LOAD FORM:
• Tap "Preview Bilty" button (orange, top right)
• Bilty preview opens → Tap "Print Bilty"
• Browser print dialog → select printer or "Save as PDF"

WHAT APPEARS ON THE BILTY:
• Your company name, address, phone, logo (from Company Profile)
• Bilty number, date
• Consignor (sender) full name & address
• Consignee (receiver) full name & address
• Vehicle number, driver name
• Cargo description, weight, packages
• Freight amount and payment type (TO PAY / PAID)
• Signature boxes for sender and receiver

PRINT TIPS:
• Print 2 copies: original for receiver, copy stays with driver
• System prints in full color (logo, gradients preserved)
• Use Chrome browser for best print results
• Alternative formats also available: BOL (Bill of Lading), CMR (international)`
      },
      {
        heading: "Tracking & Updating Load Status",
        body: `Update status as the load progresses through its journey.

STATUS FLOW: Booked → Loading → In Transit → Delivered → Completed
(Any can go to Cancelled with reason)

HOW TO UPDATE:
1. Tap Loads → find the load
2. Open load card
3. Tap status badge at top
4. Select new status
5. Add notes if needed
6. Save → all linked parties notified

STATUS GUIDE:
[Booked] → Booking accepted, vehicle not yet dispatched
[Loading] → Vehicle arrived at origin, loading underway
             → Supervisor confirms cargo loaded, bilty signed
[In Transit] → Vehicle departed with cargo
              → Note departure time: "Departed 09:45 AM"
[Delivered] → Cargo received at destination
              → Collect signed delivery receipt from consignee
[Completed] → All paperwork done, ready to invoice
             → This status triggers invoice generation

WHO CAN UPDATE: Supervisor, Operations, Management, Admin

TIP: Give supervisors app access so they update status in real-time from the field — no calling the office needed.`
      },
      {
        heading: "Trip Cost Calculator — Quick Profit Check",
        body: `Before quoting a freight rate, verify you're making a profit.

HOW TO ACCESS: ☰ More menu → Trip Cost Calculator

HOW TO USE:
1. Enter: Origin, Destination, Distance (KM)
2. Enter freight income: ₨95,000
3. Fill in estimated costs:
   • Fuel: auto-fills from latest fuel rate × (distance ÷ avg KM/L)
   • Driver Allowance, Toll, Broker Commission, Labor
4. System shows instantly:
   • Total Costs: ₨68,500
   • Net Profit: ₨26,500
   • Profit Margin: 27.9%

EXAMPLE:
Route: Karachi → Lahore (1,350 KM)
Charged to Client: ₨125,000
Fuel (15 KM/L, ₨320/L): ₨28,800
Driver Allowance: ₨5,000 | Toll: ₨3,200
Broker (3%): ₨3,750 | Labor: ₨4,500
Total Cost: ₨45,250 | Net Profit: ₨79,750 (63.8% margin)

TIP: Save routes as templates (Fleet → Saved Templates) so costs auto-fill next time.`
      },
      {
        heading: "Bulk Upload — Importing Historical Data",
        body: `Import all existing load data from Excel at once.

STEP 1 — Prepare your Excel file:
Column headers (row 1): client_name | origin | destination | vehicle_number | freight_amount | loading_date | status
One load per row. Dates: YYYY-MM-DD. Amounts as numbers only (no ₨ symbol).

EXAMPLE ROW:
Lucky Cement | Karachi | Lahore | KHI-123 | 125000 | 2025-01-15 | completed

STEP 2 — Upload:
• Loads → Tap "Bulk" button → upload Excel/CSV file
• AI reads and maps your columns automatically
• Review the column mapping — fix any mismatches

STEP 3 — Review & Import:
• Preview first 10 rows → verify data looks correct
• Tap "Upload All" → system imports all rows
• Failed rows shown with error reason
• Fix failed rows → re-upload those rows only (no duplicates)

COMMON ERRORS:
• Merged cells → unmerge all before upload
• Currency symbols in amounts → remove ₨ and commas
• Wrong date format → use YYYY-MM-DD`
      },
    ]
  },
  {
    id: "fleet",
    icon: "Truck",
    color: "bg-purple-50 text-purple-700",
    badgeColor: "#7c3aed",
    title: "Fleet Management — Full Guide",
    content: [
      {
        heading: "Fleet Hub — Overview Page",
        body: `Command center for all your vehicles.

HOW TO REACH: Tap 🚛 Fleet in bottom navigation

TOP KPI CARDS (4 across):
• Active Vehicles — on a trip right now
• This Month Revenue — all trip income combined
• This Month Expenses — all costs combined
• Net Profit — Revenue minus Expenses

VEHICLE CARDS (one per vehicle):
• Vehicle number + asset name
• Status badge: Available / Active / In Transit / Maintenance
• Driver name | Quick stats: trips, revenue, expenses, profit this month

FLEET SUB-PAGES (top tabs):
• Fleet Trips — trip income and expenses
• Fleet Expenses — non-trip workshop bills, tyres, etc.
• Fleet P&L — profitability analysis
• ODO & Fuel — odometer and fuel tracking
• Maintenance — service records
• Fleet Docs — certificates and compliance
• Installments — EMI payment tracking`
      },
      {
        heading: "Recording Fleet Trips (Income + Expenses per Trip)",
        body: `Every vehicle trip should be recorded to track profitability.

STEPS:
1. Fleet Hub → Fleet Trips → "+ Add Trip"
2. Select Vehicle (e.g. TMJ-864), Driver Name auto-fills
3. Trip Date, Type (Local/Intercity), Origin → Destination, Client Name

INCOME:
• Freight Income: ₨125,000 ← what YOU earned on this trip
• Loading Charges: ₨2,500 (if you charge for loading)
• Detention Charges: ₨5,000 (if vehicle was delayed)

EXPENSES:
• Fuel Cost: ₨28,800 | Driver Allowance: ₨5,000
• Toll Charges: ₨3,200 | Loading Expense: ₨2,000
• Broker Commission: ₨3,750 | Road Repair: ₨0

AUTO-CALCULATED AT BOTTOM:
Total Revenue: ₨132,500
Total Expense: ₨43,250
Net Profit: ₨89,250 ✓

4. Upload receipt photos (📎 Receipt button)
5. Tap Save Trip

NOTE: If load was booked as "Own Fleet" in Loads, a trip is auto-created. Just add expense details.`
      },
      {
        heading: "Fleet Expenses — Non-Trip Costs",
        body: `Workshop bills, tyre replacement, registration renewal — not tied to one trip.

HOW TO ADD:
1. Fleet Expenses → "+ Add Expense"
2. Vehicle: TMJ-864 | Date | Expense Type (see below) | Amount (₨)
3. Description: "Replaced front tyres at Goodyear workshop, invoice #456"
4. Upload receipt photo ← IMPORTANT for audit
5. Approval Status:
   • Manager/Admin → set "Approved" → posts to P&L immediately
   • Operations staff → "Pending Approval" → manager must approve

EXPENSE TYPES:
tyre purchase, major repair, insurance, registration, fitness, route permit,
tax token, battery, body work, workshop labour, engine overhaul, gearbox,
overloading fine, parking fine, other major (specify in description)

APPROVAL WORKFLOW:
Operations staff submit → Manager sees banner "3 expenses awaiting approval"
→ Reviews each → Approves (posts to P&L) or Rejects with reason`
      },
      {
        heading: "ODO & Fuel Tracking",
        body: `Track odometer readings and fuel fill-ups to calculate efficiency.

HOW TO ADD:
1. Fleet Hub → ODO & Fuel → "+ Add Entry"
2. Vehicle | Date | Month
3. Entry Type:
   • ODO + Fuel (RECOMMENDED) — record both
   • ODO Only — just odometer
   • Fuel Only — just fuel purchased
4. Odometer Reading: 45,230 KM
5. Fuel Added: 180 litres
6. Rate Per Litre: ₨320/L (auto-fills from Fuel Rate Manager)
7. Cost: 180 × ₨320 = ₨57,600 (auto-calculated)
8. Notes: "Filled at PSO Hyderabad bypass"
9. Save

MONTHLY SUMMARY:
TMJ-864 — March 2025:
Start: 44,120 KM | End: 46,680 KM | Distance: 2,560 KM
Total Fuel: 195 litres | Avg Rate: ₨318/L | Cost: ₨61,990
Efficiency: 13.1 KM/L ← good for heavy truck

ALERT: ODO Reminder popup appears if vehicle hasn't had entry in 7+ days.`
      },
      {
        heading: "Fleet P&L — Reading Profitability Reports",
        body: `See exactly how much profit each vehicle generates.

HOW TO REACH: Fleet Hub → Fleet P&L

WHAT YOU SEE:
Summary: Total Revenue ₨1,850,000 | Expenses ₨1,240,000 | Profit ₨610,000 | Margin 33.0%

Per-Vehicle Table:
Vehicle  | Trips | Revenue   | Expenses  | Profit    | Margin
TMJ-864  |  8    | ₨680,000 | ₨420,000 | ₨260,000 | 38.2%
ABC-777  |  6    | ₨510,000 | ₨380,000 | ₨130,000 | 25.5%
KHI-123  |  5    | ₨390,000 | ₨290,000 | ₨100,000 | 25.6%

HOW TO USE:
1. Select Month from dropdown (default = current)
2. View summary → per vehicle breakdown
3. Tap any vehicle row → see individual trips
4. Export → CSV/Excel | Print → color report

RED FLAGS:
• Margin below 15% → barely profitable
• Negative profit → vehicle is losing money
• Sudden expense spike → check what happened that month`
      },
      {
        heading: "Fleet Documents & Installments",
        body: `FLEET DOCUMENTS (Expiry Tracking):
Fleet Hub → Fleet Docs → "+ Add Document"
Types: Registration, Insurance, Fitness, Route Permit, Tax Token, PFA
Enter: Doc Number, Issue Date, Expiry Date
Upload: PDF or photo of the document
Alert Days: 30 (warns 30 days before expiry)

System auto-marks: Valid / Expiring Soon / Expired

FLEET INSTALLMENTS (EMI Tracking):
Fleet Hub → Installments → Select vehicle

EXAMPLE SCHEDULE:
TMJ-864 | Financed: ₨3,600,000 | EMI: ₨120,000 × 30 months

No.| Due Date   | Amount    | Status
1  | 2025-01-01 | ₨120,000 | ✅ Paid
2  | 2025-02-01 | ₨120,000 | ✅ Paid
3  | 2025-03-01 | ₨120,000 | ✅ Paid
4  | 2025-04-01 | ₨120,000 | ⏳ Pending

RECORDING PAYMENT:
Tap "Mark Paid" → enter Paid Date, Amount, Method (Bank/Cash/Cheque)
Status updates: Pending → Paid / Partial`
      },
    ]
  },
  {
    id: "accounting",
    icon: "FileText",
    color: "bg-indigo-50 text-indigo-700",
    badgeColor: "#6366f1",
    title: "Accounting & Finance — Full Guide",
    content: [
      {
        heading: "Accounting Hub Overview",
        body: `Financial control center for the entire business.

HOW TO REACH: Tap 📄 Accounts in bottom navigation

TOP KPI CARDS:
• Bank Balance: ₨3,450,000 (sum of all bank accounts)
• Cash Balance: ₨85,000 (sum of all cashbooks)
• Receivables: ₨2,100,000 (what clients owe you)
• Payables: ₨680,000 (what you owe vendors)

CHARTS:
• Monthly Revenue vs Expenses (6-month bar chart)
• Revenue breakdown by source (pie chart)
• Invoice status distribution

MODULE NAVIGATION (tap to jump):
Decision Intelligence → Decision Dashboard, Data Analysis
Financial Statements → P&L, Balance Sheet, Trial Balance, Cash Flow
Ledgers → General Ledger, Client/Vendor/Broker/Driver Accounts
Fleet Finance → Own Fleet Ledger, Fleet P&L, Expense Master Ledger
HR Finance → Payroll, Labour Ledger, Employee Ledger`
      },
      {
        heading: "General Ledger — Recording Every Transaction",
        body: `Double-entry bookkeeping: every transaction has TWO sides — Debit and Credit must balance.

COMMON PATTERNS:
1. Client pays freight: DEBIT Bank → CREDIT Freight Revenue
2. Pay fuel: DEBIT Fuel Expense → CREDIT Cash/Bank
3. Pay salary: DEBIT Salary Expense → CREDIT Bank/Cash
4. Advance received from client: DEBIT Bank → CREDIT Advance from Client
5. Vendor payment: DEBIT Accounts Payable → CREDIT Bank

HOW TO CREATE AN ENTRY:
1. Accounting → General Ledger → "+ New Entry"
2. Entry Type: Journal / Payment / Receipt / Contra / Salary
3. Account Type & Name: select from dropdown (e.g. "Freight Revenue")
4. Contra Account: the other side (e.g. "HBL Current Account")
5. Enter Debit or Credit amount
6. Payment Source: MANDATORY → which cashbook/bank?
7. Description: "Lucky Cement freight payment, Karachi-Lahore, Bilty 25-0315"
8. Reference: Invoice/load number
9. Save — posts immediately

EXAMPLE ENTRY:
Date: 2025-03-20 | Type: Receipt
Credit: Freight Revenue ₨125,000
Debit: HBL Current Account ₨125,000
Source: HBL Current | Ref: INV-2025-041

CORRECTING ERRORS (NEVER DELETE):
1. Find wrong entry → Tap "Reverse"
2. Enter reversal reason
3. System creates opposite entry (zeroes it out)
4. Post the correct entry separately`
      },
      {
        heading: "Client Accounts & Invoices",
        body: `Track what every client owes you and send them formal invoices.

CLIENT ACCOUNTS:
Accounting → Client Accounts → tap client name
See: Total Billed | Total Received | Balance Due | Last Payment

RECORDING A PAYMENT:
1. Tap client → "+ Record Payment"
2. Amount: ₨250,000 | Date | Mode: Bank Transfer
3. Bank Account: HBL Current | Ref: "TT from MCB, ref #123456"
4. Save → balance updates, accounting entry auto-posted

CLIENT LEDGER VIEW:
Date       | Description        | Debit    | Credit   | Balance
2025-01-15 | Invoice #041       | ₨125,000 |          | ₨125,000 DR
2025-02-01 | Payment received   |          | ₨125,000 | ₨0
2025-02-15 | Invoice #058       | ₨150,000 |          | ₨150,000 DR

CREATING AN INVOICE:
1. Invoices → "+ New Invoice" → Select Client
2. Add items: Description, Quantity, Rate, Tax (GST if applicable)
3. Set Due Date (e.g. Net 30: 30 days from invoice date)
4. Save → Download PDF → share via WhatsApp or email

INVOICE STATUS: Draft → Sent → Partial → Paid / Overdue`
      },
      {
        heading: "Financial Reports — Reading & Generating",
        body: `KEY REPORTS AND HOW TO USE THEM:

P&L STATEMENT (Accounting → P&L Report):
INCOME:
  Freight Revenue:     ₨2,850,000
  Other Income:        ₨85,000
  Total:               ₨2,935,000
EXPENSES:
  Fuel:                ₨420,000
  Driver Salaries:     ₨380,000
  Fleet Maintenance:   ₨165,000
  Total:               ₨1,070,000
NET PROFIT:            ₨1,865,000 (63.5% margin)

BALANCE SHEET (Accounting → Balance Sheet):
ASSETS: Cash ₨85K + Banks ₨3.45M + Receivables ₨2.1M + Fleet ₨18.5M = ₨24.1M
LIABILITIES: Payables ₨680K + Loans ₨3.24M = ₨3.92M
EQUITY: ₨20.2M (Assets = Liabilities + Equity ✓)

TRIAL BALANCE: Total Debits MUST equal Total Credits. If not, find the error before closing.

CASH FLOW DASHBOARD:
• 30-day daily cash position chart
• Current: Bank ₨3.45M + Cash ₨85K = ₨3.535M
• Expected inflows this week: ₨450,000
• Projected balance end of week: ₨3.805M`
      },
      {
        heading: "Monthly Closing Procedure",
        body: `Close books properly each month. WHO: Admin only. WHEN: 5th–10th of following month.

PRE-CLOSING CHECKLIST — complete ALL before closing:
☐ All loads: Completed or Cancelled status
☐ All fleet trips entered with income and expenses
☐ All fleet expenses posted and approved
☐ All vendor bills in General Ledger
☐ Payroll processed and marked Paid
☐ Labour charges posted to ledger
☐ Bank reconciliation done (app balance = bank statement)
☐ Physical cash count = cashbook balance
☐ Trial Balance: Total Debits = Total Credits ✓

CLOSING PROCEDURE:
1. Accounting → Monthly Closing → Select month
2. Run "Validation Report" → fix any flagged issues
3. Tap "Lock Period" → Confirm
4. Generate and save: P&L, Balance Sheet, Trial Balance

AFTER CLOSING:
• No new entries for that month (edit = locked)
• Reports are frozen and reliable for audit
• Admin can reopen if critical error found (all reopens are logged)`
      },
    ]
  },
  {
    id: "hr",
    icon: "Users",
    color: "bg-rose-50 text-rose-700",
    badgeColor: "#f43f5e",
    title: "HR & Payroll — Full Guide",
    content: [
      {
        heading: "Managing Employees",
        body: `Add and manage permanent staff records.

ADDING AN EMPLOYEE:
1. HR & Payroll → Employees → "+ Add Employee"
2. Fill in:
   • Full Name: Muhammad Usman Ali (REQUIRED)
   • Employee ID: EMP-001 | Designation: Ops Supervisor
   • Department: operations | Phone: 0312-1234567
   • CNIC | Date of Joining | Basic Salary: ₨45,000
   • Allowances: ₨8,000 | Deductions: ₨2,000
   • Payment Mode: Cash / Bank / Cheque

3. App Login Email → invite to app:
   • Enter email → Role auto-set from department
   • Tap "Invite" → email invitation sent
   • Employee logs in → sees their role's permitted pages

4. For Drivers: Assign Vehicle
   • Select vehicle: TMJ-864
   • Vehicle now shows this driver's name

STATUS: Active → Inactive / Resigned / Terminated (enter leave date + reason)
DO NOT DELETE — deactivate to keep payroll history.`
      },
      {
        heading: "Attendance Tracking",
        body: `Mark daily attendance for all employees.

HOW TO MARK:
1. HR → Attendance → Select Date
2. For each employee tap:
   ✅ Present | ❌ Absent | 🌓 Half Day | 🏖️ Leave | 🎉 Holiday
3. For Present: enter Check-In (09:00) and Check-Out (18:30) times
4. Overtime Hours: 1.5 (if worked beyond standard)
5. Add note: "Left early — doctor visit"
6. Save

MONTHLY SUMMARY:
HR → Attendance → Month tab → per employee table:
Employee         | Present | Absent | Half | Leave | OT Hrs
Muhammad Usman   |   22    |   2    |  1   |   1   |  5.5

This feeds directly into payroll calculation for salary deductions/overtime.

TIPS:
• Mark attendance daily — don't let it pile up
• Public holidays: mark "Holiday" for all staff on those dates
• Drivers/supervisors can mark their own if given app access`
      },
      {
        heading: "Processing Monthly Payroll",
        body: `Process and disburse salaries at month end.

STEP 1 — GENERATE:
1. HR → Payroll → "Generate Payroll" → Select Month
2. System auto-pulls all active employees and calculates:

EXAMPLE CALCULATION:
Basic Salary:              ₨45,000
Allowances:                ₨8,000
Overtime (5.5h × ₨250):   ₨1,375
Absent deduction (2d):    -₨3,000
EOBI:                     -₨2,000
Advance Recovery:         -₨5,000
NET PAYABLE:               ₨44,375

STEP 2 — REVIEW: Check each employee, add bonuses/deductions if needed.

STEP 3 — DISBURSE:
• Select payment mode per employee (Cash/Bank/Cheque)
• Tap "Mark as Paid"
• System auto-posts: DR Salary Expense → CR Bank/Cash

STEP 4 — PRINT PAYSLIPS:
"Print All Payslips" → individual formatted slip for each employee showing gross, deductions, net, payment method.`
      },
    ]
  },
  {
    id: "roles",
    icon: "Shield",
    color: "bg-slate-50 text-slate-700",
    badgeColor: "#64748b",
    title: "What Each Role Should Do Daily",
    content: [
      {
        heading: "Admin — Complete Daily Routine",
        body: `MORNING (8:00 – 9:00 AM):
1. Dashboard → check KPI cards: loads active? alerts?
2. Fleet Alerts section → expired docs? overdue maintenance?
3. Fleet Expenses → filter "Pending Approval" → approve/reject with reason
4. Notifications bell 🔔 → action any system alerts
5. Admin Panel → review yesterday's summary

DURING THE DAY:
• Approve pending advances or bonuses from HR
• Review expense disputes raised by staff
• Monitor load deliveries, follow up on delays
• Check any invoices that became overdue today

MONTHLY (first week of new month):
1. Verify Trial Balance: Debits = Credits
2. Run P&L and Balance Sheet
3. Lock previous month period
4. Review payroll before disbursement
5. Fleet P&L → identify underperforming vehicles`
      },
      {
        heading: "Operations Staff — Dispatch Workflow",
        body: `MORNING (8:00 AM):
1. Loads page → check "Booked" loads needing dispatch today
2. Fleet Hub → verify vehicles are available
3. For each load going out:
   a. Assign vehicle if not yet assigned
   b. Update status: Booked → Loading
   c. Print bilty → give to driver + confirm departure

DURING THE DAY:
• When cargo loaded and driver departing: Loading → In Transit (note departure time)
• When delivery confirmed: In Transit → Delivered (collect signed receipt)
• Create new loads as bookings come in

NEW LOAD CHECKLIST:
☐ Client selected | ☐ Route confirmed | ☐ Vehicle assigned
☐ Freight amount entered | ☐ Payment type set (TO PAY/PAID)
☐ Bilty printed | ☐ Driver has contact and address
☐ Status set to "Loading" before departure`
      },
      {
        heading: "Accounting Staff — Finance Tasks",
        body: `MORNING (9:00 AM):
1. Cash Flow Dashboard → review current balances
2. General Ledger → review auto-posted entries from yesterday
3. Flag any entries needing manual verification

DAILY TASKS:
Record client payments received:
→ Client Accounts → client → "+ Record Payment"
→ Amount, date, bank account → Save (auto-posts to ledger)

Record vendor bills:
→ General Ledger → New Entry → Expense type
→ Contra: Bank/Cash | Add receipt attachment

WEEKLY:
• Aging report → follow up on 30+ day outstanding receivables
• Vendor payment schedule → any payments due this week?
• Payroll advances → any recovery due in payroll?

MONTHLY:
Bank reconciliation → ALL accounts
Physical cash count → vs cashbooks
Payroll processing → Trial Balance → P&L + Balance Sheet + Cash Flow`
      },
      {
        heading: "Fleet Manager & Driver Routines",
        body: `FLEET MANAGER — MORNING:
1. Fleet Hub → all vehicle statuses
2. Any 🔴 Overdue maintenance? → schedule workshop
3. Any documents expiring within 30 days? → initiate renewal
4. Confirm today's vehicles are road-ready

FLEET MANAGER — DAILY:
For each completed trip:
• Fleet Trips → add expense details (fuel, toll, allowance)
• Upload receipt photos
• ODO & Fuel → add odometer reading

For workshop visits:
• Update vehicle status to "Maintenance"
• Fleet Maintenance → Log Service → upload invoice
• After repair → status back to "Available"

DRIVER — DAILY WORKFLOW:
1. Check app → view assigned trip details
2. Confirm vehicle ready → depart on time
3. Log fuel fill-up: ODO & Fuel → add entry
4. Report any expenses immediately with receipt photo
5. Confirm delivery with notes in trip
6. Return unused advance cash at end of trip

DRIVER RULES:
• Report ALL expenses same day with receipt photos
• No spending company money without prior approval
• Report accidents/breakdowns IMMEDIATELY by phone
• Delayed expense reporting = no next trip advance`
      },
    ]
  },
  {
    id: "reports",
    icon: "BarChart2",
    color: "bg-teal-50 text-teal-700",
    badgeColor: "#0d9488",
    title: "Reports & Analytics — Deriving Insights",
    content: [
      {
        heading: "Decision Dashboard — Strategic Insights",
        body: `HOW TO REACH: ☰ Menu → Decision Dashboard

WHAT IT SHOWS AND HOW TO USE:

1. PROFIT PER VEHICLE:
TMJ-864: ₨260,000 profit (38.2%) ← TOP PERFORMER
ABC-777: ₨130,000 profit (25.5%)
KHI-123: -₨15,000 LOSS ← PROBLEM
Action: Investigate KHI-123 — high maintenance? Low utilization?

2. TOP PROFITABLE ROUTES:
Karachi→Lahore: 8 trips, avg profit ₨62,000/trip
Action: Ensure enough vehicles available for this route.

3. TOP CLIENTS BY REVENUE:
Lucky Cement: ₨850,000/month, 42% margin ← VIP CLIENT
Action: Never delay Lucky Cement loads. Assign best vehicles.

4. OVERDUE RECEIVABLES:
Kohinoor Textile: ₨280,000 overdue 45 days
Action: Call today. Consider stopping new loads until paid.

5. EXPENSE BREAKDOWN PIE:
Fuel 34% | Salaries 29% | Maintenance 18% | Others 19%
Action: Fuel is highest — check efficiency, watch for fuel theft.`
      },
      {
        heading: "How to Generate & Use Reports",
        body: `DAILY REPORTS:
→ Cash Flow Dashboard: current balances and today's transactions
→ Pending Loads: Loads page filtered by "In Transit" status

WEEKLY REPORTS:
→ Aging (Client Accounts): filter by balance > ₨0, sort by days overdue
→ Fleet Expenses pending: filter "Pending Approval"
→ Trip Profit Summary: Fleet P&L → current month → per-vehicle table

MONTHLY REPORTS (run 5th–10th):
→ P&L Statement: Accounting → P&L Report
→ Balance Sheet: Accounting → Balance Sheet
→ Trial Balance: Accounting → Trial Balance
→ Fleet P&L: Fleet Hub → Fleet P&L → full month
→ Payroll Summary: HR → Payroll → print all payslips

EXPORTING DATA:
Every table's Export button gives: CSV | Excel (.xlsx) | PDF
Every page's Print button: formatted color report with company header

HOW TO CHECK THIS MONTH'S PROFIT:
1. Accounting → P&L Report → Select current month
2. Look at "Net Profit" at bottom
3. Compare with previous months using the comparison view
4. If profit down → which expense category went up?
5. Tap that expense line → see detailed breakdown`
      },
    ]
  },
  {
    id: "tips",
    icon: "Star",
    color: "bg-emerald-50 text-emerald-700",
    badgeColor: "#10b981",
    title: "Critical Rules & Time-Saving Tips",
    content: [
      {
        heading: "RULE #1: Always Specify Payment Source",
        body: `Every expense or payment MUST specify where money came from.

BAD: "Paid ₨28,000 for fuel" — WHERE from? Which account?
GOOD: "Paid ₨28,000 for fuel — from: Office Cash"
GOOD: "Paid ₨28,000 for fuel — from: HBL Current Account"

HOW TO SET: In any payment entry, "Payment Source" field (mandatory):
• Cash payment → select the cashbook name
• Bank payment → select the bank account name

RESULT IF IGNORED:
→ Bank balance in app won't match real bank balance
→ Cashbook can't reconcile
→ Month-end closing becomes impossible
→ Auditors will question every unattributed payment`
      },
      {
        heading: "RULE #2: Upload Receipts for Every Expense",
        body: `Every fleet expense, vendor payment and advance must have a receipt.

FUEL RECEIPTS: photo of pump slip
WORKSHOP BILLS: photo of workshop invoice with stamp
TOLL TICKETS: photo of toll receipt
VENDOR INVOICES: scanned copy of printed invoice

HOW TO UPLOAD:
Fleet Expenses form → tap "Receipt Attachments" → camera/gallery → multiple photos allowed
Vendor bills → attach when creating General Ledger entry

DRIVER CASH RECEIPTS:
Drivers submit ALL receipts before next trip assignment.
Fleet manager reviews and uploads digitally.
No receipts = no next trip advance (strict policy).

WHY IT MATTERS:
• Tax authority requires documentation for all expenses
• Prevents expense fraud — every payment has paper trail
• Insurance claims — maintenance receipts support claims
• Dispute resolution — verify driver fuel claims`
      },
      {
        heading: "RULE #3: Never Delete — Always Reverse Accounting Entries",
        body: `Accounting entries cannot be deleted. This is by design to protect integrity.

IF YOU MADE AN ERROR:
1. General Ledger → find the wrong entry
2. Tap "Reverse" button
3. Enter reason: "Wrong amount, should be ₨25,000 not ₨52,000"
4. System creates opposite entry (zeroes it out)
5. Post the CORRECT entry separately
6. All 3 entries remain visible with notes

EXAMPLE:
WRONG: Debit Fuel Expense ₨52,000 | Credit HBL ₨52,000
REVERSAL: Credit Fuel Expense ₨52,000 | Debit HBL ₨52,000
CORRECT: Debit Fuel Expense ₨25,000 | Credit HBL ₨25,000

WHY: Tax law requires complete audit trail. Deletion looks like financial manipulation. Auditors worldwide expect reversals, not deletions.`
      },
      {
        heading: "Time-Saving Tips & Shortcuts",
        body: `SAVED TRIP TEMPLATES:
Fleet → Saved Templates → "+ New Template"
Name: "Karachi to Lahore Standard"
Pre-fill: Fuel ₨28,000 | Driver ₨5,000 | Toll ₨3,200 | Labor ₨4,000
When creating trip → "Use Template" → all costs auto-filled (saves 5 min/trip)

GLOBAL SEARCH:
Dashboard search field → type load number, client name, or vehicle number
Instantly jumps to result — no page navigation needed

TRIP CALCULATOR OFFLINE:
Works without internet — useful for quoting clients in areas with poor signal

NOTIFICATIONS BELL 🔔:
Check daily. System generates alerts for:
• Overdue client payments (30+ days)
• Vehicle document expiring within 30 days
• Maintenance schedule overdue
• Pending expense approvals
• Fleet installment due dates

DATA ENTRY STANDARDS:
✅ Vehicle numbers: KHI-1234 (uppercase, hyphen, no spaces)
✅ Amounts: 125000 (no commas, no ₨ symbol)
✅ Dates: always use date picker, never type manually
✅ Client names: search first — avoid creating duplicates
✅ Descriptions: be specific → "Fuel for TMJ-864, KHI→LHR, 15-Mar-2025, PSO pump"
   not just "Fuel"`
      },
    ]
  },
  {
    id: "troubleshooting",
    icon: "AlertTriangle",
    color: "bg-orange-50 text-orange-700",
    badgeColor: "#f97316",
    title: "Troubleshooting & Common Questions",
    content: [
      {
        heading: "I can't see the Accounting module",
        body: `CAUSE: Your user role doesn't include accounting access.

WHO CAN SEE ACCOUNTING: Admin, Management, Accounting, Sleeping Partner

SOLUTION:
1. Contact your Admin
2. Ask them: Admin Panel → Users → find your account → change role to "accounting"
3. Log out and log back in
4. Accounting now appears in navigation`
      },
      {
        heading: "Trial Balance is not balancing",
        body: `SYMPTOM: Total Debits ≠ Total Credits

COMMON CAUSES:
1. Entry posted with only one side (debit without matching credit)
2. Opening balance entered incorrectly
3. Bulk import created unbalanced entries

DIAGNOSIS:
1. Trial Balance → download the report
2. Look for accounts with unexpected large balances
3. General Ledger → filter by that account
4. Find entries with no matching contra entry

FIX:
1. Find unbalanced entry → Reverse it
2. Re-post correctly with both sides
3. Re-run Trial Balance to verify it balances

DO NOT close the month until Trial Balance balances.`
      },
      {
        heading: "Bank balance in app doesn't match bank statement",
        body: `RECONCILIATION PROCESS:
1. Get bank statement from your bank (online banking)
2. Accounting → General Ledger → filter by bank account + date range
3. Go line by line through bank statement:
   → In both → ✓ no action
   → In statement but NOT in app → POST IT NOW
   → In app but NOT in statement → check (possibly uncleaned cheque, will appear next month)

COMMON MISSING ENTRIES:
• Bank charges (quarterly fee, SMS charges)
• Profit on savings accounts (income entry)
• Auto-debits (EMI/loan payments)
• Cheques issued but not yet cleared

After reconciliation, balances should match (except uncleaned cheques).`
      },
      {
        heading: "A load status can't be changed",
        body: `POSSIBLE REASONS:

1. WRONG ROLE: Status changes require Supervisor/Operations/Management/Admin
   SOLUTION: Contact Operations team to update

2. PERIOD LOCKED: Load's date falls in a locked accounting month
   SOLUTION: Admin unlocks the period temporarily

3. LOAD ALREADY CLOSED: Cancelled/Completed loads are locked
   SOLUTION: Admin changes status manually

4. MISSING REQUIRED FIELDS: Some transitions need specific data
   SOLUTION: Fill all required fields, then update status`
      },
      {
        heading: "How do I give a client access to see their shipments?",
        body: `CLIENT PORTAL SETUP:
1. Clients page → find the client → tap "Portal Access"
2. Enter client's email address → tap "Send Invitation"
3. Client receives email → creates password → logs in

WHAT CLIENTS SEE (only their own data):
• Their loads (all statuses with real-time updates)
• Their invoices and payment history
• Their account balance

WHAT CLIENTS CANNOT SEE:
• Other clients' data
• Financial details or fleet information
• Staff data or system settings

REVOKING ACCESS:
Clients page → Portal Access → "Revoke Access" next to their email`
      },
    ]
  },
];

// Section color map for PDF
const SECTION_COLORS = {
  getstarted:      { bg: "#f59e0b", dark: "#92400e", light: "#fffbeb", border: "#fde68a" },
  overview:        { bg: "#3b82f6", dark: "#1e3a5f", light: "#eff6ff", border: "#bfdbfe" },
  loads:           { bg: "#10b981", dark: "#064e3b", light: "#f0fdf4", border: "#bbf7d0" },
  fleet:           { bg: "#7c3aed", dark: "#4c1d95", light: "#f5f3ff", border: "#ddd6fe" },
  accounting:      { bg: "#6366f1", dark: "#312e81", light: "#eef2ff", border: "#c7d2fe" },
  hr:              { bg: "#f43f5e", dark: "#881337", light: "#fff1f2", border: "#fecdd3" },
  roles:           { bg: "#64748b", dark: "#1e293b", light: "#f8fafc", border: "#e2e8f0" },
  reports:         { bg: "#0d9488", dark: "#134e4a", light: "#f0fdfa", border: "#99f6e4" },
  tips:            { bg: "#10b981", dark: "#064e3b", light: "#f0fdf4", border: "#bbf7d0" },
  troubleshooting: { bg: "#f97316", dark: "#7c2d12", light: "#fff7ed", border: "#fed7aa" },
};

export function generatePrintHTML(role, sections) {
  const date = new Date().toLocaleString("en-PK", { dateStyle: "long", timeStyle: "short" });
  const totalTopics = sections.reduce((a, s) => a + s.content.length, 0);

  const sectionHTML = sections.map((s, si) => {
    const col = SECTION_COLORS[s.id] || SECTION_COLORS.overview;
    return `
<div class="section" style="page-break-inside:avoid;">
  <div class="section-header" style="background:linear-gradient(135deg,${col.dark},${col.bg});color:#fff;padding:14px 20px;border-radius:12px 12px 0 0;display:flex;align-items:center;gap:12px;">
    <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;">${["🚀","📖","📦","🚛","💰","👥","🛡️","📊","⭐","⚠️"][si] || "📌"}</div>
    <div>
      <div style="font-size:9px;font-weight:700;opacity:0.7;text-transform:uppercase;letter-spacing:0.1em;">Section ${si + 1} of ${sections.length}</div>
      <div style="font-size:15px;font-weight:900;margin-top:1px;">${s.title}</div>
    </div>
    <div style="margin-left:auto;background:rgba(255,255,255,0.2);border-radius:8px;padding:4px 10px;font-size:10px;font-weight:700;">${s.content.length} topics</div>
  </div>
  <div style="border:2px solid ${col.border};border-top:none;border-radius:0 0 12px 12px;overflow:hidden;">
    ${s.content.map((c, ci) => `
    <div class="topic" style="padding:16px 20px;border-bottom:1px solid ${col.border};background:${ci % 2 === 0 ? "#fff" : col.light};">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <div style="width:22px;height:22px;background:${col.bg};border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:10px;font-weight:900;margin-top:1px;">${ci + 1}</div>
        <h3 style="font-size:12px;font-weight:800;color:${col.dark};margin:0;line-height:1.4;">${c.heading}</h3>
      </div>
      <div style="margin-left:32px;">
        <p style="font-size:10.5px;color:#374151;margin:0;white-space:pre-line;line-height:1.7;">${c.body.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>
      </div>
    </div>`).join("")}
  </div>
</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TMS User Guide — ${new Date().toLocaleDateString()}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @page { margin: 12mm 10mm; size: A4; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.6; background: #fff; margin: 0; padding: 0; }

  /* Cover */
  .cover { min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f2744 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 40px; text-align: center; page-break-after: always; }
  .cover-badge { display: inline-block; background: rgba(255,255,255,0.15); color: #fff; padding: 8px 20px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-bottom: 28px; border: 1px solid rgba(255,255,255,0.25); letter-spacing: 0.05em; text-transform: uppercase; }
  .cover h1 { font-size: 36px; font-weight: 900; color: #fff; margin: 0 0 12px; line-height: 1.1; }
  .cover h2 { font-size: 16px; color: rgba(255,255,255,0.7); font-weight: 400; margin: 0 0 40px; }
  .cover-meta { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 16px; padding: 24px 32px; max-width: 480px; text-align: left; }
  .cover-meta p { font-size: 12px; color: rgba(255,255,255,0.8); margin: 6px 0; }
  .cover-meta strong { color: #fff; }
  .cover-stats { display: flex; gap: 24px; margin-top: 24px; justify-content: center; }
  .cover-stat { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 24px; text-align: center; }
  .cover-stat .num { font-size: 28px; font-weight: 900; color: #fff; }
  .cover-stat .lbl { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; font-weight: 600; letter-spacing: 0.08em; margin-top: 2px; }

  /* TOC */
  .toc { padding: 40px; page-break-after: always; }
  .toc-title { font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 6px; }
  .toc-sub { font-size: 12px; color: #64748b; margin: 0 0 28px; }
  .toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .toc-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
  .toc-num { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0; }
  .toc-info { flex: 1; }
  .toc-name { font-size: 11px; font-weight: 700; color: #1e293b; }
  .toc-count { font-size: 9px; color: #94a3b8; margin-top: 1px; }

  /* Sections */
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .topic:last-child { border-bottom: none !important; }

  /* Footer */
  .doc-footer { text-align: center; padding: 20px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 20px; }

  @media print {
    .cover { page-break-after: always; }
    .toc { page-break-after: always; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-badge">🚛 Transport Management System</div>
  <h1>Complete User Guide<br>& Procedures</h1>
  <h2>Step-by-step instructions for every role and module</h2>
  <div class="cover-meta">
    <p><strong>Role:</strong> ${(role || "All Roles").replace(/_/g, " ").toUpperCase()}</p>
    <p><strong>Generated:</strong> ${date}</p>
    <p><strong>Coverage:</strong> ${sections.length} modules · ${totalTopics} topics & procedures</p>
    <p><strong>Classification:</strong> Internal Use Only — Confidential</p>
  </div>
  <div class="cover-stats">
    <div class="cover-stat"><div class="num">${sections.length}</div><div class="lbl">Modules</div></div>
    <div class="cover-stat"><div class="num">${totalTopics}</div><div class="lbl">Topics</div></div>
    <div class="cover-stat"><div class="num">${sections.reduce((a,s)=>a+s.content.reduce((b,c)=>b+(c.body.match(/STEP|HOW TO|EXAMPLE/gi)||[]).length,0),0)}+</div><div class="lbl">Examples</div></div>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <h1 class="toc-title">📋 Table of Contents</h1>
  <p class="toc-sub">Click any section heading to jump directly to that module's instructions.</p>
  <div class="toc-grid">
    ${sections.map((s, i) => {
      const col = SECTION_COLORS[s.id] || SECTION_COLORS.overview;
      const emoji = ["🚀","📖","📦","🚛","💰","👥","🛡️","📊","⭐","⚠️"][i] || "📌";
      return `<div class="toc-item">
        <div class="toc-num" style="background:${col.bg};">${emoji}</div>
        <div class="toc-info">
          <div class="toc-name">${s.title}</div>
          <div class="toc-count">${s.content.length} topics</div>
        </div>
      </div>`;
    }).join("")}
  </div>
</div>

<!-- SECTIONS -->
${sectionHTML}

<!-- FOOTER -->
<div class="doc-footer">
  TMS Complete User Guide — Generated ${new Date().toLocaleDateString()} — ${totalTopics} topics across ${sections.length} modules — For internal use only
</div>

</body>
</html>`;
}