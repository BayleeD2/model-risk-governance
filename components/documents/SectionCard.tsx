"use client";

import { useActionState } from "react";
import type { SectionKey } from "@/lib/ai/prompts";
import type { DocumentState } from "@/app/actions/documents";
import type { SectionEntry } from "@/lib/db/validationDocs";

interface Props {
  sectionKey: SectionKey;
  label: string;
  existing: SectionEntry | undefined;
  modelId: string;
  draftAction: (prevState: DocumentState, formData: FormData) => Promise<DocumentState>;
}

const EVIDENCE_REQUIRED_RE = /\[EVIDENCE REQUIRED[^\]]*\]/g;

function renderContent(content: string): React.ReactNode {
  const parts = content.split(EVIDENCE_REQUIRED_RE);
  const matches = content.match(EVIDENCE_REQUIRED_RE) ?? [];

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {matches[i] && (
            <mark className="bg-amber-100 text-amber-800 rounded px-1 py-0.5 text-xs font-medium not-italic">
              {matches[i]}
            </mark>
          )}
        </span>
      ))}
    </>
  );
}

export default function SectionCard({
  sectionKey,
  label,
  existing,
  modelId,
  draftAction,
}: Props) {
  const [state, formAction, isPending] = useActionState<DocumentState, FormData>(
    draftAction,
    { doc: null, error: null }
  );

  const section = state.doc?.sections[sectionKey] ?? existing;
  const hasDraft = Boolean(section?.content);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          {hasDraft && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              Drafted
            </span>
          )}
          {!hasDraft && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              Not started
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <a
              href={`/api/v1/documents/${modelId}/export?section=${sectionKey}`}
              className="text-xs px-2.5 py-1 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Export PDF
            </a>
          )}
          <form action={formAction}>
            <input type="hidden" name="modelId" value={modelId} />
            <input type="hidden" name="sectionKey" value={sectionKey} />
            {hasDraft && (
              <input type="hidden" name="forceRedraft" value="true" />
            )}
            <button
              type="submit"
              disabled={isPending}
              className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Drafting…" : hasDraft ? "Re-draft" : "Draft"}
            </button>
          </form>
        </div>
      </div>

      {state.error && (
        <p className="px-5 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
          {state.error}
        </p>
      )}

      <div className="px-5 py-4">
        {isPending && (
          <p className="text-sm text-gray-400 animate-pulse">Drafting section…</p>
        )}
        {!isPending && section?.content ? (
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {renderContent(section.content)}
          </div>
        ) : (
          !isPending && (
            <p className="text-sm text-gray-400 italic">
              No content yet. Click &ldquo;Draft&rdquo; to generate this section.
            </p>
          )
        )}
      </div>
    </div>
  );
}
