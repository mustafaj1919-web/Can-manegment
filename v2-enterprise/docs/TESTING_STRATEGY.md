# Testing Strategy

This document outlines the testing strategy, test structure, and automated verification rules for the Al-Asdiqaa enterprise system.

---

## 1. Test Architecture

The testing suite consists of structured layers:

### A. Backend Unit & Integration Tests (`tests/UnitTests`)
- **Framework**: xUnit, FluentAssertions, and Moq.
- **Organization**:
  - `Accounting/`: Validates journal balance rules, accounting constraints, and statement generation.
  - `Sales/`: Validates contract creations and downpayment calculations.
  - `Purchases/`: Validates purchase creation logic.
  - `Installments/`: Checks repayment terms and schedule generators.

---

## 2. Core Accounting Integrity Validation

The system enforces strict rules at the database interceptor layer:
1. **Unbalanced Entries Rejected**: Every journal command validates that `TotalDebit == TotalCredit` before posting.
2. **Historical Entry Immutable**: Modifying or deleting any historical `JournalEntry` or `JournalLine` throws an `InvalidOperationException`.
3. **Roll Forward Execution**: Tests can be executed using `DOTNET_ROLL_FORWARD=LatestMajor dotnet test` to match local machine runtimes.

---

## 3. Automation Checklist

To verify codebase health before packaging, run:
```bash
# Verify backend tests
DOTNET_ROLL_FORWARD=LatestMajor dotnet test

# Verify frontend types
npm run type-check

# Verify frontend styles & code rules
npm run lint
```
