import type { LifeChartInput } from "./life-chart-generator";
import type { MemoryState, RelationshipItem } from "./server-memory-store";
import type { ConversationType } from "./conversation-context";

export type EchoResponse = {
  reply: string;
  assistantMessageId: string;
  conversationType: ConversationType;
  memoryUpdateStatus: "queued" | "skipped" | "completed";
};

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchMemoryState() {
  return parse<MemoryState>(await fetch("/api/memory-state", { cache: "no-store" }));
}

export async function sendEchoMessage(message: string, inputType: "text" | "voice" = "text") {
  return parse<EchoResponse>(
    await fetch("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, inputType }),
    }),
  );
}

export async function createLifeChart(input: LifeChartInput) {
  return parse<{ lifeChart: MemoryState["lifeChart"] }>(
    await fetch("/api/life-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function createRelationship(item: Pick<RelationshipItem, "name" | "type" | "notes" | "strength">) {
  return parse<{ item: RelationshipItem; memoryState: MemoryState }>(
    await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }),
  );
}

export async function removeRelationship(id: string) {
  return parse<{ ok: true; memoryState: MemoryState }>(await fetch(`/api/relationships?id=${id}`, { method: "DELETE" }));
}
