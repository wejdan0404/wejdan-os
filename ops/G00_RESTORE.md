# G00 restoration procedure

All seven live workflow exports captured on 2026-10-16 are preserved under `workflows/n8n/backups/g00-rebaseline-20261016/` and indexed with workflow IDs, byte counts, SHA-256 digests, active state, and credential counts in `ops/G00_BACKUP_MANIFEST.json`.

## Recovery steps

1. Open the target n8n project and verify its workflow ID against the manifest.
2. Keep the existing original workflow intact. To recover, import the matching JSON as a **new workflow copy**; do not overwrite or delete the original.
3. Keep the imported copy inactive. Do not publish, activate, add credentials, or create a schedule/public endpoint as part of restoration.
4. Compare the imported workflow ID (new ID expected), node graph, connections, and source Code against the saved export. The imported copy will have a different workflow ID, so compare content after excluding ID and server-generated metadata if needed.
5. Record the new workflow ID and restoration date in the registry and preserve the original export unchanged.

The backup is a workflow JSON export, not a backup of n8n credentials, account state, execution data, billing settings, or external systems. There are no credentials in the captured workflow nodes and the credential inventory was empty at G00 inspection.
