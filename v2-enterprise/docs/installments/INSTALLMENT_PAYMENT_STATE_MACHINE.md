# Installment Payment State Machine Specification

---

## 1. Workflow State Definitions

The workflow operates using explicit, guarded state transitions managed by `workflowReducer.ts`:

| State Name | User-Facing Display Label | Description |
| :--- | :--- | :--- |
| `idle` | — | Initial dormant state before user opens workflow dialog. |
| `payment_entry` | **بيانات الدفعة** | Step 1: Input amount, method, account, notes with contract summary preview. |
| `reviewing` | **المراجعة والتأكيد** | Step 2: Read-only verification before committing financial record. |
| `submitting` | **جارٍ تسجيل الدفعة...** | Step 3: Transmitting payload with `Idempotency-Key` to backend API. |
| `submission_unknown` | **جارٍ التحقق من حالة الدفع...** | Network timeout state; queries backend via idempotency key lookup. |
| `payment_posted` | **تم تسجيل الدفعة بنجاح** | Step 4: Authoritative backend payment success result with receipt number. |
| `receipt_loading` | **جارٍ جلب وصل السداد...** | Loading A5 receipt DTO using backend `paymentId`. |
| `receipt_ready` | **معاينة وصل السداد A5** | Step 5: Displaying official printable A5 receipt document. |
| `archive_pending` | **أرشفة وصل السداد** | Step 6: Document-control archive reminder and confirmation selection. |
| `archiving` | **جارٍ تسجيل الأرشفة...** | Transmitting archive confirmation to backend `ArchiveReceiptCommand`. |
| `completed` | **اكتملت العملية** | Step 7: Final workflow summary showing paid amount and archive evidence. |

---

## 2. Guarded Transition Table

| Source State | Trigger / Action | Target State | Transition Guard Rules |
| :--- | :--- | :--- | :--- |
| `idle` | `START_WORKFLOW` | `payment_entry` | Must have active contract & payable schedule. |
| `payment_entry` | `PROCEED_TO_REVIEW` | `reviewing` | `amount > 0` and `accountId` is selected. |
| `reviewing` | `SUBMIT_PAYMENT` | `submitting` | `IdempotencyKey` UUID generated & double-click locked. |
| `reviewing` | `BACK_TO_EDIT` | `payment_entry` | Retains user inputs. |
| `submitting` | `HTTP_200_SUCCESS` | `payment_posted` | Receives `paymentId` & `receiptNumber` from API. |
| `submitting` | `NETWORK_TIMEOUT` | `submission_unknown` | Preserves `IdempotencyKey`. |
| `submission_unknown` | `LOOKUP_FOUND_PAYMENT` | `payment_posted` | Resumes existing `paymentId`. |
| `submission_unknown` | `LOOKUP_NO_PAYMENT` | `payment_entry` | Clears submission lock for user retry. |
| `payment_posted` | `FETCH_RECEIPT` | `receipt_loading` | Uses backend `paymentId`. |
| `receipt_loading` | `RECEIPT_LOADED` | `receipt_ready` | Valid receipt DTO received. |
| `receipt_ready` | `PROCEED_TO_ARCHIVE` | `archive_pending` | User clicks 'متابعة الأرشفة'. |
| `archive_pending` | `CONFIRM_ARCHIVE` | `archiving` | Valid archive method selected (`ManuallyConfirmed` / `Uploaded`). |
| `archiving` | `ARCHIVE_SUCCESS` | `completed` | Authoritative archive record created in database. |
