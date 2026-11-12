# Security Specification for Mouri Top

## Data Invariants
1. A User profile must match the `request.auth.uid`.
2. Only Admins can modify global settings and services.
3. Orders, Deposits, and Withdrawals belong to a User and can be read by that user or an Admin.
4. Notifications are private to the User.
5. Logs and Admin Logs are strictly restricted to Admins.
6. Payment Methods are readable by anyone but manageable only by Admins.

## The "Dirty Dozen" Payloads (Deny cases)
1. **Identity Spoofing**: Attempt to create an Order with a different `userId`.
2. **Privilege Escalation**: Attempt to update a User profile to set `role: 'admin'`.
3. **Ghost Update**: Attempt to update an Order with a field not in the schema (e.g., `isPaid: true`).
4. **Bypassing Auth**: Attempt to read the `admin_logs` collection without being signed in.
5. **Unauthorized Listing**: Non-admin user attempting to list ALL `users`.
6. **Self-Approval**: User attempting to update their own Deposit status to 'Completed'.
7. **Negative Balance**: Attempting to create a Withdrawal with a negative amount (if validated). -- *Actually mostly logic, but rules can help.*
8. **PII Leak**: Non-admin user attempting to get another user's profile.
9. **Tampering Logs**: User attempting to delete a Log entry.
10. **Setting Poisoning**: User attempting to change `maintenanceMode` in settings.
11. **Impersonation**: Attempting to create a Notification for another user.
12. **Service Price Hijack**: User attempting to update a Service price.

## Test Strategy
All the above payloads must return `PERMISSION_DENIED`.
