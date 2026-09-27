import puppeteer from "puppeteer";
import { DISCLAIMER } from "@/lib/ai/groundingGuard";
import { SECTION_LABELS, type SectionKey } from "@/lib/ai/prompts";

interface ExportOptions {
  modelName: string;
  sectionKey: SectionKey;
  content: string;
  draftedAt: string;
}

function buildHtml(opts: ExportOptions): string {
  const { modelName, sectionKey, content, draftedAt } = opts;
  const sectionTitle = SECTION_LABELS[sectionKey];
  const dated = new Date(draftedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Highlight [EVIDENCE REQUIRED] markers
  const renderedContent = content
    .replace(
      /\[EVIDENCE REQUIRED[^\]]*\]/g,
      (match) =>
        `<span class="evidence-required">${match}</span>`
    )
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${sectionTitle} — ${modelName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
    padding: 48px 56px;
  }
  .header {
    border-bottom: 2px solid #1e3a5f;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .header h1 {
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #1e3a5f;
  }
  .header h2 {
    font-size: 18pt;
    font-weight: 700;
    margin-top: 4px;
    color: #111;
  }
  .meta {
    margin-top: 8px;
    font-size: 9pt;
    color: #555;
  }
  .content {
    margin-top: 24px;
    font-size: 11pt;
    line-height: 1.7;
  }
  .evidence-required {
    background: #fef3c7;
    color: #92400e;
    border-radius: 2px;
    padding: 1px 4px;
    font-size: 9pt;
    font-weight: 600;
  }
  .disclaimer {
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 8pt;
    color: #6b7280;
    font-style: italic;
  }
  @page {
    margin: 20mm 18mm;
    @bottom-center {
      content: "DRAFT — " counter(page) " of " counter(pages);
      font-size: 8pt;
      color: #9ca3af;
    }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Validation Evidence Pack</h1>
    <h2>${sectionTitle}</h2>
    <p class="meta">Model: ${modelName} &nbsp;|&nbsp; Drafted: ${dated} &nbsp;|&nbsp; DRAFT</p>
  </div>

  <div class="content">${renderedContent}</div>

  <div class="disclaimer">${DISCLAIMER}</div>
</body>
</html>`;
}

export async function exportSectionToPdf(opts: ExportOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(opts), { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
