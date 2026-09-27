// SR 11-7: Supervisory Guidance on Model Risk Management (Federal Reserve / OCC, April 2011)
export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  evidence_prompt: string; // what evidence would satisfy this obligation
}

export const SR117_CHECKLIST: ChecklistItem[] = [
  // Conceptual soundness
  { id: "sr117-cs-01", category: "Conceptual Soundness", requirement: "Model design and theory are documented and reviewed by qualified staff independent of development.", evidence_prompt: "Upload or reference the model design document: include author, date, and name of the independent reviewer." },
  { id: "sr117-cs-02", category: "Conceptual Soundness", requirement: "Model assumptions are identified, justified, and stress-tested.", evidence_prompt: "List key assumptions and describe the stress-testing approach and results used to justify each." },
  { id: "sr117-cs-03", category: "Conceptual Soundness", requirement: "Known model limitations and compensating controls are documented.", evidence_prompt: "Document known weaknesses and the specific controls or overlays that compensate for each." },

  // Data quality
  { id: "sr117-dq-01", category: "Data Quality", requirement: "Training and input data sources are identified, documented, and subject to data quality controls.", evidence_prompt: "Name each training data source, its data owner, and the quality checks applied at ingestion." },
  { id: "sr117-dq-02", category: "Data Quality", requirement: "Data transformations and feature engineering are documented and reproducible.", evidence_prompt: "Describe feature engineering steps and confirm the pipeline is reproducible from documented data lineage." },
  { id: "sr117-dq-03", category: "Data Quality", requirement: "Out-of-time and out-of-sample testing is performed and results are documented.", evidence_prompt: "Provide out-of-time and out-of-sample test results: date range, sample size, and key performance statistics." },

  // Model validation
  { id: "sr117-mv-01", category: "Model Validation", requirement: "An independent validation function reviews model conceptual soundness, outcomes, and ongoing performance.", evidence_prompt: "Name the independent validation team or individual and summarise the scope and date of their review." },
  { id: "sr117-mv-02", category: "Model Validation", requirement: "Backtesting and benchmarking results are documented and reviewed.", evidence_prompt: "Link or upload the backtesting report with performance statistics and the reviewer's sign-off." },
  { id: "sr117-mv-03", category: "Model Validation", requirement: "Sensitivity analysis and scenario testing have been conducted.", evidence_prompt: "Describe the scenarios tested and provide a summary of sensitivity findings." },
  { id: "sr117-mv-04", category: "Model Validation", requirement: "Model risk rating has been assigned and is reviewed periodically.", evidence_prompt: "State the assigned model risk rating and the date it was last formally reviewed." },

  // Ongoing monitoring
  { id: "sr117-om-01", category: "Ongoing Monitoring", requirement: "Model performance metrics are monitored against pre-defined thresholds on a regular schedule.", evidence_prompt: "Define the KPIs monitored and their alert thresholds. Use the drift monitoring page to capture PSI/KS/CSI readings." },
  { id: "sr117-om-02", category: "Ongoing Monitoring", requirement: "Population stability index (PSI) or equivalent drift monitoring is in place.", evidence_prompt: "Confirm PSI or equivalent drift monitoring is active. Use the metrics upload to record regular PSI readings." },
  { id: "sr117-om-03", category: "Ongoing Monitoring", requirement: "Triggers and escalation procedures for model re-validation are defined.", evidence_prompt: "Define the breach conditions that trigger re-validation and the escalation chain to model owners and committees." },

  // Governance
  { id: "sr117-gov-01", category: "Governance", requirement: "A model inventory is maintained with model owner, purpose, and validation status.", evidence_prompt: "Ensure this model record is complete: owner name, use case, model type, and current validation status." },
  { id: "sr117-gov-02", category: "Governance", requirement: "Model approval and change management processes are documented and followed.", evidence_prompt: "Describe the model approval workflow and link to change log entries for this model." },
  { id: "sr117-gov-03", category: "Governance", requirement: "Board or senior management oversight of model risk is evidenced.", evidence_prompt: "Provide board or senior management MI evidence: committee minutes, dashboard screenshots, or sign-off records." },
];
