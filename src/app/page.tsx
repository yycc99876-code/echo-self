import Link from "next/link";

const cards = [
  {
    title: "Echo",
    subtitle: "和命谱数字人对话",
    body: "它会引用你的命谱、记忆和关系上下文。",
  },
  {
    title: "Memory",
    subtitle: "重要对话会沉淀为记忆档案",
    body: "不只是聊天记录，而是可被再次调用的理解。",
  },
  {
    title: "Life Chart",
    subtitle: "建立初始命谱档案",
    body: "它不是命运结论，而是理解你的起点。",
  },
];

export default function Home() {
  return (
    <div className="px-6 py-10 md:px-12 lg:px-16">
      <section className="grid min-h-[calc(100vh-80px)] content-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-3xl">
          <div className="font-label text-xs text-[var(--accent)]">LIFE CHART AVATAR / ECHO SELF</div>
          <h1 className="font-editorial mt-6 max-w-2xl text-[42px] leading-[1.08] text-[var(--text-primary)] md:text-[56px]">
            理解自己，记住自己。
            <br />
            你的命谱数字人。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            Echo Self 不是 AI 助手，也不是算命工具。它会基于你的 Life Chart、对话记忆和关键关系，持续理解你正在经历什么。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/echo" className="primary-button">
              开始和 Echo 对话
            </Link>
            <Link href="/life-chart" className="secondary-button">
              建立 Life Chart
            </Link>
          </div>
        </div>

        <div className="panel self-center p-5">
          <div className="font-label mb-4 text-[11px] text-[var(--archive)]">PRIVATE DOSSIER</div>
          <div className="space-y-3">
            {cards.map((card) => (
              <article key={card.title} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{card.title}</h2>
                <p className="mt-2 text-sm text-[var(--accent)]">{card.subtitle}</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-tertiary)]">{card.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-tertiary)]">
            持续记录，长期对话，真实理解会随着时间形成。
          </p>
        </div>
      </section>
    </div>
  );
}
