"use client";

import { useMemo, useState } from "react";

export interface PickerTown {
  id: number;
  name: string;
  county: string;
  feeGc: number | null;
  expiryLabel: string;
  confidence: string;
}

/** Checkbox grid with search; submits as repeated `townIds` fields inside the parent form. */
export function TownPicker({ towns, preselected = [], disabledIds = [], max = null }: { towns: PickerTown[]; preselected?: number[]; disabledIds?: number[]; max?: number | null }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set(preselected));
  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);
  const shown = towns.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.county.toLowerCase().includes(q.toLowerCase()));
  const atMax = max !== null && selected.size >= max;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (!atMax) next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search towns…" className="input max-w-xs" aria-label="Search towns" />
        <div className="text-sm text-slate-600">
          <strong className="text-slate-900">{selected.size}</strong> selected{max !== null ? ` (plan limit ${max})` : ""}
          {selected.size > 0 ? (
            <button type="button" onClick={() => setSelected(new Set())} className="ml-3 text-xs text-slate-500 underline">
              clear
            </button>
          ) : null}
        </div>
      </div>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="townIds" value={id} />
      ))}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => {
          const isDisabled = disabled.has(t.id);
          const isOn = selected.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={isDisabled || (!isOn && atMax)}
                onClick={() => toggle(t.id)}
                aria-pressed={isOn}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  isDisabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : isOn ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-400"
                } disabled:opacity-70`}
              >
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${isOn ? "border-white bg-white text-slate-900" : "border-slate-300"}`}>{isOn ? "✓" : ""}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.name}</span>
                  <span className={`block text-xs ${isOn ? "text-slate-300" : "text-slate-500"}`}>
                    {t.county} · {t.feeGc === null ? "fee n/p" : `$${t.feeGc}`} · expires {t.expiryLabel}
                    {isDisabled ? " · already added" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No towns match.</p> : null}
    </div>
  );
}
