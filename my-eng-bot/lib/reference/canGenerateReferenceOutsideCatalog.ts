/**
 * Monetization seam only. Keep generation available until entitlements exist.
 * The caller still applies the referenceGenerate feature flag and input gates.
 */
export function canGenerateReferenceOutsideCatalog(_user?: unknown): boolean {
  return true
}
