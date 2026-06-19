"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { fetchMemoryState } from "@/lib/api-client";
import type { MemoryState, WikiPage } from "@/lib/server-memory-store";

const filters = [
  { label: "全部", value: "all" },
  { label: "命谱", value: "life-chart" },
  { label: "对话", value: "theme" },
  { label: "纠正", value: "correction" },
  { label: "关系", value: "relationship" },
  { label: "行动建议", value: "questions" },
];

export default function MemoryPage() {
  const [state, setState] = useState<MemoryState | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<WikiPage | null>(null);

  useEffect(() => {
    fetchMemoryState().then((next) => {
      setState(next);
      setSelected(next.wikiPages[0] ?? null);
    });
  }, []);

  const pages = useMemo(() => {
    const all = state?.wikiPages ?? [];
    return all.filter((page) => {
      const matchesQuery = `${page.title} ${page.slug} ${page.contentMd}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || page.tags.includes(filter) || page.slug.includes(filter);
      return matchesQuery && matchesFilter;
    });
  }, [state, query, filter]);

  return (
    <div className="grid min-h-screen gap-0 lg:grid-cols-[380px_1fr]">
      <aside className="border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6">
        <div className="font-label text-[11px] text-[var(--accent)]">MEMORY ARCHIVE</div>
        <h1 className="mt-2 text-2xl font-semibold">记忆档案库</h1>
        <p className="mt-3 text-xs leading-6 text-[var(--text-tertiary)]">
          这里不是完整聊天记录，只显示 Echo 从重要对话里沉淀出的长期理解。
        </p>
        <input className="field mt-6" placeholder="搜索记忆..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                filter === item.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "border-[var(--border-subtle)] text-[var(--text-tertiary)]"
              }`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setSelected(page)}
              className={`w-full rounded-[var(--radius-md)] border p-4 text-left transition ${
                selected?.id === page.id
                  ? "border-[var(--border-strong)] bg-[var(--bg-panel)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
              }`}
            >
              <div className="text-sm text-[var(--text-primary)]">{page.title}</div>
              <div className="font-label mt-1 text-[10px] text-[var(--text-faint)]">/{page.slug}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {page.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--archive-soft)] px-2 py-0.5 text-[10px] text-[var(--archive)]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="p-6 md:p-10">
        {!state || state.wikiPages.length === 0 ? (
          <div className="panel mx-auto mt-24 max-w-xl p-8 text-center">
            <div className="font-label text-[11px] text-[var(--archive)]">EMPTY ARCHIVE</div>
            <h2 className="mt-3 text-2xl font-semibold">还没有记忆。</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              当你开始和 Echo 对话后，重要内容会被整理成可回看的档案。
            </p>
          </div>
        ) : selected ? (
          <article className="panel max-w-4xl p-7">
            <div className="font-label text-[11px] text-[var(--text-faint)]">/{selected.slug}</div>
            <h2 className="mt-2 text-3xl font-semibold">{selected.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
              <span>创建：{new Date(selected.createdAt).toLocaleString("zh-CN")}</span>
              <span>更新：{new Date(selected.updatedAt).toLocaleString("zh-CN")}</span>
              <span>引用：{selected.references}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-xs text-[var(--accent-strong)]">
                  {tag}
                </span>
              ))}
            </div>
            <div className="markdown mt-8">
              <ReactMarkdown>{selected.contentMd}</ReactMarkdown>
            </div>
            <div className="mt-8 border-t border-[var(--border-subtle)] pt-5">
              <div className="font-label text-[11px] text-[var(--text-faint)]">相关记忆</div>
              <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                {selected.relatedSlugs.length ? selected.relatedSlugs.map((slug) => `/${slug}`).join("  ") : "暂无相关记忆。"}
              </p>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
}
