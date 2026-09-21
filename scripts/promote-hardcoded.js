/**
 * @deprecated Use scripts/set-super-admin.js instead.
 * This file previously embedded a Firebase service-account private key and must not be reused.
 */
console.error('Deprecated. Run:\n  node --env-file-if-exists=.env.local scripts/set-super-admin.js <email>');
process.exit(1);
