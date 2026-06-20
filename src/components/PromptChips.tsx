"use client";

export const PRESET_QUESTIONS = [
  "我刚醒，脑子有点懵。",
  "今天先别分析太重，陪我慢慢进入状态。",
  "我适合转向 AI 产品吗？",
  "我最近为什么总是焦虑？",
  "我应该如何理解现在的关系？",
  "我今天应该先做哪一件具体的事？",
];

export function PromptChips({ onSelect, disabled }: { onSelect: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel-soft)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--accent-strong)] disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
