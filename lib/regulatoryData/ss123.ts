// SS 1/23: Model Risk Management Principles for Banks (PRA, May 2023)
export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  evidence_prompt: string;
}

export const SS123_CHECKLIST: ChecklistItem[] = [
  // Model identification
  { id: "ss123-id-01", category: "Model Identification", requirement: "The firm maintains a comprehensive model inventory covering all models used in material decisions.", evidence_prompt: "Confirm this model is included in the firm's comprehensive inventory with all required metadata fields complete." },
  { id: "ss123-id-02", category: "Model Identification", requirement: "Model materiality assessments are documented and reviewed annually.", evidence_prompt: "Upload or reference the materiality assessment for this model and confirm the date it was last reviewed." },

  // Model development
  { id: "ss123-dev-01", category: "Model Development", requirement: "Development documentation includes purpose, methodology, data, assumptions, and limitations.", evidence_prompt: "Provide development documentation covering: purpose, methodology, data sources, assumptions, and known limitations." },
  { id: "ss123-dev-02", category: "Model Development", requirement: "Model development is subject to a peer review process.", evidence_prompt: "Confirm a peer review was completed and name the reviewer and review date." },
  { id: "ss123-dev-03", category: "Model Development", requirement: "Model versioning and change control procedures are in place.", evidence_prompt: "Describe the version control and change management procedures applied to this model." },

  // Independent validation
  { id: "ss123-val-01", category: "Independent Validation", requirement: "Independent validation is conducted by staff with no involvement in model development.", evidence_prompt: "Confirm the validator has no involvement in model development; provide the validator's name and team." },
  { id: "ss123-val-02", category: "Independent Validation", requirement: "Validation scope covers conceptual soundness, data integrity, and outcomes analysis.", evidence_prompt: "Describe validation scope across all three dimensions: conceptual soundness, data integrity, and outcomes analysis." },
  { id: "ss123-val-03", category: "Independent Validation", requirement: "Validation findings are tracked to resolution with clear ownership.", evidence_prompt: "List any open validation findings with assigned owners and target closure dates." },

  // Model risk appetite
  { id: "ss123-mra-01", category: "Model Risk Appetite", requirement: "The firm has a defined model risk appetite approved by the board.", evidence_prompt: "Reference the board-approved model risk appetite statement that covers this model." },
  { id: "ss123-mra-02", category: "Model Risk Appetite", requirement: "Aggregate model risk exposure is monitored against risk appetite.", evidence_prompt: "Describe how this model's risk contribution is reported and monitored against the aggregate risk appetite." },

  // Ongoing monitoring
  { id: "ss123-om-01", category: "Ongoing Monitoring", requirement: "Periodic monitoring reports are produced for all material models.", evidence_prompt: "Confirm monitoring reports are produced for this model and state their frequency (monthly, quarterly, etc.)." },
  { id: "ss123-om-02", category: "Ongoing Monitoring", requirement: "Model re-validation is triggered by material changes to data, use, or performance degradation.", evidence_prompt: "Define the specific triggers that would initiate re-validation of this model." },
];
