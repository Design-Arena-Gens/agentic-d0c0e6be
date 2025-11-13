"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import clsx from "clsx";
import { PropertyViolation } from "@/lib/violations/types";
import { OwnerContact } from "@/lib/skipTrace";
import { MortgageStatus } from "@/lib/mortgage";
import { ViolationProviderSummary } from "@/lib/violations/fetchViolations";
import SearchForm, { SearchFilters } from "./SearchForm";

type ViolationsResponse = {
  items: PropertyViolation[];
  providersQueried: string[];
  providersMatched: string[];
};

type ProvidersResponse = {
  providers: ViolationProviderSummary[];
};

type PropertyEnrichment = {
  image?: {
    id: string;
    name: string;
    thumbnailLink?: string;
    webViewLink?: string;
  } | null;
  owner: OwnerContact | null;
  mortgage: MortgageStatus | null;
  integrations: {
    googleDrive: boolean;
    skipTrace: boolean;
    mortgage: boolean;
    mockMode: boolean;
  };
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  });

const enrichProperty = async (
  payload: {
    address: string;
    city?: string;
    state?: string;
    postalCode?: string;
  },
  signal?: AbortSignal,
) => {
  const response = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to enrich property");
  }
  return (await response.json()) as PropertyEnrichment;
};

type EnrichmentKey = readonly [string, string, string, string, string];

const enrichmentFetcher = (
  [, address, city, state, postalCode]: EnrichmentKey,
) =>
  enrichProperty({
    address,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
  });

const initialFilters: SearchFilters = {
  query: "",
  city: "",
  state: "",
  status: "",
  startDate: "",
  endDate: "",
  limit: 25,
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return value;
  }
};

const statusBadgeClass = (status?: string) => {
  if (!status) return "bg-zinc-200 text-zinc-700";
  const normalized = status.toLowerCase();
  if (normalized.includes("open") || normalized.includes("active")) {
    return "bg-amber-100 text-amber-800";
  }
  if (
    normalized.includes("close") ||
    normalized.includes("resolved") ||
    normalized.includes("complete")
  ) {
    return "bg-emerald-100 text-emerald-800";
  }
  return "bg-zinc-200 text-zinc-700";
};

const ProvidersSummary = ({ providers }: { providers: ViolationProviderSummary[] }) => {
  if (!providers.length) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
      {providers.map((provider) => (
        <span
          key={provider.id}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm"
        >
          {provider.name}
        </span>
      ))}
    </div>
  );
};

const PropertyTable = ({
  items,
  onSelect,
  selectedId,
}: {
  items: PropertyViolation[];
  onSelect: (item: PropertyViolation) => void;
  selectedId?: string | null;
}) => {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
        No violations found for the current filters. Adjust the search criteria to broaden the
        results.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-zinc-100 text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Address</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.map((item) => (
            <tr
              key={item.id}
              className={clsx(
                "cursor-pointer transition hover:bg-sky-50",
                selectedId === item.id && "bg-sky-50",
              )}
              onClick={() => onSelect(item)}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-zinc-900">{item.address || "Unknown address"}</div>
                <div className="mt-1 line-clamp-2 max-w-xl text-xs text-zinc-500">
                  {item.description ?? "—"}
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-700">{item.city}</td>
              <td className="px-4 py-3 text-zinc-700">{item.state}</td>
              <td className="px-4 py-3 text-zinc-600">{formatDate(item.violationDate)}</td>
              <td className="px-4 py-3">
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                    statusBadgeClass(item.status),
                  )}
                >
                  {item.status ?? "Unknown"}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-600">{item.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const PropertyDetails = ({
  property,
  enrichment,
  loading,
  error,
}: {
  property: PropertyViolation | null;
  enrichment: PropertyEnrichment | null;
  loading: boolean;
  error: string | null;
}) => {
  if (!property) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-600">
        Select a property to view owner insights, Google Drive imagery, and mortgage signals.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Property details</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {property.address}, {property.city}, {property.state} {property.zip ?? ""}
        </p>
      </div>

      <div className="space-y-3 text-sm text-zinc-600">
        <div>
          <span className="font-medium text-zinc-900">Violation status:</span>{" "}
          {property.status ?? "Unknown"}
        </div>
        <div>
          <span className="font-medium text-zinc-900">Violation date:</span>{" "}
          {formatDate(property.violationDate)}
        </div>
        <div>
          <span className="font-medium text-zinc-900">Source:</span> {property.source}
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
          Retrieving owner contacts, Google Drive imagery, and mortgage data…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {enrichment && !loading && !error && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Property imagery
            </h3>
            {enrichment.image ? (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
                {enrichment.image.thumbnailLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={enrichment.image.thumbnailLink}
                    alt={enrichment.image.name}
                    className="h-24 w-24 rounded-lg object-cover ring-1 ring-zinc-200"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-500">
                    No preview
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-zinc-900">{enrichment.image.name}</div>
                  {enrichment.image.webViewLink && (
                    <a
                      href={enrichment.image.webViewLink}
                      className="mt-1 inline-flex items-center text-sm font-medium text-sky-600 hover:text-sky-700"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Drive
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                No Google Drive imagery located for this address.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Skip tracing
            </h3>
            {enrichment.owner?.source === "unavailable" && enrichment.owner.message ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                {enrichment.owner.message}
              </div>
            ) : enrichment.owner ? (
              <div className="space-y-2 rounded-lg border border-zinc-200 p-4">
                {enrichment.owner.fullName && (
                  <div className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">Owner:</span>{" "}
                    {enrichment.owner.fullName}
                  </div>
                )}
                {!!enrichment.owner.phones?.length && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Phone numbers
                    </div>
                    <ul className="mt-1 space-y-1 text-sm text-zinc-700">
                      {enrichment.owner.phones.map((phone) => (
                        <li key={phone.number}>
                          {phone.number}{" "}
                          {phone.type && (
                            <span className="text-xs uppercase text-zinc-400">
                              ({phone.type})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!enrichment.owner.emails?.length && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Emails
                    </div>
                    <ul className="mt-1 space-y-1 text-sm text-zinc-700">
                      {enrichment.owner.emails.map((email) => (
                        <li key={email}>{email}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {enrichment.owner.mailingAddress && (
                  <div className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">Mailing address:</span>{" "}
                    {enrichment.owner.mailingAddress}
                  </div>
                )}
                {enrichment.owner.confidence !== undefined && (
                  <div className="text-xs text-zinc-500">
                    Confidence score: {(enrichment.owner.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                No owner profile found.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Mortgage health
            </h3>
            {enrichment.mortgage?.source === "unavailable" && enrichment.mortgage.message ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                {enrichment.mortgage.message}
              </div>
            ) : enrichment.mortgage ? (
              <div className="space-y-2 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700">
                <div>
                  <span className="font-medium text-zinc-900">Delinquent:</span>{" "}
                  {enrichment.mortgage.isDelinquent === undefined
                    ? "Unknown"
                    : enrichment.mortgage.isDelinquent
                      ? "Yes"
                      : "No"}
                </div>
                {enrichment.mortgage.lastPaymentDate && (
                  <div>
                    <span className="font-medium text-zinc-900">Last payment date:</span>{" "}
                    {formatDate(enrichment.mortgage.lastPaymentDate)}
                  </div>
                )}
                {enrichment.mortgage.currentLender && (
                  <div>
                    <span className="font-medium text-zinc-900">Current lender:</span>{" "}
                    {enrichment.mortgage.currentLender}
                  </div>
                )}
                {enrichment.mortgage.loanAmount && (
                  <div>
                    <span className="font-medium text-zinc-900">Loan amount:</span>{" "}
                    ${enrichment.mortgage.loanAmount.toLocaleString()}
                  </div>
                )}
                {enrichment.mortgage.delinquentAmount && (
                  <div>
                    <span className="font-medium text-zinc-900">Past due:</span>{" "}
                    ${enrichment.mortgage.delinquentAmount.toLocaleString()}
                  </div>
                )}
                {enrichment.mortgage.notes && (
                  <div className="text-xs text-zinc-500">{enrichment.mortgage.notes}</div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                No mortgage data returned.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const HomeScreen = () => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [selected, setSelected] = useState<PropertyViolation | null>(null);
  const [providerSummaries, setProviderSummaries] = useState<ViolationProviderSummary[]>([]);

  useEffect(() => {
    fetcher("/api/providers")
      .then((data: ProvidersResponse) => setProviderSummaries(data.providers))
      .catch((error) => {
        console.error("Failed to load provider summaries", error);
      });
  }, []);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (filters.query) searchParams.set("query", filters.query);
    if (filters.city) searchParams.set("city", filters.city);
    if (filters.state) searchParams.set("state", filters.state);
    if (filters.status) searchParams.set("status", filters.status);
    if (filters.startDate) searchParams.set("startDate", filters.startDate);
    if (filters.endDate) searchParams.set("endDate", filters.endDate);
    if (filters.limit) searchParams.set("limit", String(filters.limit));
    return searchParams.toString();
  }, [filters]);

  const { data, error, isLoading } = useSWR<ViolationsResponse>(
    `/api/properties?${params}`,
    fetcher,
    { keepPreviousData: true },
  );

  const handleSelect = useCallback((item: PropertyViolation) => {
    setSelected((previous) => (previous?.id === item.id ? null : item));
  }, []);

  const onSearch = useCallback((next: SearchFilters) => {
    setFilters(next);
    setSelected(null);
  }, []);

  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    providerSummaries.forEach((provider) => {
      provider.jurisdiction.forEach((area) => states.add(area.state));
    });
    return Array.from(states).sort();
  }, [providerSummaries]);

  const enrichmentKey = selected
    ? ([
        "enrich",
        selected.address,
        selected.city ?? "",
        selected.state ?? "",
        selected.zip ?? "",
      ] as const)
    : null;

  const {
    data: enrichmentData,
    error: enrichmentError,
    isValidating: enrichmentValidating,
  } = useSWR<PropertyEnrichment, Error, EnrichmentKey | null>(
    enrichmentKey,
    enrichmentFetcher,
    { revalidateOnFocus: false },
  );

  const enrichmentLoading =
    Boolean(selected) &&
    (enrichmentValidating || (!enrichmentData && !enrichmentError));

  const displayedItems = data?.items ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Violation Discovery & Owner Intelligence
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600">
              Aggregate municipal violation data across the United States, surface owner contact
              profiles, and flag potential mortgage delinquencies in a single research command
              center.
            </p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Connected providers: {providerSummaries.length} jurisdictions
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <SearchForm
          filters={filters}
          onSearch={onSearch}
          availableStates={uniqueStates}
        />

        <ProvidersSummary providers={providerSummaries} />

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {isLoading && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                Loading violation data…
              </div>
            )}
            <PropertyTable
              items={displayedItems}
              onSelect={handleSelect}
              selectedId={selected?.id}
            />
          </div>
          <PropertyDetails
            property={selected}
            enrichment={selected ? enrichmentData ?? null : null}
            loading={enrichmentLoading}
            error={selected && enrichmentError ? enrichmentError.message : null}
          />
        </div>
      </main>
    </div>
  );
};

export default HomeScreen;
