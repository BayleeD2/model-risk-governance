"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { importModelsAction, type ImportRow } from "@/app/actions/importModels";

type Step = "upload" | "map" | "preview" | "result";

const TARGET_FIELDS = [
  { key: "name" as const, label: "Model name", required: true },
  { key: "description" as const, label: "Description", required: false },
  { key: "model_type" as const, label: "Model type", required: false },
  { key: "use_case" as const, label: "Use case", required: false },
  { key: "owner_name" as const, label: "Model owner", required: false },
  { key: "source" as const, label: "Source (first_party / third_party)", required: false },
];

type FieldKey = (typeof TARGET_FIELDS)[number]["key"];
type ColumnMap = Partial<Record<FieldKey, string>>;

function guessMapping(headers: string[]): ColumnMap {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");
  const map: ColumnMap = {};
  const candidates: Record<FieldKey, string[]> = {
    name: ["name", "modelname", "model"],
    description: ["description", "desc", "summary"],
    model_type: ["modeltype", "type", "kind"],
    use_case: ["usecase", "usecase", "purpose", "function"],
    owner_name: ["ownername", "owner", "contact", "manager"],
    source: ["source", "origin", "provenance"],
  };
  for (const [field, guesses] of Object.entries(candidates) as [FieldKey, string[]][]) {
    const match = headers.find((h) => guesses.includes(norm(h)));
    if (match) map[field] = match;
  }
  return map;
}

function applyMapping(rows: string[][], headers: string[], colMap: ColumnMap): ImportRow[] {
  return rows.map((row) => {
    const get = (col: string | undefined) =>
      col !== undefined ? (row[headers.indexOf(col)] ?? "").trim() : undefined;
    return {
      name: get(colMap.name) ?? "",
      description: get(colMap.description) || undefined,
      model_type: get(colMap.model_type) || undefined,
      use_case: get(colMap.use_case) || undefined,
      owner_name: get(colMap.owner_name) || undefined,
      source:
        (get(colMap.source) as ImportRow["source"]) ||
        undefined,
    };
  }).filter((r) => r.name.length > 0);
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({});
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
        if (raw.length < 2) {
          setParseError("File must have at least a header row and one data row.");
          return;
        }
        const hdrs = (raw[0] as unknown[]).map(String);
        const rows = (raw.slice(1) as unknown[][]).map((r) =>
          hdrs.map((_, i) => String((r as unknown[])[i] ?? ""))
        );
        setHeaders(hdrs);
        setDataRows(rows);
        setColMap(guessMapping(hdrs));
        setStep("map");
      } catch {
        setParseError("Could not parse file. Please upload a valid CSV or XLSX.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const previewRows = applyMapping(dataRows.slice(0, 5), headers, colMap);
  const allRows = applyMapping(dataRows, headers, colMap);
  const validCount = allRows.filter((r) => r.name.length > 0).length;
  const nameColSet = !!colMap.name;

  async function handleImport() {
    setIsPending(true);
    try {
      const res = await importModelsAction(allRows);
      setResult(res);
      setStep("result");
    } catch (e) {
      setResult({ imported: 0, errors: [e instanceof Error ? e.message : "Import failed"] });
      setStep("result");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Import models</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bulk-register models from a CSV or XLSX spreadsheet.
          </p>
        </div>
        <Link href="/models">
          <button className="text-sm px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50">
            ← Back
          </button>
        </Link>
      </div>

      {/* Step 1 — Upload */}
      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-16 text-center hover:border-indigo-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <p className="text-gray-600 font-medium">Drop a CSV or XLSX file here</p>
          <p className="mt-1 text-sm text-gray-400">or click to browse</p>
          {parseError && (
            <p className="mt-4 text-sm text-red-600">{parseError}</p>
          )}
        </div>
      )}

      {/* Step 2 — Column mapping */}
      {step === "map" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">Map columns</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {dataRows.length} rows detected. Map your file&apos;s columns to the registry fields.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {TARGET_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-48 flex-shrink-0">
                    <span className="text-sm text-gray-700">{label}</span>
                    {required && <span className="ml-1 text-red-500 text-xs">*</span>}
                  </div>
                  <select
                    className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={colMap[key] ?? ""}
                    onChange={(e) =>
                      setColMap((m) => ({
                        ...m,
                        [key]: e.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("preview")}
              disabled={!nameColSet}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview ({validCount} models)
            </button>
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
            >
              Change file
            </button>
            {!nameColSet && (
              <p className="text-xs text-red-600">Model name column is required.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — Preview */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                Preview — first {Math.min(5, previewRows.length)} of {validCount} rows
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {TARGET_FIELDS.filter((f) => colMap[f.key]).map((f) => (
                      <th key={f.key} className="px-3 py-2 text-left text-gray-500 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewRows.map((row, i) => (
                    <tr key={i} className={!row.name ? "bg-red-50" : ""}>
                      {TARGET_FIELDS.filter((f) => colMap[f.key]).map((f) => (
                        <td key={f.key} className="px-3 py-2 text-gray-700">
                          {(row[f.key] as string | undefined) ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={isPending || validCount === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Importing…" : `Import ${validCount} models`}
            </button>
            <button
              onClick={() => setStep("map")}
              className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
            >
              ← Edit mapping
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Result */}
      {step === "result" && result && (
        <div className="space-y-4">
          <div
            className={`rounded-lg p-5 border ${
              result.errors.length === 0
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">
              {result.imported} model{result.imported !== 1 ? "s" : ""} imported successfully.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-700">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3">
            <Link href="/models">
              <button className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">
                View registry
              </button>
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setResult(null);
                setHeaders([]);
                setDataRows([]);
                setColMap({});
              }}
              className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
