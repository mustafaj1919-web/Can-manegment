# Dependency Implementation Plan

This plan documents the currently installed dependencies across the system, evaluates their compatibility, security status, maintenance status, and defines the roadmap for safe package operations.

---

## 1. Application-Specific Dependency Matrix

### A. Backend Services (`src/API/API.csproj`, `src/Infrastructure/Infrastructure.csproj`, `src/Application/Application.csproj`)
- **Key Installed Packages**:
  - `Microsoft.AspNetCore.OpenApi` (8.0.2)
  - `Swashbuckle.AspNetCore` (6.5.0)
  - `Microsoft.EntityFrameworkCore.Design` (8.0.2)
  - `Serilog.AspNetCore` (8.0.1)
  - `Serilog.Sinks.Console` (5.0.1)
  - `Serilog.Sinks.File` (5.0.0)
  - `Google.Apis.Auth` (1.68.0)
- **Proposed Additions / Upgrades**:
  - `FluentValidation.AspNetCore` (11.3.0) — For auto-validation of incoming API requests.
- **Evaluation**:
  - Framework version target is .NET 8.0. All packages are fully compatible and up-to-date with no deprecations.

### B. Admin Dashboard (`frontend/package.json`)
- **Key Installed Packages**:
  - `next`: `^16.2.7`
  - `react`/`react-dom`: `^19.2.3`
  - `@tanstack/react-query`: `^5.51.0`
  - `zustand`: `^4.5.4`
  - `framer-motion`: `^12.40.0`
  - `lucide-react`: `^0.414.0`
  - `sonner`: `^1.5.0`
  - `zod`: `^3.23.8`
  - `react-hook-form`: `^7.52.1`
- **Evaluation**:
  - Fully compatible with React 19 and Next.js 16. No major upgrades needed.
  - Tailwind CSS `3.4.17` is used with `tailwindcss-animate` `1.0.7` which provides solid styling performance.

### C. Customer Website (`New-website/Al-Asdiqaa Car Trading Website/package.json`)
- **Key Installed Packages**:
  - `next`: `15.5.20`
  - `react`/`react-dom`: `19.1.0`
  - `zustand`: `^5.0.14`
  - `framer-motion`: `^12.42.2`
  - `tailwind-merge`: `^3.6.0`
  - `zod`: `^4.4.3`
- **Evaluation**:
  - Fully integrated with Tailwind CSS v4 and React 19. No duplicate or competing framework components are present.

### D. Mobile Application (`mobile-app/pubspec.yaml`)
- **Key Installed Packages**:
  - `dio`: `^5.4.0`
  - `provider`: `^6.1.1`
  - `shared_preferences`: `^2.2.2`
  - `google_sign_in`: `^6.2.2`
  - `flutter_lucide`: `any`
- **Evaluation**:
  - The stack is Flutter.
  - The dependencies are stable and up-to-date, compatible with current Dart/Flutter SDK constraints (`>=3.0.0 <4.0.0`).

---

## 2. Dependency Actions Checklist

1. **Backend**:
   - Confirm target framework `net8.0` remains unchanged.
   - Clean up the unused warning variables (`cashOrBankDesc`) in `src/Application/Purchases/Commands/CreatePurchaseCommand.cs` and `src/Application/Purchases/Commands/BulkCreatePurchaseCommand.cs`.
   - Fix nullable reference warnings in `src/Application/Customers/Queries/GetCustomerStatementQuery.cs` and `src/API/Controllers/CrmController.cs`.
2. **Frontend**:
   - Keep lock files intact (`frontend/package-lock.json` and `New-website/Al-Asdiqaa Car Trading Website/package-lock.json`).
   - Run typecheck and lint validations after all codebase updates.
3. **Mobile**:
   - Retain current Flutter pub dependencies without forcing major upgrades.
