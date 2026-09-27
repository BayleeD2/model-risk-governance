import { NextResponse } from "next/server";
import { runNightlyDriftChecks } from "@/jobs/nightly-drift-checks";

// GET or POST /api/v1/jobs — runs the nightly drift checks.
// Vercel Cron calls it with GET (see vercel.json). Requires CRON_SECRET:
// if the secret is not set, the endpoint refuses every request.
export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNightlyDriftChecks();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Nightly drift check failed:", err);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
