# Installment Payment API & DTO Field Mapping Specification

---

## 1. Request DTO Contract

### `POST /Installments/schedules/{scheduleId}/payment`
Headers:
- `Authorization: Bearer <token>`
- `Idempotency-Key: <UUID>`

Payload:
```typescript
interface PaySchedulePayloadDto {
  amount: number               // Required, > 0
  paymentMethod: string        // "Cash" | "BankTransfer" | "POS" | "Cheque"
  debitAccountId: string       // Guid of cashbox / bank account selected
  notes?: string               // Optional notes
  requestHash: string          // SHA256(scheduleId + amount + currency + debitAccountId)
}
```

---

## 2. Response DTO Contract

### Successful Payment Response (`200 OK`)
```typescript
interface PaymentResultDto {
  success: boolean
  paymentId: string            // Guid
  receiptId: string            // Guid
  receiptNumber: string        // e.g. "REC-20260723-00042"
  idempotencyKey: string       // Guid
  financialStatus: "Recorded" | "Posted" | "Reversed"
  accountingStatus: "Posted" | "Pending" | "Failed"
  receiptStatus: "Ready" | "Failed"
  archiveStatus: "Pending" | "Uploaded" | "ManuallyConfirmed"
  postedAmount: number
  currency: "IQD" | "USD"
  totalPaid: number
  remainingBalance: number
  paidInstallmentCount: number
  remainingInstallmentCount: number
  nextInstallmentDate?: string
  journalEntryId?: string
  journalEntryNumber?: string
  createdAt: string
}
```

---

## 3. Archive API Contract

### `POST /Payments/{paymentId}/archive`
Payload:
```typescript
interface ArchiveReceiptRequestDto {
  paymentId: string
  archiveMethod: "ManuallyConfirmed" | "Uploaded"
  notes?: string
  fileReference?: string
}
```
Response:
```typescript
interface ArchiveReceiptResponseDto {
  success: boolean
  paymentId: string
  archiveStatus: "ManuallyConfirmed" | "Uploaded"
  confirmedByUserName: string
  confirmedAt: string
}
```
