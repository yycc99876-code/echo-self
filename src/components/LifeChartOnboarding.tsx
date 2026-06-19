"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { generateLifeChart, type LifeChartInput } from "@/lib/life-chart-generator";
import { saveLifeChart, getLifeChart } from "@/lib/memory-store";

// ==================== 状态类型 ====================

type OnboardingStep = "form" | "generating" | "preview";

// ==================== 表单组件 ====================

function FormField({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-[var(--foreground)]">
        {label}
        {required && <span className="text-[var(--accent)] ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      {children}
    </div>
  );
}

// ==================== 输入样式 ====================

const inputClass =
  "w-full bg-[#1a1a1a] border border-[var(--card-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[#444] focus:outline-none focus:border-[var(--accent)] transition-colors";

// ==================== 主组件 ====================

export function LifeChartOnboarding() {
  const [step, setStep] = useState<OnboardingStep>(() => {
    // 如果已有命谱，直接显示预览
    const existing = getLifeChart();
    return existing ? "preview" : "form";
  });

  const [form, setForm] = useState<LifeChartInput>({
    name: "",
    birthDate: "",
    birthTime: "",
    currentQuestion: "",
    currentEmotion: "",
    companionStyle: "",
  });

  const [chartMd, setChartMd] = useState<string>(() => {
    const existing = getLifeChart();
    return existing?.contentMd ?? "";
  });

  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    (field: keyof LifeChartInput, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const isValid =
    form.name.trim() !== "" &&
    form.birthDate.trim() !== "" &&
    form.currentQuestion.trim() !== "" &&
    form.currentEmotion.trim() !== "" &&
    form.companionStyle.trim() !== "";

  const handleGenerate = useCallback(async () => {
    if (!isValid) return;

    setStep("generating");
    setError(null);

    try {
      const md = await generateLifeChart(form);
      setChartMd(md);

      // 保存到 localStorage
      saveLifeChart({
        userName: form.name,
        birthDate: form.birthDate,
        birthTime: form.birthTime || undefined,
        currentQuestion: form.currentQuestion,
        currentEmotion: form.currentEmotion,
        companionStyle: form.companionStyle,
        contentMd: md,
      });

      setStep("preview");
    } catch (err) {
      console.error("[LifeChartOnboarding] Generation failed:", err);
      setError("命谱生成失败，请稍后再试。");
      setStep("form");
    }
  }, [form, isValid]);

  const handleReset = useCallback(() => {
    setStep("form");
    setChartMd("");
    setForm({
      name: "",
      birthDate: "",
      birthTime: "",
      currentQuestion: "",
      currentEmotion: "",
      companionStyle: "",
    });
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 标题区 */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--accent-light)]">
          Life Chart
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          命谱是 Guoliang Echo 理解你的起点。它不是算命，而是一份关于你当前状态的观察记录。
        </p>
      </div>

      {/* ===== 表单步骤 ===== */}
      {step === "form" && (
        <div className="space-y-5">
          {/* 名字 */}
          <FormField label="名字" required>
            <input
              type="text"
              className={inputClass}
              placeholder="你希望 Echo 怎么称呼你"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </FormField>

          {/* 出生日期 */}
          <FormField label="出生日期" required hint="用于观察你所处的人生阶段，不做命运推断">
            <input
              type="date"
              className={inputClass}
              value={form.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />
          </FormField>

          {/* 出生时间 */}
          <FormField label="出生时间" hint="可选。如果你知道的话">
            <input
              type="time"
              className={inputClass}
              value={form.birthTime}
              onChange={(e) => updateField("birthTime", e.target.value)}
            />
          </FormField>

          {/* 当前最想问的问题 */}
          <FormField
            label="当前最想问的问题"
            required
            hint="可以是一个具体的困惑，也可以是一种模糊的感觉"
          >
            <textarea
              className={inputClass + " min-h-[80px] resize-none"}
              placeholder="比如：我现在做的事情到底对不对？"
              value={form.currentQuestion}
              onChange={(e) => updateField("currentQuestion", e.target.value)}
            />
          </FormField>

          {/* 最近最强烈的情绪 */}
          <FormField label="最近最强烈的情绪" required hint="不需要完美描述，一两个词也可以">
            <input
              type="text"
              className={inputClass}
              placeholder="比如：焦虑、迷茫、疲惫、平静"
              value={form.currentEmotion}
              onChange={(e) => updateField("currentEmotion", e.target.value)}
            />
          </FormField>

          {/* 希望如何被陪伴 */}
          <FormField
            label="希望 Guoliang Echo 如何陪伴你"
            required
            hint="Echo 会尊重这个边界"
          >
            <textarea
              className={inputClass + " min-h-[80px] resize-none"}
              placeholder="比如：安静听着就好 / 偶尔提醒我回到重点 / 帮我梳理思路"
              value={form.companionStyle}
              onChange={(e) => updateField("companionStyle", e.target.value)}
            />
          </FormField>

          {/* 错误提示 */}
          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 生成按钮 */}
          <button
            disabled={!isValid}
            onClick={handleGenerate}
            className="w-full py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[#0a0a0a]"
          >
            生成命谱
          </button>

          <p className="text-xs text-[var(--muted)] text-center">
            命谱只是一份初始观察，后续对话中可以随时修正。
          </p>
        </div>
      )}

      {/* ===== 生成中 ===== */}
      {step === "generating" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot" />
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot" />
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot" />
          </div>
          <p className="text-sm text-[var(--muted)]">正在生成你的命谱...</p>
        </div>
      )}

      {/* ===== 预览步骤 ===== */}
      {step === "preview" && chartMd && (
        <div className="space-y-6">
          {/* 命谱内容 */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
            <div className="prose text-sm leading-relaxed">
              <ReactMarkdown>{chartMd}</ReactMarkdown>
            </div>
          </div>

          {/* 提示 */}
          <div className="bg-[#1a1a1a] border border-[var(--card-border)] rounded-xl p-4">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              这份命谱会作为 Guoliang Echo 理解你的基础。
              在之后的对话中，如果 Echo 对你的理解有偏差，你可以随时纠正。
              命谱不是固定的——它会随着你们的对话一起生长。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-lg text-sm border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-colors"
            >
              重新生成
            </button>
            <a
              href="/echo"
              className="flex-1 py-2.5 rounded-lg text-sm text-center bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[#0a0a0a] font-medium transition-colors"
            >
              开始对话
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
