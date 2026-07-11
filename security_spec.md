# Firestore Security Specification - Paradise Group CRM

This document outlines the security architecture, invariants, and threat vectors for the Paradise Group CRM.

## 1. Data Invariants

1. **Staff Collection (`/staff/{staffId}`)**:
   - Only admins can write or modify staff accounts.
   - Staff records are only readable by signed-in users.
   
2. **Customer Enquiries (`/enquiries/{enquiryId}`)**:
   - Must be read or written only by authorized staff members.
   - Key fields like ID and creation time are immutable.

3. **Service Logs (`/services/{serviceId}`)**:
   - Must reference a valid customer enquiry.
   - Only writable by authorized staff.

4. **Demo Logs (`/demos/{demoId}`)**:
   - Must be linked to a valid enquiry.
   - Writable only by staff.

5. **Follow-ups (`/followups/{followupId}`)**:
   - Must reference an active customer enquiry.
   - Scheduled dates must be valid.

6. **Audit/Activity Logs (`/activities/{activityId}`)**:
   - Strictly write-once (immutable).
   - Only writable by staff members to prevent spoofing or deletion of trail logs.

7. **Demo Installations (`/installations/{installationId}`)**:
   - Must be linked to a valid enquiry.
   - Only writable by staff.

---

## 2. The "Dirty Dozen" Threat Payloads

The following payloads attempt to violate security boundaries and must be blocked:

1. **Unauthenticated Read Attack**: Attempting to read staff or customer list without any auth headers.
2. **Staff Privilege Escalation**: A standard staff member attempts to promote themselves to `Admin` role.
3. **Ghost Collection Write**: Writing records into arbitrary, undefined collections.
4. **Enquiry ID Spoofing**: Attempting to use a 1.5KB string containing junk characters as an `enquiryId`.
5. **PII Data Scraping**: Attempting to execute a broad client query to scrape phone numbers and emails without authorized staff membership.
6. **Immutable Field Write**: Attempting to update `createdAt` or `loggedAt` on a service log.
7. **Orphaned Service Record**: Creating a service log referencing a non-existent enquiry ID.
8. **Audit Trail Deletion**: Attempting to delete an audit log document from the `activities` collection.
9. **Duplicate ID Injection**: Attempting to create an enquiry where the creator ID doesn't match the active auth token UID.
10. **Terminal State Shortcut**: Attempting to directly complete or bypass workflow status without staff verification.
11. **Denial-of-Wallet Attack**: Initiating rapid recursive requests using invalid document IDs.
12. **Foreign Data Sync**: Attempting to fetch or mutate data belonging to other companies/tenants.

---

## 3. Test Verification Rules

All malicious payloads described above will trigger `PERMISSION_DENIED` errors when executed against our Zero-Trust Firestore Security rules. All cloud mutations are securely verified on our Express proxy backend.
