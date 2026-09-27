"use client";

import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from "@/lib/ai/prompts";
import type { SectionsMap } from "@/lib/db/validationDocs";
import type { DocumentState } from "@/app/actions/documents";
import SectionCard from "./SectionCard";

interface Props {
  modelId: string;
  sections: SectionsMap;
  draftActions: Record<SectionKey, (prevState: DocumentState, formData: FormData) => Promise<DocumentState>>;
}

export default function DocBuilder({ modelId, sections, draftActions }: Props) {
  const draftedCount = SECTION_KEYS.filter((k) => sections[k]?.content).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {draftedCount} of {SECTION_KEYS.length} sections drafted
        </p>
      </div>

      {SECTION_KEYS.map((key) => (
        <SectionCard
          key={key}
          sectionKey={key}
          label={SECTION_LABELS[key]}
          existing={sections[key]}
          modelId={modelId}
          draftAction={draftActions[key]}
        />
      ))}

      <div className="rounded-md bg-gray-50 border border-gray-200 p-4">
        <p className="text-xs text-gray-500">
          Analytical output only. Not legal or regulatory advice. Firms are responsible
          for their own compliance determinations. Sections marked{" "}
          <mark className="bg-amber-100 text-amber-800 rounded px-1 not-italic">
            [EVIDENCE REQUIRED]
          </mark>{" "}
          require additional model metadata before they can be completed.
        </p>
      </div>
    </div>
  );
}
