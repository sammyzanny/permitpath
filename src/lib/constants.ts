export const KIND_LABEL: Record<string, string> = {
  coi: "Certificate of insurance",
  bond: "Surety bond",
  state_license: "State license (IDPH / IDFPR)",
  electrical_credential: "Electrical credential",
  workers_comp: "Workers' comp certificate",
  other: "Other",
};

export const TRADES = ["General", "Electrical", "HVAC", "Plumbing", "Roofing", "Concrete / Masonry", "Landscaping", "Other"];

export const DOCUMENT_KINDS = ["coi", "bond", "state_license", "electrical_credential", "workers_comp", "other"] as const;
