import Link from "next/link";

const steps = [
  {
    index: "01",
    title: "先建立 Life Chart",
    body: "用一个当前问题、情绪状态和陪伴偏好，给 Echo 一个初始理解框架。",
  },
  {
    index: "02",
    title: "再进入 Echo 对话",
    body: "闲聊可以轻松回应；重要问题会结合 Life Chart、记忆和关系上下文。",
  },
  {
    index: "03",
    title: "重要内容沉淀为 Memory",
    body: "纠正、长期偏好、产品方向和关系问题会写入档案，普通闲聊不会污染长期记忆。",
  },
];

export default function Home() {
  return (
    <div className="px-6 py-10 md:px-12 lg:px-16">
      <section className="grid min-h-[calc(100vh-80px)] content-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <div className="font-label text-xs text-[var(--accent)]">LIFE CHART AVATAR / ECHO SELF</div>
          <h1 className="font-editorial mt-6 max-w-2xl text-[42px] leading-[1.08] text-[var(--text-primary)] md:text-[56px]">
            理解自己，记住自己。
            <br />
            你的命谱数字人。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            这个产品不是让你先进聊天室瞎聊，而是先建立一份 Life Chart 档案，再让 Echo 带着档案、长期记忆和关系上下文与你连续对话。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/life-chart" className="primary-button">
              第一步：建立 Life Chart
            </Link>
            <Link href="/echo" className="secondary-button">
              已有档案，进入 Echo
            </Link>
          </div>
        </div>

        <div className="panel self-center p-5">
          <div className="font-label mb-4 text-[11px] text-[var(--archive)]">HOW THE LOOP WORKS</div>
          <div className="space-y-3">
            {steps.map((step) => (
              <article key={step.index} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                <div className="font-label text-[11px] text-[var(--accent)]">{step.index}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{step.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-tertiary)]">{step.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-tertiary)]">
            每一步都会进入同一份服务端档案：Life Chart 提供初始理解，Echo 产生连续对话，Memory 只保存有长期价值的变化。
          </p>
        </div>
      </section>
    </div>
  );
}
