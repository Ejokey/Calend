"use client";

import { useEffect, useState } from "react";

type Rule = { weekday: number; startTime: string; endTime: string };
type Exception = {
  id: string;
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function normalizeTime(value: string) {
  // DB returns HH:MM:SS, inputs use HH:MM
  return value.slice(0, 5);
}

export default function AvailabilityPage() {
  const [enabledDays, setEnabledDays] = useState<Record<number, boolean>>({});
  const [times, setTimes] = useState<
    Record<number, { startTime: string; endTime: string }>
  >({});
  const [savingRules, setSavingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [exceptions, setExceptions] = useState<Exception[] | null>(null);
  const [exDate, setExDate] = useState("");
  const [exBlocked, setExBlocked] = useState(true);
  const [exStart, setExStart] = useState("09:00");
  const [exEnd, setExEnd] = useState("17:00");
  const [exError, setExError] = useState<string | null>(null);

  async function loadRules() {
    const res = await fetch("/api/availability/rules");
    if (!res.ok) return;
    const rules: Rule[] = await res.json();

    const nextEnabled: Record<number, boolean> = {};
    const nextTimes: Record<number, { startTime: string; endTime: string }> = {};
    for (const rule of rules) {
      nextEnabled[rule.weekday] = true;
      nextTimes[rule.weekday] = {
        startTime: normalizeTime(rule.startTime),
        endTime: normalizeTime(rule.endTime),
      };
    }
    setEnabledDays(nextEnabled);
    setTimes(nextTimes);
  }

  async function loadExceptions() {
    const res = await fetch("/api/availability/exceptions");
    if (res.ok) {
      setExceptions(await res.json());
    }
  }

  useEffect(() => {
    loadRules();
    loadExceptions();
  }, []);

  async function saveRules(e: React.FormEvent) {
    e.preventDefault();
    setRulesError(null);
    setSavingRules(true);

    const rules = Object.entries(enabledDays)
      .filter(([, enabled]) => enabled)
      .map(([weekday]) => {
        const t = times[Number(weekday)] ?? { startTime: "09:00", endTime: "17:00" };
        return { weekday: Number(weekday), startTime: t.startTime, endTime: t.endTime };
      });

    const res = await fetch("/api/availability/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });

    setSavingRules(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRulesError(data?.error?.[0] ?? "Failed to save availability");
      return;
    }

    loadRules();
  }

  async function addException(e: React.FormEvent) {
    e.preventDefault();
    setExError(null);

    const res = await fetch("/api/availability/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: exDate,
        isBlocked: exBlocked,
        startTime: exBlocked ? undefined : exStart,
        endTime: exBlocked ? undefined : exEnd,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setExError(data?.error?.[0] ?? "Failed to add exception");
      return;
    }

    setExDate("");
    loadExceptions();
  }

  async function removeException(id: string) {
    await fetch(`/api/availability/exceptions/${id}`, { method: "DELETE" });
    loadExceptions();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Weekly availability</h1>
        <form onSubmit={saveRules} className="flex flex-col gap-3 max-w-md">
          {WEEKDAY_LABELS.map((label, weekday) => (
            <div key={weekday} className="flex items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!enabledDays[weekday]}
                  onChange={(e) =>
                    setEnabledDays((prev) => ({
                      ...prev,
                      [weekday]: e.target.checked,
                    }))
                  }
                />
                {label}
              </label>
              <input
                type="time"
                disabled={!enabledDays[weekday]}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                value={times[weekday]?.startTime ?? "09:00"}
                onChange={(e) =>
                  setTimes((prev) => ({
                    ...prev,
                    [weekday]: {
                      startTime: e.target.value,
                      endTime: prev[weekday]?.endTime ?? "17:00",
                    },
                  }))
                }
              />
              <span className="text-sm text-zinc-500">to</span>
              <input
                type="time"
                disabled={!enabledDays[weekday]}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                value={times[weekday]?.endTime ?? "17:00"}
                onChange={(e) =>
                  setTimes((prev) => ({
                    ...prev,
                    [weekday]: {
                      startTime: prev[weekday]?.startTime ?? "09:00",
                      endTime: e.target.value,
                    },
                  }))
                }
              />
            </div>
          ))}
          {rulesError && <p className="text-sm text-red-600">{rulesError}</p>}
          <button
            type="submit"
            disabled={savingRules}
            className="mt-2 w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {savingRules ? "Saving..." : "Save availability"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Date overrides</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {exceptions?.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded border px-4 py-2 text-sm"
            >
              <span>
                {ex.date} —{" "}
                {ex.isBlocked
                  ? "Unavailable"
                  : `${normalizeTime(ex.startTime!)} - ${normalizeTime(ex.endTime!)}`}
              </span>
              <button
                onClick={() => removeException(ex.id)}
                className="text-red-600 underline"
              >
                Remove
              </button>
            </li>
          ))}
          {exceptions?.length === 0 && (
            <p className="text-sm text-zinc-500">No overrides yet.</p>
          )}
        </ul>

        <form onSubmit={addException} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              className="rounded border px-2 py-1"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={exBlocked}
              onChange={(e) => setExBlocked(e.target.checked)}
            />
            Block entire day
          </label>
          {!exBlocked && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Start
                <input
                  type="time"
                  className="rounded border px-2 py-1"
                  value={exStart}
                  onChange={(e) => setExStart(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                End
                <input
                  type="time"
                  className="rounded border px-2 py-1"
                  value={exEnd}
                  onChange={(e) => setExEnd(e.target.value)}
                />
              </label>
            </>
          )}
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Add override
          </button>
        </form>
        {exError && <p className="mt-2 text-sm text-red-600">{exError}</p>}
      </section>
    </div>
  );
}
