import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--accent-light)]">
          Echo Self
        </h1>
        <p className="text-[var(--muted)] leading-relaxed">
          和自己对话，记住自己，理解自己。
          <br />
          这不是 AI 助手，是你的数字分身。
        </p>
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Link
            href="/echo"
            className="block p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="text-lg font-mono mb-1">&gt;_</div>
            <div className="text-sm font-medium">Echo</div>
            <div className="text-xs text-[var(--muted)] mt-1">和分身对话</div>
          </Link>
          <Link
            href="/memory"
            className="block p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="text-lg font-mono mb-1">#</div>
            <div className="text-sm font-medium">记忆</div>
            <div className="text-xs text-[var(--muted)] mt-1">查看记忆库</div>
          </Link>
          <Link
            href="/relationship"
            className="block p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="text-lg font-mono mb-1">&amp;</div>
            <div className="text-sm font-medium">关系</div>
            <div className="text-xs text-[var(--muted)] mt-1">人际图谱</div>
          </Link>
          <Link
            href="/life-chart"
            className="block p-4 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="text-lg font-mono mb-1">*</div>
            <div className="text-sm font-medium">命谱</div>
            <div className="text-xs text-[var(--muted)] mt-1">生命图表</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
