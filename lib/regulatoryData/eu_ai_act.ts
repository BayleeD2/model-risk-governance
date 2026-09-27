// EU AI Act — Annex III high-risk AI system requirements (in force August 2024)
export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  evidence_prompt: string;
}

export const EU_AI_ACT_CHECKLIST: ChecklistItem[] = [
  // Risk management
  { id: "euai-rm-01", category: "Risk Management", requirement: "A risk management system is established and maintained throughout the AI system lifecycle.", evidence_prompt: "Describe the risk management system in place for this AI system, including review frequency and responsible owner." },
  { id: "euai-rm-02", category: "Risk Management", requirement: "Residual risks after mitigation measures are documented and acceptable.", evidence_prompt: "Document residual risks after mitigation and confirm they fall within the organisation's accepted tolerance level." },

  // Data governance
  { id: "euai-dg-01", category: "Data Governance", requirement: "Training, validation, and testing datasets are subject to documented data governance practices.", evidence_prompt: "Describe data governance practices covering all three dataset types: training, validation, and testing." },
  { id: "euai-dg-02", category: "Data Governance", requirement: "Datasets are examined for possible biases and mitigation measures applied.", evidence_prompt: "Describe the bias examination methodology and any mitigation measures applied to training data." },

  // Technical documentation
  { id: "euai-td-01", category: "Technical Documentation", requirement: "Technical documentation is prepared before placing the AI system on the market.", evidence_prompt: "Confirm technical documentation was prepared and signed off before deployment; reference the document." },
  { id: "euai-td-02", category: "Technical Documentation", requirement: "Documentation includes intended purpose, performance metrics, and known limitations.", evidence_prompt: "Verify this model record includes intended purpose, tracked performance metrics, and documented limitations." },

  // Transparency and human oversight
  { id: "euai-ho-01", category: "Human Oversight", requirement: "The AI system is designed to allow effective human oversight and intervention.", evidence_prompt: "Describe the human oversight mechanisms: who can intervene, under what conditions, and how." },
  { id: "euai-ho-02", category: "Human Oversight", requirement: "Natural persons overseeing the system have necessary competence, training, and authority.", evidence_prompt: "Confirm oversight personnel have documented competence and training, and clear authority to intervene." },

  // Accuracy and robustness
  { id: "euai-ar-01", category: "Accuracy & Robustness", requirement: "The AI system achieves appropriate levels of accuracy documented against defined metrics.", evidence_prompt: "State the accuracy metric used, the defined threshold, and the measured value at last evaluation." },
  { id: "euai-ar-02", category: "Accuracy & Robustness", requirement: "The system is resilient against errors, faults, and adversarial inputs.", evidence_prompt: "Describe resilience testing conducted: adversarial input testing, error handling, and fallback behaviour." },
  { id: "euai-ar-03", category: "Accuracy & Robustness", requirement: "Cybersecurity measures are implemented to protect against unauthorised access.", evidence_prompt: "Describe cybersecurity controls protecting the AI system from unauthorised access or manipulation." },

  // Conformity assessment
  { id: "euai-ca-01", category: "Conformity Assessment", requirement: "A conformity assessment procedure has been carried out before deployment.", evidence_prompt: "Confirm a conformity assessment was completed and reference the assessment report." },
  { id: "euai-ca-02", category: "Conformity Assessment", requirement: "EU declaration of conformity is drawn up and CE marking affixed where applicable.", evidence_prompt: "Confirm the EU declaration of conformity is in place and CE marking applied where required." },
];
