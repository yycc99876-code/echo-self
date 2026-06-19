"use client";

import { useEffect, useState } from "react";
import {
  getWikiPages,
  getActiveMemory,
  type WikiPage,
  type ActiveMemory,
} from "@/lib/memory-store";

export default function MemoryPage() {
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [activeMemory, setActiveMemory] = useState<ActiveMemory | null>(null);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);

  useEffect(() => {
    setWikiPages(getWikiPages());
    setActiveMemory(getActiveMemory());
  }, []);

  return (
    <div className="flex h-screen max-h-screen">
      {/* Sidebar: wiki page list */}
      <div className="w-64 border-r border-[var(--card-border)] overflow-y-auto hidden md:block">
        <div className="p-4 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-semibold text-[var(--accent-light)]">记忆页面</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {wikiPages.length} 条记忆
          </p>
        </div>
        <div className="p-2 space-y-1">
          {wikiPages.length === 0 && (
            <p className="text-xs text-[var(--muted)] px-2 py-4">
              还没有记忆页面。在 Echo 中对话会自动生成。
            </p>
          )}
          {wikiPages.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelectedPage(page)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                selectedPage?.id === page.id
                  ? "bg-[#1a1a1a] text-[var(--accent-light)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[#111]"
              }`}
            >
              <div className="font-medium truncate">{page.title}</div>
              <div className="text-xs text-[var(--muted)] truncate mt-0.5">
                {page.tags.join(", ") || "无标签"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Active Memory section */}
        <div className="p-6 border-b border-[var(--card-border)]">
          <h2 className="text-sm font-semibold text-[var(--accent-light)] mb-2">
            活跃记忆
          </h2>
          {activeMemory ? (
            <div className="prose text-sm text-[var(--foreground)] max-w-none">
              <p>{activeMemory.contentMd}</p>
              <p className="text-xs text-[var(--muted)] mt-2">
                更新于 {new Date(activeMemory.updatedAt).toLocaleString("zh-CN")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              还没有活跃记忆。开始对话后会自动生成。
            </p>
          )}
        </div>

        {/* Selected wiki page detail */}
        {selectedPage ? (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-xl font-bold">{selectedPage.title}</h1>
              <span className="text-xs text-[var(--muted)] bg-[#1a1a1a] px-2 py-0.5 rounded">
                /{selectedPage.slug}
              </span>
            </div>
            <div className="flex gap-1 mb-4">
              {selectedPage.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-[#2d261e] text-[var(--accent-light)] px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="prose text-sm text-[var(--foreground)] max-w-none">
              {selectedPage.contentMd}
            </div>
            <p className="text-xs text-[var(--muted)] mt-6">
              创建于 {new Date(selectedPage.createdAt).toLocaleString("zh-CN")} ·
              更新于 {new Date(selectedPage.updatedAt).toLocaleString("zh-CN")}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-[var(--muted)]">选择一个记忆页面查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}
