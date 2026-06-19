"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { MemoryInspector } from "@/components/MemoryInspector";
import type { MemoryState } from "@/lib/server-memory-store";

export default function EchoPage() {
  const [memoryState, setMemoryState] = useState<MemoryState | null>(null);
  const [memoryUpdateStatus, setMemoryUpdateStatus] = useState<"idle" | "updating" | "skipped">("idle");

  return (
    <div className="flex h-screen min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border-subtle)] px-6 py-5">
          <div className="font-label text-[11px] text-[var(--text-faint)]">ECHO CONVERSATION</div>
          <h1 className="mt-1 text-2xl font-semibold">Echo</h1>
          <p className="text-sm text-[var(--text-tertiary)]">和你的命谱数字人对话</p>
        </header>
        <ChatPanel onMemoryState={setMemoryState} onMemoryUpdating={setMemoryUpdateStatus} />
      </section>
      <div className="hidden w-[390px] shrink-0 xl:block">
        <MemoryInspector state={memoryState} updateStatus={memoryUpdateStatus} />
      </div>
    </div>
  );
}
