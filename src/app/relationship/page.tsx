"use client";

import { useEffect, useMemo, useState } from "react";
import { createRelationship, fetchMemoryState, removeRelationship } from "@/lib/api-client";
import type { MemoryState, RelationshipItem } from "@/lib/server-memory-store";
import { RelationshipMap, typeLabels } from "@/components/RelationshipMap";

const emptyForm = {
  name: "",
  type: "friend" as RelationshipItem["type"],
  strength: "medium" as RelationshipItem["strength"],
  notes: "",
};

export default function RelationshipPage() {
  const [state, setState] = useState<MemoryState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchMemoryState().then(setState);
  }, []);

  const items = state?.relationshipItems ?? [];
  const counts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  async function add() {
    if (!form.name.trim()) return;
    const response = await createRelationship(form);
    setState(response.memoryState);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function remove(id: string) {
    const response = await removeRelationship(id);
    setState(response.memoryState);
  }

  return (
    <div className="px-6 py-8 md:px-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-label text-[11px] text-[var(--accent)]">RELATIONSHIP MAP</div>
          <h1 className="font-editorial mt-2 text-4xl">关系图谱</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            它记录的不是通讯录，而是 Echo 在回答关系问题时会读取的上下文：谁重要、关系强度如何、这段关系正在影响什么主题。
          </p>
        </div>
        <button className="primary-button" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "收起" : "添加关系"}
        </button>
      </div>

      {showForm && (
        <section className="soft-panel mb-8 grid gap-4 p-5 md:grid-cols-4">
          <input className="field" placeholder="姓名或称呼" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as RelationshipItem["type"] })}>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="field" value={form.strength} onChange={(event) => setForm({ ...form, strength: event.target.value as RelationshipItem["strength"] })}>
            <option value="low">低强度</option>
            <option value="medium">中强度</option>
            <option value="high">高强度</option>
          </select>
          <button className="primary-button" onClick={add}>
            保存
          </button>
          <textarea
            className="field min-h-24 resize-none md:col-span-4"
            placeholder="关系笔记：这段关系如何影响你现在的主题？"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
        <aside className="soft-panel h-fit p-5">
          <div className="font-label text-[11px] text-[var(--archive)]">KEY TYPES</div>
          <div className="mt-4 space-y-3">
            {Object.entries(typeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span className="font-label text-[var(--accent)]">{counts[type] ?? 0}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-[var(--text-tertiary)]">
            关系强度摘要会随着你添加和对话沉淀而变化。Echo 只会读取你真实添加过的关系，不虚构人名。
          </p>
        </aside>

        <RelationshipMap items={items} />

        <aside className="space-y-4">
          <Panel title="最近互动">{items[0]?.lastInteraction || "还没有记录最近互动。"}</Panel>
          <Panel title="关系笔记">
            {items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                      <button className="text-xs text-[var(--danger)]" onClick={() => remove(item.id)}>
                        删除
                      </button>
                    </div>
                    <div className="font-label mt-1 text-[10px] text-[var(--text-faint)]">{typeLabels[item.type]} / {item.strength}</div>
                    <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{item.notes || "暂无笔记。"}</p>
                  </div>
                ))}
              </div>
            ) : (
              "还没有关系笔记。"
            )}
          </Panel>
          <Panel title="关系洞察">
            {items.length
              ? "当前图谱已经开始形成。下一步可以在 Echo 对话中讨论某段关系如何影响你的选择。"
              : "空图谱不是错误状态。它表示 Echo 还没有足够关系上下文，需要由你主动添加或在对话中沉淀。"}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="soft-panel p-5">
      <div className="font-label text-[11px] text-[var(--text-faint)]">{title}</div>
      <div className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{children}</div>
    </section>
  );
}
