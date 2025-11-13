"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export type SearchFilters = {
  query: string;
  city: string;
  state: string;
  status: string;
  startDate: string;
  endDate: string;
  limit: number;
};

type Props = {
  filters: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
  availableStates: string[];
};

const limitOptions = [25, 50, 100];
const statusOptions = [
  { label: "Any status", value: "" },
  { label: "Open / Active", value: "OPEN" },
  { label: "Closed / Resolved", value: "CLOSED" },
];

const SearchForm = ({ filters, onSearch, availableStates }: Props) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateField = <Key extends keyof SearchFilters>(
    key: Key,
    value: SearchFilters[Key],
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(localFilters);
  };

  const handleReset = () => {
    const reset = {
      query: "",
      city: "",
      state: "",
      status: "",
      startDate: "",
      endDate: "",
      limit: 25,
    };
    setLocalFilters(reset);
    onSearch(reset);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-zinc-700">
            Keywords or address
          </label>
          <input
            type="text"
            value={localFilters.query}
            onChange={(event) => updateField("query", event.target.value)}
            placeholder="Property address, owner, violation keywords"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            City
          </label>
          <input
            type="text"
            value={localFilters.city}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            State
          </label>
          <select
            value={localFilters.state}
            onChange={(event) => updateField("state", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">All states</option>
            {availableStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Status
          </label>
          <select
            value={localFilters.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Start date
          </label>
          <input
            type="date"
            value={localFilters.startDate}
            onChange={(event) => updateField("startDate", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            End date
          </label>
          <input
            type="date"
            value={localFilters.endDate}
            onChange={(event) => updateField("endDate", event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700">
            Result limit
          </label>
          <select
            value={localFilters.limit}
            onChange={(event) =>
              updateField("limit", Number.parseInt(event.target.value, 10))
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          Run search
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={clsx(
            "inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition",
            "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-200",
          )}
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default SearchForm;
