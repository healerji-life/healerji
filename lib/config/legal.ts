/**
 * Legal metadata — one source of truth for every policy page.
 *
 * `effective` and `updated` are set by the company when a policy is
 * signed off; `version` increments with each substantive revision.
 * Nothing here asserts a compliance certification: the policies
 * describe what HealerJi actually does, and where a framework applies
 * they say which one and how the practice relates to it.
 */
export const LEGAL_META = {
  company: "Sattveda Wellness Technology Private Limited",
  address: "M-5, Essel House, 10 Asaf Ali Road, New Delhi – 110002, India",
  effective: "1 August 2026",
  updated: "1 August 2026",
  version: "1.0",
  contact: "support@healerji.com",
  grievance: "Grievance Officer · support@healerji.com",
} as const;
