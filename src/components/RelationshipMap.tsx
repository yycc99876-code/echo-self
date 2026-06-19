"use client";

import type { RelationshipItem } from "@/lib/server-memory-store";

const typeLabels: Record<RelationshipItem["type"], string> = {
  family: "家人",
  friend: "朋友",
  collaborator: "合作者",
  mentor: "导师",
  classmate: "同学",
  old_friend: "旧友",
  other: "其他",
};

const positions: Record<RelationshipItem["type"], string> = {
  family: "left-[14%] top-[20%]",
  friend: "right-[16%] top-[18%]",
  collaborator: "right-[9%] top-[48%]",
  mentor: "left-[18%] bottom-[18%]",
  classmate: "right-[24%] bottom-[16%]",
  old_friend: "left-[8%] top-[50%]",
  other: "left-[42%] bottom-[8%]",
};

export function RelationshipMap({ items }: { items: RelationshipItem[] }) {
  const grouped = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative min-h-[520px] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
      <svg className="absolute inset-0 h-full w-full opacity-50" aria-hidden>
        {Object.keys(typeLabels).map((type) => (
          <line key={type} x1="50%" y1="50%" x2={type.includes("friend") ? "18%" : "82%"} y2={type === "mentor" ? "78%" : "24%"} stroke="rgba(225,234,245,0.08)" />
        ))}
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--archive-soft)]">
        <div className="text-center">
          <div className="font-editorial text-2xl text-[var(--archive)]">Self</div>
          <div className="font-label text-[10px] text-[var(--text-faint)]">CENTER</div>
        </div>
      </div>
      {(Object.keys(typeLabels) as RelationshipItem["type"][]).map((type) => (
        <div key={type} className={`absolute ${positions[type]} min-w-28 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 text-center`}>
          <div className="text-sm text-[var(--text-primary)]">{typeLabels[type]}</div>
          <div className="font-label mt-1 text-[11px] text-[var(--accent)]">{grouped[type] ?? 0} ITEMS</div>
        </div>
      ))}
    </div>
  );
}

export { typeLabels };
