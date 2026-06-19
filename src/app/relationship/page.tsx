"use client";

import { useState, useEffect } from "react";

// MVP: simple relationship entries stored in localStorage
interface Relationship {
  id: string;
  name: string;
  role: string; // e.g. 家人, 朋友, 同事, 伴侣
  notes: string;
  lastInteraction?: string;
  createdAt: string;
}

const STORAGE_KEY = "echo_relationships";

function getRelationships(): Relationship[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRelationships(rels: Relationship[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rels));
}

export default function RelationshipPage() {
  const [rels, setRels] = useState<Relationship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", notes: "" });

  // Load on mount
  useEffect(() => {
    setRels(getRelationships());
  }, []);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newRel: Relationship = {
      id: Date.now().toString(36),
      name: form.name.trim(),
      role: form.role.trim() || "未分类",
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...rels, newRel];
    saveRelationships(updated);
    setRels(updated);
    setForm({ name: "", role: "", notes: "" });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = rels.filter((r) => r.id !== id);
    saveRelationships(updated);
    setRels(updated);
  };

  // Group by role
  const grouped = rels.reduce<Record<string, Relationship[]>>((acc, r) => {
    (acc[r.role] = acc[r.role] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--accent-light)]">关系图谱</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            记录你生命中重要的人
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-light)] transition-colors"
        >
          {showForm ? "取消" : "+ 添加"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 p-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="姓名"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[var(--card-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="关系类型 (家人/朋友/同事/伴侣...)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[var(--card-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <textarea
            placeholder="备注..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full bg-[#0a0a0a] border border-[var(--card-border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
          <button
            onClick={handleAdd}
            className="text-sm px-4 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-light)] transition-colors"
          >
            保存
          </button>
        </div>
      )}

      {/* Relationship list */}
      {rels.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-2xl mb-2">&amp;</p>
          <p className="text-sm">还没有记录任何关系</p>
          <p className="text-xs mt-1">点击上方 &quot;+ 添加&quot; 开始记录</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, members]) => (
            <div key={role}>
              <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                {role} ({members.length})
              </h2>
              <div className="space-y-2">
                {members.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-start justify-between p-3 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{rel.name}</div>
                      {rel.notes && (
                        <div className="text-xs text-[var(--muted)] mt-1 truncate">
                          {rel.notes}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(rel.id)}
                      className="text-xs text-[var(--muted)] hover:text-red-400 ml-2 shrink-0"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
