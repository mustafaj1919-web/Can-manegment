# MOBILE_ARCHITECTURE.md — Enterprise Mobile Suite Architecture

## 1. Executive Summary

This document defines the architectural blueprint for the **Enterprise Mobile Application Suite** of **شركة الأصدقاء لتجارة السيارات** (`v2-enterprise`).

The mobile app is built as a **Single Codebase, Role-Aware Mobile Application** (iOS & Android) that connects directly to the existing ASP.NET Core Enterprise backend without modifying core financial, permission, or accounting contracts.

---

## 2. Technology Stack

- **Framework**: React Native Expo (SDK 51+, Managed Workflow)
- **Language**: TypeScript (Strict Mode)
- **Routing & Navigation**: Expo Router v3 (File-based, Typed Routes, Role-Gated Layouts)
- **State Management**:
  - **Server State / Caching**: TanStack React Query v5
  - **Client Session State**: Zustand
- **Forms & Validation**: React Hook Form + Zod
- **Secure Storage**: Expo `SecureStore` (Hardware-encrypted storage for JWT & Session Key)
- **Biometric Security**: Expo `LocalAuthentication`
- **Camera & Scanning**: Expo `Camera` & `ImagePicker`
- **Icons & Styling**: Lucide React Native + Native Wind / Custom Enterprise Design Tokens (RTL-first)
- **Notifications**: Expo `Notifications` + Firebase Cloud Messaging (FCM)

---

## 3. Repository & Directory Structure

The mobile application is housed in `/mobile-app` with the following clean architecture:

```text
mobile-app/
├── app/                           # Expo Router File-Based Routing
│   ├── _layout.tsx                # Global Provider & Auth Gate
│   ├── (auth)/                    # Authentication Screens
│   │   ├── login.tsx              # Employee / Staff Login
│   │   └── customer-login.tsx     # Customer Self-Service Login
│   ├── (owner)/                   # Executive / Owner Role Shell
│   │   ├── index.tsx              # Executive BI Home
│   │   ├── analytics.tsx          # Advanced Business Analytics
│   │   ├── feed.tsx               # Smart AI Business Feed
│   │   └── approvals.tsx          # Executive Approvals
│   ├── (sales)/                   # Sales Role Shell
│   │   ├── index.tsx              # Sales Workstation & Leads
│   │   └── leads/                 # Lead Lifecycle Management
│   ├── (cashier)/                 # Cashier & Accountant Role Shell
│   │   ├── index.tsx              # Cashier Workstation & Collections
│   │   └── payment.tsx            # Installment Payment & Receipt
│   ├── (customer)/                # Customer Self-Service Shell
│   │   ├── index.tsx              # Customer Dashboard & Vehicle
│   │   ├── installments.tsx       # Installments Schedule & Progress
│   │   └── receipts.tsx           # Digital Receipts & PDFs
│   ├── scanner/                   # Camera VIN & QR Scanner Overlay
│   └── search/                    # Universal Enterprise Search
├── src/
│   ├── api/                       # API Integration Layer
│   │   ├── client.ts              # Axios Client with Secure Token Interceptor
│   │   ├── authApi.ts             # Auth Endpoints
│   │   ├── inventoryApi.ts        # Vehicle & VIN APIs
│   │   ├── customerApi.ts         # Customer & CRM APIs
│   │   ├── cashierApi.ts          # Payments & Installments APIs
│   │   ├── executiveApi.ts        # BI & Analytics APIs
│   │   └── aiApi.ts               # Gemini AI Assistant APIs
│   ├── components/                # UI Components
│   │   ├── ui/                    # Base Design System Components (Button, Card, Badge, Input)
│   │   ├── shared/                # Header, TabBar, SearchBar, StatusBadge, MetricCard
│   │   └── scanner/               # Camera Overlay & VIN Frame
│   ├── hooks/                     # Custom Hooks (useAuth, useRole, useScan, useSecureStorage)
│   ├── services/                  # Session & Biometrics Services
│   ├── store/                     # Zustand Auth & UI Stores
│   ├── theme/                     # Design System Tokens (Colors, Spacing, Typography)
│   └── utils/                     # Formatting (Currency IQD/USD, Date, VIN Validation)
```

---

## 4. Single Source of Truth Architecture

```mermaid
graph TD
    subgraph Mobile App (React Native Expo)
        Router[Expo Router / Role Gate]
        AuthStore[Zustand Session & SecureStore]
        ReactQuery[TanStack React Query Cache]
    end

    subgraph Backend Infrastructure (ASP.NET Core 8)
        API[API Gateway / Controllers]
        AuthService[Identity & JWT Service]
        AccountingEngine[Accounting & Reversal Engine]
        BranchIsolation[CurrentUserService Branch Isolation]
        AiEngine[AiController & Gemini Service]
    end

    subgraph Database Layer
        Postgres[(PostgreSQL Production DB)]
        Redis[(Redis Cache)]
    end

    Router --> ReactQuery
    ReactQuery -->|Bearer JWT + Branch Claim| API
    API --> AuthService
    API --> AccountingEngine
    API --> BranchIsolation
    API --> AiEngine
    AccountingEngine --> Postgres
    BranchIsolation --> Postgres
    AiEngine --> Postgres
    API --> Redis
```

---

## 5. Key Architectural Rules

1. **Zero Duplicate Accounting**: All financial transactions (sales, payments, journal entries, receipts) MUST be executed through server endpoints. No local financial calculation or journal entry generation is permitted on mobile.
2. **Server-Side Security Authority**: Role-aware UI routing on mobile is strictly for user experience. Endpoint access control, branch isolation, and permission checks are enforced strictly server-side by ASP.NET Core attributes (`[Authorize(Roles = "...")]`) and `ICurrentUserService`.
3. **Idempotent Operations**: Payment submissions and contract changes are submitted with client-generated request tokens to prevent accidental double-tap duplication.
