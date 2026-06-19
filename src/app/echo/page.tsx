"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { WikiPanel } from "@/components/WikiPanel";

export default function EchoPage() {
  const [wikiRefreshKey, setWikiRefreshKey] = useState(0);

  const handleWikiUpdate = useCallback(() => {
    setWikiRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Page header */}
      <div
        className="flex-shrink-0 px-6 py-3 border-b flex items-center justify-between"
        style={{
          borderColor: "#2a2520",
          background: "#1A1715",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-sm font-mono"
            style={{ color: "#EFDAA3" }}
          >
            &gt;_
          </div>
          <div>
            <h1
              className="text-sm font-medium tracking-wide"
              style={{ color: "#EFDAA3" }}
            >
              Echo
            </h1>
            <p className="text-[10px]" style={{ color: "#555" }}>
              和你的数字分身对话
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#7dba6d" }}
          />
          <span className="text-[11px]" style={{ color: "#666" }}>
            已连接
          </span>
        </div>
      </div>

      {/* Main content: two-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat panel */}
        <div
          className="flex-1 border-r flex flex-col min-h-0"
          style={{ borderColor: "#2a2520" }}
        >
          <ChatPanel onWikiUpdate={handleWikiUpdate} />
        </div>

        {/* Right: Wiki panel */}
        <div className="w-[380px] flex-shrink-0 hidden lg:flex flex-col min-h-0">
          <WikiPanel refreshKey={wikiRefreshKey} />
        </div>
      </div>

      {/* Mobile wiki toggle hint */}
      <div
        className="lg:hidden fixed bottom-20 right-4 z-40"
      >
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: "#EFDAA3",
            color: "#1A1715",
            boxShadow: "0 4px 12px rgba(239, 218, 163, 0.3)",
          }}
          title="查看关系记忆 (桌面端可见)"
        >
          <span className="text-xs font-mono font-bold">#</span>
        </button>
      </div>
    </div>
  );
}
