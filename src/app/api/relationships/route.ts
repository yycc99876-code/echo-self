import { NextRequest, NextResponse } from "next/server";
import {
  deleteRelationshipItem,
  getMemoryState,
  saveRelationshipItem,
  type RelationshipItem,
} from "@/lib/server-memory-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<RelationshipItem>;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const item = saveRelationshipItem({
    name: body.name.trim(),
    type: body.type ?? "other",
    notes: body.notes ?? "",
    strength: body.strength ?? "medium",
    lastInteraction: body.lastInteraction,
  });

  return NextResponse.json({ item, memoryState: getMemoryState() });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  deleteRelationshipItem(id);
  return NextResponse.json({ ok: true, memoryState: getMemoryState() });
}
