import { NextResponse } from "next/server";
import { listProviderSummaries } from "@/lib/violations/fetchViolations";

export function GET() {
  return NextResponse.json({
    providers: listProviderSummaries(),
  });
}
