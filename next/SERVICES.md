# Ghestban Next — Service Contracts

The UI calls application services only. Domain services persist through the domain repository. Infrastructure providers are replaceable adapters.

## 12 services
1. HouseholdService — household/membership/roles
2. AccountService — accounts/cards/ownership
3. LoanService — loans/installments/payment state
4. TransactionService — income/expense/transfer/inbox
5. MatchingService — candidate-to-installment suggestions
6. NotificationService — local notification center
7. BackupService — current local-file provider; GitHub/server adapters later
8. RecoveryService — snapshot/history/rollback
9. BankSmsService — parser/inbox adapter; native receiver disabled
10. SyncService — port present, provider disabled
11. IdentityService — port present, provider disabled
12. LicenseService — port present, provider disabled

No external adapter may mutate an installment directly. Bank SMS creates a candidate; MatchingService suggests; user confirmation creates a transaction; LoanService marks the installment paid.
