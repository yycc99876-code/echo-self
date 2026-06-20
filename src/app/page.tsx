import Link from "next/link";

const steps = [
  {
    index: "01",
    title: "先说一句真实状态",
    body: "不用先填完表，也不用想好问题。你可以从“我刚醒”“今天很烦”“我有点兴奋”开始。",
  },
  {
    index: "02",
    title: "Echo 边聊边校准",
    body: "闲聊留在近期对话；重要偏好、纠正、关系和长期目标会进入记忆，影响以后怎么回应你。",
  },
  {
    index: "03",
    title: "慢慢形成你的档案",
    body: "Life Chart 是起点，不是表格任务。它会在真实对话里被补全、修正、变得越来越像你。",
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
            Echo Self 不是让你先面对一堆选项。你先说一句当下状态，Echo 会在对话里认识你、校准你，并把真正重要的线索沉淀成长期档案。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/echo" className="primary-button">
              先和 Echo 说一句
            </Link>
            <Link href="/life-chart" className="secondary-button">
              手动编辑 Life Chart
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
            最终目标不是“填完资料”，而是形成一套连续循环：说出状态、得到回应、夜间校准、长期记忆更新，再回到下一次更懂你的对话。
          </p>
        </div>
      </section>
    </div>
  );
}
