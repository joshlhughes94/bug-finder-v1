import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/app/lib/scanner";
import type { ScanRequest } from "@/app/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ScanRequest>;

    const url = body.url?.trim();
    const maxPages = Number(body.maxPages ?? 5);

    // Validate input
    if (!url) {
      return NextResponse.json(
        { error: "URL is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(maxPages) || maxPages < 1 || maxPages > 25) {
      return NextResponse.json(
        { error: "maxPages must be between 1 and 25." },
        { status: 400 }
      );
    }

    // Run scan
    const report = await runScan(url, maxPages);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}