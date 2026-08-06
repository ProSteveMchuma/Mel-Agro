# Firestore Backup and Recovery

## Backup schedule

`.github/workflows/firestore-backup.yml` starts a Firestore managed export every day at 02:15 Africa/Nairobi (23:15 UTC). Configure these GitHub Actions secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_BACKUP_SERVICE_ACCOUNT`
- `FIREBASE_PROJECT_ID`
- `FIRESTORE_BACKUP_BUCKET` (bucket name only)
- `ALERT_WEBHOOK_URL` (optional but recommended)

Grant the backup service account only the permissions required to export Firestore and write to the backup bucket. Enable object versioning, uniform bucket-level access, encryption, and a lifecycle policy appropriate to the business retention requirement. Keep the bucket in a supported location compatible with the Firestore database.

The workflow starts exports asynchronously. Configure Cloud Logging/Monitoring for failed Firestore export operations in addition to the workflow failure alert.

## Quarterly restore drill

1. Select a completed export under `gs://BUCKET/scheduled/TIMESTAMP`.
2. Create or select a non-production Firebase project with no customer integrations enabled.
3. Confirm the operator has Firestore import permissions and the destination project can read the export bucket.
4. Run:

   ```bash
   gcloud firestore import gs://BUCKET/scheduled/TIMESTAMP \
     --project=NON_PRODUCTION_PROJECT_ID
   ```

5. Validate representative users, products, orders, payment records, and collection counts.
6. Verify protected collections remain protected after deploying the current `firestore.rules` to the drill project.
7. Record the export identifier, duration, record counts, validation results, and operator in the incident/change log.
8. Delete the drill project or restored customer data according to the retention policy.

## Production recovery

Do not import into production until the incident owner confirms the recovery point and impact. Firestore imports do not delete documents that are absent from the export, and writes during an import can create inconsistent business state. Put payment callbacks and order writes into maintenance mode or otherwise stop mutations, preserve the current database, perform the import, reconcile payments created after the recovery point, deploy current rules, and run acceptance checks before reopening traffic.

Never restore production data into a developer's personal project or download exports to an unmanaged workstation.
