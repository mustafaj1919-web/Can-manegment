# MOBILE_API_MATRIX.md — Backend API Mapping Matrix for Enterprise Mobile Suite

This matrix maps every mobile experience role, module, and feature directly to the existing ASP.NET Core API endpoints without creating redundant endpoints.

---

## 1. Authentication & Session Security APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Employee Login | Auth Screen | `/api/Auth/login` | `POST` | Anonymous |
| Customer Login | Customer Auth | `/api/customer/auth/login` | `POST` | Anonymous |
| Google Sign-In | Customer Auth | `/api/customer/auth/google` | `POST` | Anonymous |
| Current Session Me | Session Restore | `/api/Auth/me` | `GET` | Authorized User |
| Switch Branch | Header / Settings | `/api/Auth/switch-branch` | `POST` | Authorized User |

---

## 2. Owner & Executive BI Mode APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Executive Dashboard KPIs | Executive Home | `/api/Dashboard` | `GET` | Owner, Admin, Accountant |
| AI Executive Summary Stats | Executive Feed | `/api/ai/dashboard` | `GET` | Owner, Admin, Accountant |
| Sales & Profitability Report | Executive Analytics | `/api/Reports/sales-profit` | `GET` | Owner, Admin, Accountant |
| Supplier Profitability | Executive Analytics | `/api/Reports/supplier-profitability` | `GET` | Owner, Admin, Accountant |
| Balance Sheet & Liquidity | Executive Analytics | `/api/Accounting/balance-sheet` | `GET` | Owner, Admin, Accountant |
| Inventory Valuation | Executive Analytics | `/api/Reports/inventory-valuation` | `GET` | Owner, Admin, Accountant |

---

## 3. Vehicle & Inventory Workspace APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Vehicle Catalog List | Inventory List | `/api/Inventory` | `GET` | All Employees |
| Vehicle Details | Inventory Detail | `/api/Inventory/{id}` | `GET` | All Employees |
| Public Vehicles List | Public Showroom | `/api/PublicVehicles` | `GET` | Anonymous |
| Public Vehicle Detail | Public Showroom | `/api/PublicVehicles/{id}` | `GET` | Anonymous |
| Search VIN / Vehicle | Camera Scanner | `/api/ai/inventory/search?query={vin}` | `GET` | All Employees |
| Add Vehicle Cost | Field Operations | `/api/Inventory/{id}/costs` | `POST` | Owner, Admin, Accountant |
| Change Vehicle Status | Inventory Detail | `/api/Inventory/{id}/status` | `POST` | Owner, Admin, Sales |

---

## 4. Sales & CRM Lead Workflow APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Sales Contracts List | Sales Home | `/api/Sales` | `GET` | Owner, Admin, Sales |
| Sale Contract Detail | Sale Detail | `/api/Sales/{id}` | `GET` | Owner, Admin, Sales |
| CRM Leads List | Leads Module | `/api/Crm/leads` | `GET` | Owner, Admin, Sales |
| Create CRM Lead | Leads Module | `/api/Crm/leads` | `POST` | Owner, Admin, Sales |
| Lead Activity Timeline | Lead Detail | `/api/Crm/leads/{id}/activities` | `GET` | Owner, Admin, Sales |
| Convert Lead to Sale | Sales Workflow | `/api/Customers/contracts` | `POST` | Owner, Admin, Sales |

---

## 5. Cashier, Installments & Receipts APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Installments List & Aging | Cashier Home | `/api/Installments` | `GET` | Cashier, Accountant, Admin |
| Overdue Installments | Cashier Alerts | `/api/Installments/overdue` | `GET` | Cashier, Accountant, Admin |
| Pay Installment | Cashier Workstation | `/api/Installments/{id}/pay` | `POST` | Cashier, Accountant, Admin |
| Payments Receipts List | Receipts Module | `/api/Payments` | `GET` | Cashier, Accountant, Admin |
| Add Purchase Payment | Field Operations | `/api/Purchases/{id}/payment` | `POST` | Accountant, Admin, Owner |

---

## 6. Customer Self-Service Mode APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| Customer Profile | Customer Profile | `/api/customer/me` | `GET` | Customer Token |
| Customer Dashboard | Customer Home | `/api/customer/dashboard` | `GET` | Customer Token |
| Customer Contracts | My Contracts | `/api/customer/contracts` | `GET` | Customer Token |
| Customer Installments | My Schedule | `/api/customer/installments` | `GET` | Customer Token |
| Customer Receipts | My Receipts | `/api/customer/receipts` | `GET` | Customer Token |

---

## 7. AI Assistant APIs

| Feature | Mobile Module | Backend Endpoint | HTTP Method | Auth Role Required |
| :--- | :--- | :--- | :--- | :--- |
| AI Dashboard Summary | AI Assistant | `/api/ai/dashboard` | `GET` | All Authorized Employees |
| AI Inventory Search | AI Assistant | `/api/ai/inventory/search` | `GET` | All Authorized Employees |
| AI Sales Summary | AI Assistant | `/api/ai/sales/summary` | `GET` | All Authorized Employees |
| AI Profitability Stats | AI Assistant | `/api/ai/profitability` | `GET` | Owner, Admin, Accountant |
| AI Overdue Installments | AI Assistant | `/api/ai/installments/overdue` | `GET` | All Authorized Employees |
| AI Log & Audit | AI Assistant | `/api/ai/log` | `POST` | All Authorized Employees |
