# Dependency Security Risk Register

## Accepted moderate transitive findings

The production dependency audit currently reports moderate `uuid` findings through ExcelJS and Firebase Admin's Google Cloud dependencies. npm proposes incompatible downgrades (`exceljs@3.4.0` and an older Firebase Admin) rather than a safe remediation. Those forced changes are not approved because they would reintroduce older packages and risk breaking spreadsheet and server operations.

Controls:

- `npm run audit:production` fails CI for high or critical production findings.
- Production input validation and authorization do not invoke UUID v3/v5/v6 with caller-provided output buffers, the vulnerable API shape described by the advisory.
- Dependencies are reviewed during each release and upgraded when upstream packages publish compatible fixes.
- Spreadsheet imports remain restricted to authenticated administrators and are verified by type checks, tests, lint, and production builds.

Review this acceptance monthly and remove it as soon as a compatible upstream fix is available.
