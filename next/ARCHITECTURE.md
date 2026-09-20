# Ghestban Next

Clean mobile-first rebuild. Existing 3.10.6 data is preserved through an adapter/migration boundary; legacy UI is not the product shell.

## Layers
- Domain: Household, Account/Card, Loan, Installment, Transaction
- Application: dashboard, payment matching, reports, notifications, backup/rollback
- Infrastructure: local storage adapter now; database/server providers later
- UI: routed Home, Installments, Transactions, Accounts, Reports, More

## Safety
Migration is non-destructive. Create a recovery snapshot before migration. Server/OTP/license/cloud features remain disabled until infrastructure exists.
