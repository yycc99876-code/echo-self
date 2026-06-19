"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { createLifeChart, fetchMemoryState } from "@/lib/api-client";
import type { LifeChartInput } from "@/lib/life-chart-generator";

const initialForm: LifeChartInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  currentQuestion: "",
  currentEmotion: "",
  companionStyle: "",
};

export default function LifeChartPage() {
  const [form, setForm] = useState(initialForm);
  const [chart, setChart] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMemoryState().then((state) => {
      if (state.lifeChart) {
        setForm({
          name: state.lifeChart.userName,
          birthDate: state.lifeChart.birthDate,
          birthTime: state.lifeChart.birthTime ?? "",
          currentQuestion: state.lifeChart.currentQuestion,
          currentEmotion: state.lifeChart.currentEmotion,
          companionStyle: state.lifeChart.companionStyle,
        });
        setChart(state.lifeChart.contentMd);
      }
    });
  }, []);

  const valid = form.name && form.birthDate && form.currentQuestion && form.currentEmotion && form.companionStyle;

  async function generate() {
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const response = await createLifeChart(form);
      setChart(response.lifeChart?.contentMd ?? "");
    } catch {
      setError("Life Chart 生成失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 py-8 md:px-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,720px)_360px]">
        <section>
          <div className="font-label text-[11px] text-[var(--accent)]">LIFE CHART DOSSIER</div>
          <h1 className="font-editorial mt-3 text-4xl leading-tight md:text-5xl">Life Chart</h1>
          <p className="mt-3 text-lg text-[var(--text-primary)]">建立你的命谱档案</p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            这不是算命，也不是给你一个固定答案。它是一份用于帮助 Echo 理解你当前状态的初始观察档案。
          </p>

          <div className="mt-8 space-y-5">
            <Field label="名字" hint="Echo 会用这个名字称呼你。">
              <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </Field>
            <Field label="出生日期" hint="用于建立初始时间档案，不用于绝对预测。">
              <input type="date" className="field" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
            </Field>
            <Field label="出生时间，可选" hint="不知道可以留空。">
              <input type="time" className="field" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} />
            </Field>
            <Field label="当前最想问的问题" hint="写一个真实困惑，越具体越好。">
              <textarea className="field min-h-28 resize-none" value={form.currentQuestion} onChange={(event) => setForm({ ...form, currentQuestion: event.target.value })} />
            </Field>
            <Field label="最近最强烈的情绪" hint="可以是几个词，也可以是一句话。">
              <input className="field" value={form.currentEmotion} onChange={(event) => setForm({ ...form, currentEmotion: event.target.value })} />
            </Field>
            <Field label="希望 Echo 如何陪伴你" hint="这会成为未来回应边界。">
              <textarea className="field min-h-28 resize-none" value={form.companionStyle} onChange={(event) => setForm({ ...form, companionStyle: event.target.value })} />
            </Field>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <button className="primary-button w-full" disabled={!valid || loading} onClick={generate}>
              {loading ? "正在生成命谱..." : "生成命谱"}
            </button>
          </div>
        </section>

        <aside className="soft-panel h-fit p-5">
          <div className="font-label text-[11px] text-[var(--archive)]">HOW ECHO USES IT</div>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Life Chart 会被保存到服务端档案，并在 /api/echo 回应时作为上下文引用。它会被后续对话修正，而不是冻结为一次性的结论。
          </p>
          <Link href="/echo" className="secondary-button mt-5 inline-block">
            进入 Echo
          </Link>
        </aside>
      </div>

      {chart && (
        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="panel p-6">
            <div className="font-label text-[11px] text-[var(--archive)]">MARKDOWN PREVIEW</div>
            <div className="markdown mt-4">
              <ReactMarkdown>{chart}</ReactMarkdown>
            </div>
          </div>

          <aside className="soft-panel h-fit p-5">
            <div className="font-label text-[11px] text-[var(--success)]">PROFILE ACTIVE</div>
            <h2 className="mt-2 text-xl font-semibold">档案已生效</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              Echo 现在会在对话中优先读取这份 Life Chart 摘要。下一步不是再填表，而是用一个真实问题开始对话。
            </p>
            <div className="mt-5 space-y-2 text-xs text-[var(--text-tertiary)]">
              <p>可以直接问：</p>
              <p>我适合转向 AI 产品吗？</p>
              <p>我的命谱里反复出现什么主题？</p>
              <p>今天我应该先做哪件具体的事？</p>
            </div>
            <Link href="/echo" className="primary-button mt-5 inline-block w-full text-center">
              带着档案进入 Echo
            </Link>
          </aside>
        </section>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      <span className="mt-1 block text-xs text-[var(--text-tertiary)]">{hint}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
