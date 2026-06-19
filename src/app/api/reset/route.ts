import { NextResponse } from "next/server";
import { resetAllMemory } from "@/lib/server-memory-store";

export async function POST() {
  resetAllMemory();
  return NextResponse.json({ ok: true });
}
