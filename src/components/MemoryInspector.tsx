"use client";

import type { MemoryState, WikiPage } from "@/lib/server-memory-store";

function pageBySlug(pages: WikiPage[], slug: string) {
  return pages.find((page) => page.slug === slug);
}

export function MemoryInspector({
  state,
  updateStatus,
}: {
  state: MemoryState | null;
  updateStatus: "idle" | "updating" | "skipped";
}) {
  const pages = state?.wikiPages ?? [];
  const rules = pageBySlug(pages, "rules/future-response-rules");
  const theme = pageBySlug(pages, "destiny/current-theme") ?? pageBySlug(pages, "product/current-direction");
  const recent = pages.slice(0, 5);
  const edits = state?.wikiEdits.slice(0, 6) ?? [];
  const empty = !state?.activeMemory && pages.length === 0;

  return (
    <aside className="h-full overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
      <div className="border-b border-[var(--border-subtle)] p-5">
        <div className="font-label text-[11px] text-[var(--accent)]">RELATIONSHIP WIKI MEMORY</div>
        <h2 className="mt-2 text-lg font-semibold">Memory Context</h2>
        {updateStatus === "updating" && (
          <div className="mt-3 rounded-full border border-[var(--border-subtle)] bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-strong)]">
            Updating memory...
          </div>
        )}
        {updateStatus === "skipped" && (
          <div className="mt-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1 text-xs text-[var(--text-tertiary)]">
            这轮对话没有写入长期记忆。
          </div>
        )}
      </div>

      {empty ? (
        <div className="p-5 text-sm leading-relaxed text-[var(--text-tertiary)]">
          还没有形成关系记忆。
          <br />
          当你开始对话后，Echo 会把关键困惑、纠正和理解变化写入这里。
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <Block title="Active Memory">
            <p>{state?.activeMemory?.contentMd || "暂无活跃记忆。"}</p>
          </Block>
          <Block title="Future Response Rules">
            <p>{rules?.contentMd || "暂无纠正规则。"}</p>
          </Block>
          <Block title="Current Theme">
            <p>{theme?.contentMd.split("\n").slice(-4).join("\n") || state?.activeMemory?.currentTheme || "暂无当前主题。"}</p>
          </Block>
          <Block title="Open Threads">
            <p>{state?.openThreads.length ? state.openThreads.map((thread) => `- ${thread.summary}`).join("\n") : "暂无未完成话题。"}</p>
          </Block>
          <Block title="Recent Memory Pages">
            <div className="space-y-2">
              {recent.map((page) => (
                <div key={page.id} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
                  <div className="text-sm text-[var(--text-primary)]">{page.title}</div>
                  <div className="font-label mt-1 text-[10px] text-[var(--text-faint)]">/{page.slug}</div>
                </div>
              ))}
            </div>
          </Block>
          <Block title="Edit Log">
            <div className="space-y-2">
              {edits.map((edit) => (
                <div key={edit.id} className="text-xs text-[var(--text-tertiary)]">
                  <span className="text-[var(--archive)]">{edit.editSummary}</span>
                  <div className="font-label text-[10px] text-[var(--text-faint)]">/{edit.pageSlug}</div>
                </div>
              ))}
            </div>
          </Block>
        </div>
      )}
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="font-label mb-2 text-[11px] text-[var(--text-faint)]">{title}</div>
      <div className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}
