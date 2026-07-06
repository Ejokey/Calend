"use client";

import { useEffect, useState } from "react";

type EventType = {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  description: string | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  isActive: boolean;
};

export default function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [description, setDescription] = useState("");
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(0);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(0);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/event-types");
    if (res.ok) {
      setEventTypes(await res.json());
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const res = await fetch("/api/event-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        durationMinutes,
        description: description || undefined,
        bufferBeforeMinutes,
        bufferAfterMinutes,
      }),
    });

    setCreating(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.formErrors?.[0] ?? "Failed to create event type");
      return;
    }

    setTitle("");
    setDurationMinutes(30);
    setDescription("");
    setBufferBeforeMinutes(0);
    setBufferAfterMinutes(0);
    load();
  }

  async function toggleActive(eventType: EventType) {
    await fetch(`/api/event-types/${eventType.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !eventType.isActive }),
    });
    load();
  }

  async function remove(eventType: EventType) {
    if (!confirm(`Delete "${eventType.title}"?`)) return;
    await fetch(`/api/event-types/${eventType.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Event types</h1>
        {eventTypes === null && <p className="text-sm text-zinc-500">Loading...</p>}
        {eventTypes?.length === 0 && (
          <p className="text-sm text-zinc-500">No event types yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {eventTypes?.map((et) => (
            <li
              key={et.id}
              className="flex items-center justify-between rounded border px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {et.title}{" "}
                  <span className="text-sm text-zinc-500">
                    ({et.durationMinutes} min)
                  </span>
                </p>
                {et.description && (
                  <p className="text-sm text-zinc-600">{et.description}</p>
                )}
                <p className="text-xs text-zinc-400">/{et.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActive(et)}
                  className="text-sm underline"
                >
                  {et.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => remove(et)}
                  className="text-sm text-red-600 underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">New event type</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4 max-w-md">
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              className="rounded border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Duration (minutes)
            <input
              type="number"
              min={5}
              max={1440}
              className="rounded border px-3 py-2"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <textarea
              className="rounded border px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Buffer before (min)
              <input
                type="number"
                min={0}
                max={1440}
                className="rounded border px-3 py-2"
                value={bufferBeforeMinutes}
                onChange={(e) => setBufferBeforeMinutes(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Buffer after (min)
              <input
                type="number"
                min={0}
                max={1440}
                className="rounded border px-3 py-2"
                value={bufferAfterMinutes}
                onChange={(e) => setBufferAfterMinutes(Number(e.target.value))}
              />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create event type"}
          </button>
        </form>
      </section>
    </div>
  );
}
