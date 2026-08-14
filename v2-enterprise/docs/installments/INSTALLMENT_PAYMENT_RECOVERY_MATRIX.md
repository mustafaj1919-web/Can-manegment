# Installment Payment Recovery Matrix

---

## Error & Disruption Recovery Matrix

| Disruption Event | System Detection | Automatic / User Action | Recovery Path |
| :--- | :--- | :--- | :--- |
| **Network Timeout During Submission** | Request throws timeout/network error while in `submitting` state. | System preserves `IdempotencyKey` and switches to `submission_unknown`. | Queries backend `GET /api/Payments/by-idempotency/{key}`. If found, advances to `payment_posted` with existing `paymentId`. If not found, allows safe user retry. |
| **Double Click on Submit** | Second click triggers within 300ms. | Button disabled & double-click lock flag active. | Second click is ignored. Single HTTP request is sent. |
| **Concurrent Payment by Another User** | Optimistic concurrency token check fails on database save. | API returns `409 Conflict`. | Displays `"تم تحديث بيانات العقد بواسطة مستخدم آخر. يرجى مراجعة مبلغ الدفعة والرصيد الحالي"`. User returns to `payment_entry` with fresh balances. |
| **Receipt Fetch Failure** | API error when loading receipt DTO using `paymentId`. | System transitions to `receipt_failed` state. | Payment remains recorded (`paymentId` preserved). Offers button `"إعادة تحميل الوصل"`. Never resubmits payment. |
| **Browser Closed Before Archive Confirmation** | User closes browser window after payment success. | Archive status remains `Pending` in database. | Contract payment history displays badge `"وصل بانتظار الأرشفة"` with button `"استكمال الأرشفة"`. Clicking re-opens workflow directly at `archive_pending` step. |
| **Accounting Posting Delay** | Journal entry is created in background queue. | Backend sets `accountingStatus = "Pending"`. | UI displays status badge `"القيد بانتظار الترحيل"`. User can continue to receipt and archive steps without blocking. |
