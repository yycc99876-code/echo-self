import { NextResponse } from "next/server";
import { getMemoryState } from "@/lib/server-memory-store";

export async function GET() {
  return NextResponse.json(getMemoryState());
}
