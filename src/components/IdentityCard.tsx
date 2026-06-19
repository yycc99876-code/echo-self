"use client";

export type EchoStatus = "standby" | "listening" | "thinking" | "speaking" | "updating-memory";

const labels: Record<EchoStatus, string> = {
  standby: "STANDBY",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
  "updating-memory": "UPDATING MEMORY",
};

export function IdentityCard({ status }: { status: EchoStatus }) {
  return (
    <section className="soft-panel p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--archive-soft)]">
          <span className="font-editorial text-2xl tracking-wide text-[var(--archive)]">GL</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-label text-[11px] text-[var(--text-faint)]">LIFE CHART AVATAR</div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Echo</h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">和你的命谱数字人对话</p>
        </div>
        <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-1.5">
          <span className="font-label text-[11px] text-[var(--accent)]">{labels[status]}</span>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[var(--text-secondary)]">
        我会基于你的 Life Chart、对话记忆和重要关系，陪你理解当下的问题。我不会替你做决定，但会帮你看见反复出现的主题。
      </p>
    </section>
  );
}
