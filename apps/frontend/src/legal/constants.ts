/** Shared legal metadata — update contact and company details before production launch. */
export const LEGAL_ENTITY = "Streammeo";
export const LEGAL_CONTACT_EMAIL = "legal@streammeo.com";
export const LEGAL_SUPPORT_EMAIL = "support@streammeo.com";
export const LEGAL_LAST_UPDATED = "May 30, 2026";
export const LEGAL_WEBSITE = "https://streammeo.com";

/** Impressum / company registration — required for EU (especially DE/AT). Replace placeholders before going live. */
export const LEGAL_COMPANY_NAME = "Streammeo [Legal Entity Name Ltd.]";
export const LEGAL_ADDRESS_LINES = [
  "[Street and number]",
  "[Postal code, City]",
  "[Country]",
] as const;
export const LEGAL_CONTACT_PHONE = "[+00 000 000 0000]";
export const LEGAL_VAT_ID = "[EU VAT ID — if applicable]";
export const LEGAL_REGISTER = "[Commercial register / Handelsregister — if applicable]";
export const LEGAL_RESPONSIBLE_PERSON = "[Name of managing director or authorized representative]";

export const LEGAL_NAV = [
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "refund", label: "Refund & Returns" },
  { slug: "disclaimer", label: "Disclaimer" },
  { slug: "eula", label: "EULA" },
  { slug: "acceptable-use", label: "Acceptable Use" },
  { slug: "accessibility", label: "Accessibility" },
  { slug: "impressum", label: "Impressum" },
] as const;

export type LegalSlug = (typeof LEGAL_NAV)[number]["slug"];
