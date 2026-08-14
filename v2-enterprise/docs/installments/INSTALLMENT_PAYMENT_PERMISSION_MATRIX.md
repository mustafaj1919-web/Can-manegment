# Installment Payment Permission Matrix

---

## 1. System Role Permissions

| Operation / Action | Cashier (أمين الصندوق) | Finance Manager (المدير المالي) | System Admin (مدير النظام) |
| :--- | :---: | :---: | :---: |
| **View Contract & Schedule** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Record Installment Payment** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Select Receiving Account** | Restricted to Branch Cashboxes | ✅ All Branch Accounts | ✅ All Accounts |
| **Backdate Payment Date** | ❌ Forbidden | ✅ Allowed (within open period) | ✅ Allowed |
| **View A5 Receipt** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Print / Save Receipt PDF** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Confirm Manual Archive** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **View Journal Entry Details** | ❌ Forbidden | ✅ Allowed | ✅ Allowed |
| **Cancel / Reverse Payment** | ❌ Forbidden | ✅ Requires Approval | ✅ Allowed |

---

## 2. Multi-Tenant Branch Isolation Rules

1. Every payment operation resolves `BranchId` from `ICurrentUserService` server-side.
2. Cross-branch payment requests are rejected with `403 Forbidden` (`"لا تملك صلاحية الوصول لهذا الفرع"`).
3. Receiving account options are strictly filtered by the user's active `BranchId`.
