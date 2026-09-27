// NIST AI Risk Management Framework (AI RMF 1.0, January 2023)
export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  evidence_prompt: string;
}

export const NIST_RMF_CHECKLIST: ChecklistItem[] = [
  // GOVERN
  { id: "nist-gov-01", category: "GOVERN", requirement: "Policies and processes for AI risk management are established, maintained, and reviewed.", evidence_prompt: "Reference the AI risk management policy document and confirm the last review date." },
  { id: "nist-gov-02", category: "GOVERN", requirement: "Roles and responsibilities for AI risk management are defined, documented, and communicated.", evidence_prompt: "Map AI risk management roles and responsibilities to named individuals and confirm communication." },
  { id: "nist-gov-03", category: "GOVERN", requirement: "AI risk culture and accountability are promoted across the organisation.", evidence_prompt: "Describe how AI risk culture is promoted: training programmes, accountability mechanisms, and reporting lines." },

  // MAP
  { id: "nist-map-01", category: "MAP", requirement: "The AI system's context of use, intended purpose, and affected stakeholders are documented.", evidence_prompt: "Confirm this model record documents context of use, intended purpose, and the stakeholders affected." },
  { id: "nist-map-02", category: "MAP", requirement: "Potential positive and negative impacts of the AI system are identified and categorised.", evidence_prompt: "Document identified positive and negative impacts with their likelihood and severity assessment." },
  { id: "nist-map-03", category: "MAP", requirement: "AI risks are categorised and prioritised based on likelihood and magnitude of impact.", evidence_prompt: "State the risk priority level for this model and the criteria and process used to assign it." },

  // MEASURE
  { id: "nist-meas-01", category: "MEASURE", requirement: "Metrics for AI trustworthiness (accuracy, fairness, explainability, robustness) are defined and tracked.", evidence_prompt: "List the trustworthiness metrics tracked for this model: accuracy, fairness, explainability, and robustness measures." },
  { id: "nist-meas-02", category: "MEASURE", requirement: "AI system performance is evaluated against defined metrics pre-deployment and on an ongoing basis.", evidence_prompt: "Provide pre-deployment evaluation results and confirm the ongoing monitoring cadence." },
  { id: "nist-meas-03", category: "MEASURE", requirement: "Bias and fairness evaluations are documented with evidence.", evidence_prompt: "Provide bias and fairness evaluation results, including protected attributes assessed and outcomes." },

  // MANAGE
  { id: "nist-mgmt-01", category: "MANAGE", requirement: "Risk response plans are developed for identified AI risks above tolerance thresholds.", evidence_prompt: "Describe risk response plans for risks above tolerance, including owners, actions, and timelines." },
  { id: "nist-mgmt-02", category: "MANAGE", requirement: "Residual risks are monitored and escalation procedures are defined.", evidence_prompt: "Define the residual risk monitoring approach and escalation thresholds for this model." },
  { id: "nist-mgmt-03", category: "MANAGE", requirement: "Incidents and anomalies involving the AI system are tracked and responded to.", evidence_prompt: "Describe the incident tracking process and list any incidents recorded for this model." },
];
