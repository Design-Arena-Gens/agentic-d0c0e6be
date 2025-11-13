import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { mockViolations } from "@/lib/mock-data";
import { fetchViolations } from "@/lib/violations/fetchViolations";
import { ViolationFilters } from "@/lib/violations/types";

const parseLimit = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, 100);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: ViolationFilters = {
    city: searchParams.get("city") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    query: searchParams.get("query") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    limit: parseLimit(searchParams.get("limit")),
  };

  if (env.mockMode) {
    return NextResponse.json({
      items: mockViolations,
      providersQueried: ["mock"],
      providersMatched: ["mock"],
    });
  }

  const result = await fetchViolations(filters);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
