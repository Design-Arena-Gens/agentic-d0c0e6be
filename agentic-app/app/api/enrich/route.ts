import { NextResponse } from "next/server";
import { env, isIntegrationConfigured } from "@/lib/env";
import { findPropertyImage } from "@/lib/googleDrive";
import { fetchMortgageStatus } from "@/lib/mortgage";
import { skipTraceOwner } from "@/lib/skipTrace";

type EnrichPayload = {
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  ownerName?: string;
};

const parseBody = async (request: Request): Promise<EnrichPayload> => {
  const json = await request.json();
  if (!json?.address) {
    throw new Error("address is required");
  }
  return {
    address: json.address,
    city: json.city,
    state: json.state,
    postalCode: json.postalCode,
    ownerName: json.ownerName,
  };
};

export async function POST(request: Request) {
  try {
    const payload = await parseBody(request);

    const [image, owner, mortgage] = await Promise.all([
      findPropertyImage(
        `${payload.address} ${payload.city ?? ""} ${payload.state ?? ""}`,
      ),
      skipTraceOwner({
        fullName: payload.ownerName,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
      }),
      fetchMortgageStatus({
        address: payload.address,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
      }),
    ]);

    return NextResponse.json({
      image,
      owner,
      mortgage,
      integrations: {
        googleDrive: isIntegrationConfigured.googleDrive,
        skipTrace: isIntegrationConfigured.skipTrace,
        mortgage: isIntegrationConfigured.mortgage,
        mockMode: env.mockMode,
      },
    });
  } catch (error) {
    console.error("Enrichment failed", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to enrich property" },
      { status: 400 },
    );
  }
}
