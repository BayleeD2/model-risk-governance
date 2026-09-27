import { NextResponse } from "next/server";
import { getUser } from "@/lib/db/auth";
import { getUserProfile } from "@/lib/db/orgs";
import { exportSectionToPdf } from "@/lib/export/pdfExporter";
import { SECTION_KEYS, type SectionKey } from "@/lib/ai/prompts";
import { getModel } from "@/lib/db/models";
import { getValidationDoc } from "@/lib/db/validationDocs";

// GET /api/v1/documents/[modelId]/export?section=<sectionKey>
// [id] here is the MODEL id (the SectionCard links use model id for convenience)
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const { id: modelId } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getUserProfile(user.id);
  if (!profile) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const sectionKey = searchParams.get("section") as SectionKey | null;
  if (!sectionKey || !SECTION_KEYS.includes(sectionKey)) {
    return NextResponse.json({ error: "Invalid section key" }, { status: 400 });
  }

  const [model, doc] = await Promise.all([
    getModel(modelId, profile.org_id),
    getValidationDoc(modelId, profile.org_id),
  ]);

  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });
  if (!doc) return NextResponse.json({ error: "No evidence pack found" }, { status: 404 });

  const section = doc.sections[sectionKey];
  if (!section?.content) {
    return NextResponse.json({ error: "Section not drafted yet" }, { status: 422 });
  }

  const pdfBuffer = await exportSectionToPdf({
    modelName: model.name,
    sectionKey,
    content: section.content,
    draftedAt: section.draftedAt,
  });

  const filename = `${model.name.replace(/\s+/g, "_")}_${sectionKey}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}
