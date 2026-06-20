"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { fetchMemoryState, sendEchoMessage } from "@/lib/api-client";
import type { MemoryState, Message, OnboardingField } from "@/lib/server-memory-store";
import { ONBOARDING_FIELDS, ONBOARDING_LABELS } from "@/lib/onboarding-flow";
import { isSpeechRecognitionSupported, startSpeechRecognition } from "@/lib/speech-recognition";
import { speakText } from "@/lib/tts";

type EchoMode = "standby" | "listening" | "thinking" | "speaking" | "calibrating";

const statusLabel: Record<EchoMode, string> = {
  standby: "确认，没问题",
  listening: "我在听",
  thinking: "校准中",
  speaking: "正在回应",
  calibrating: "档案正在成形",
};

const particleSeeds = Array.from({ length: 190 }, (_, index) => {
  const angle = index * 2.399963;
  const radius = Math.sqrt(((index * 47) % 101) / 101) * (58 + ((index * 13) % 132));
  const verticalBias = Math.sin(index * 0.37) * 18;
  return {
    x: Math.cos(angle) * radius * 0.86,
    y: Math.sin(angle) * radius * 1.05 + verticalBias,
    s: 1 + ((index * 17) % 6) * 0.34,
    d: (index * 31) % 900,
  };
});

export function ImmersiveEcho() {
  const [memoryState, setMemoryState] = useState<MemoryState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<EchoMode>("standby");
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const stopSpeechRef = useRef<() => void>(() => {});
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);

  useEffect(() => {
    fetchMemoryState().then((state) => {
      setMemoryState(state);
      setMessages(state.messages);
      if (!state.lifeChart && state.messages.length === 0) setGuideOpen(true);
    });

    return () => {
      stopSpeechRef.current();
      recognitionRef.current?.abort();
    };
  }, []);

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant"), [messages]);
  const latestUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);
  const hasLifeChart = Boolean(memoryState?.lifeChart);
  const onboarding = memoryState?.onboarding;
  const completedFields = new Set<OnboardingField>(
    hasLifeChart ? ONBOARDING_FIELDS : onboarding?.completedFields ?? [],
  );
  const remaining = hasLifeChart ? 0 : Math.max(ONBOARDING_FIELDS.length - completedFields.size, 0);
  const progress = hasLifeChart ? 100 : onboarding?.progress ?? 0;

  const centralLine = latestAssistant?.content
    ? firstLine(latestAssistant.content)
    : hasLifeChart
      ? `我在这里，${memoryState?.lifeChart?.userName ?? ""}。有什么想聊的吗？`
      : "我还不认识你。先给我一句真实的信息，我会从这里开始校准。";

  const secondLine = latestAssistant?.content
    ? restLines(latestAssistant.content)
    : hasLifeChart
      ? "你可以从今日回声、夜间校准，或者一句随便聊聊开始。"
      : onboarding
        ? `下一步：${ONBOARDING_LABELS[onboarding.currentField]}`
        : "先告诉我一个名字，或者直接说你现在的状态。";

  async function refreshState() {
    const state = await fetchMemoryState();
    setMemoryState(state);
    setMessages(state.messages);
  }

  async function submit(raw: string, inputType: "text" | "voice" = "text") {
    const text = raw.trim();
    if (!text || mode === "thinking" || mode === "speaking") return;

    stopSpeechRef.current();
    setInput("");
    setNotice("");
    setMode(hasLifeChart ? "thinking" : "calibrating");

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      inputType,
      conversationType: hasLifeChart ? "unknown" : "onboarding",
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const response = await sendEchoMessage(text, inputType);
      const assistant: Message = {
        id: response.assistantMessageId,
        role: "assistant",
        content: response.reply,
        inputType: "text",
        conversationType: response.conversationType,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), optimistic, assistant]);
      setNotice(memoryNotice(response.memoryUpdateStatus, response.conversationType));
      await refreshState();
      setMode("speaking");
      stopSpeechRef.current = speakText(response.reply, () => setMode("standby"));
    } catch {
      setMode("standby");
      setNotice("这次连接没接稳。再说一次，我会重新校准。");
      await refreshState();
    }
  }

  function startVoice() {
    if (!isSpeechRecognitionSupported() || mode === "thinking" || mode === "speaking") {
      setNotice("这个浏览器暂时听不见你，可以先打字。");
      return;
    }
    stopSpeechRef.current();
    setMode("listening");
    setNotice("我在听，说完会自动送出。");
    recognitionRef.current = startSpeechRecognition({
      onResult: (text, isFinal) => {
        setInput(text);
        if (isFinal && text.trim()) {
          setMode("standby");
          setNotice("");
          setTimeout(() => submit(text, "voice"), 0);
        }
      },
      onEnd: () => {
        if (mode === "listening") setMode("standby");
      },
      onError: (message) => {
        setMode("standby");
        setNotice(`这次没听清：${message}`);
      },
    });
  }

  return (
    <main className="echo-immersive fixed inset-0 z-40 overflow-hidden">
      <button type="button" className="echo-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open Echo menu">
        <span />
        <span />
        <span />
      </button>

      <section className="echo-stage">
        <EchoCore mode={mode} hasLifeChart={hasLifeChart} />

        <div className="echo-status font-label">{statusLabel[mode]}</div>
        <div className="echo-copy">
          <p className="echo-primary-line">{centralLine}</p>
          {secondLine && <p className="echo-secondary-line">{secondLine}</p>}
        </div>

        {hasLifeChart ? (
          <DailyActions disabled={mode === "thinking" || mode === "speaking"} onSelect={submit} />
        ) : (
          <OnboardingProgress completedFields={completedFields} remaining={remaining} progress={progress} />
        )}
      </section>

      <Composer
        value={input}
        disabled={mode === "thinking" || mode === "speaking"}
        placeholder={hasLifeChart ? "和 Echo 聊聊此刻的你..." : "输入你的姓名、性别、出生日期时间和地点..."}
        onChange={setInput}
        onSend={() => submit(input, "text")}
        onVoice={startVoice}
      />

      {notice && <div className="echo-toast">{notice}</div>}
      {latestUser && <div className="echo-last-user">{latestUser.content}</div>}

      {drawerOpen && (
        <EchoDrawer
          state={memoryState}
          onClose={() => setDrawerOpen(false)}
          onGuide={() => {
            setDrawerOpen(false);
            setGuideOpen(true);
          }}
        />
      )}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
    </main>
  );
}

function EchoCore({ mode, hasLifeChart }: { mode: EchoMode; hasLifeChart: boolean }) {
  return (
    <div className={`echo-core echo-core-${mode} ${hasLifeChart ? "echo-core-awake" : ""}`} aria-hidden>
      <div className="echo-core-glow" />
      <div className="echo-core-body">
        {particleSeeds.map((particle, index) => (
          <span
            key={index}
            className="echo-particle"
            style={{
              "--x": `${particle.x}px`,
              "--y": `${particle.y}px`,
              "--s": `${particle.s}px`,
              "--d": `${particle.d}ms`,
            } as CSSProperties}
          />
        ))}
      </div>
      {hasLifeChart && (
        <div className="echo-orbit">
          <button type="button">回声</button>
          <button type="button">校准</button>
          <button type="button">日志</button>
        </div>
      )}
    </div>
  );
}

function OnboardingProgress({
  completedFields,
  remaining,
  progress,
}: {
  completedFields: Set<OnboardingField>;
  remaining: number;
  progress: number;
}) {
  return (
    <div className="echo-progress-wrap">
      <div className="echo-progress-bar">
        <span>还差 {remaining} 项</span>
        {ONBOARDING_FIELDS.slice(0, 5).map((field) => (
          <span key={field} className={completedFields.has(field) ? "is-complete" : ""}>
            {completedFields.has(field) ? "✓ " : ""}
            {ONBOARDING_LABELS[field]}
          </span>
        ))}
        <div className="echo-progress-track">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function DailyActions({ disabled, onSelect }: { disabled: boolean; onSelect: (text: string) => void }) {
  const actions = [
    ["今日回声", "给我今天的一个轻量回声。"],
    ["夜间校准", "我们做一次夜间校准。"],
    ["随便聊聊", "我想先随便聊聊。"],
  ];
  return (
    <div className="echo-actions">
      {actions.map(([label, prompt]) => (
        <button key={label} type="button" disabled={disabled} onClick={() => onSelect(prompt)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Composer({
  value,
  disabled,
  placeholder,
  onChange,
  onSend,
  onVoice,
}: {
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoice: () => void;
}) {
  return (
    <div className="echo-composer">
      <button type="button" className="echo-attach" aria-label="Voice input" onClick={onVoice} disabled={disabled}>
        ◌
      </button>
      <textarea
        value={value}
        disabled={disabled}
        rows={1}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />
      <button type="button" className="echo-send" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Send">
        →
      </button>
    </div>
  );
}

function EchoDrawer({ state, onClose, onGuide }: { state: MemoryState | null; onClose: () => void; onGuide: () => void }) {
  return (
    <aside className="echo-drawer">
      <button type="button" className="echo-close" onClick={onClose}>
        ×
      </button>
      <div className="font-label text-[11px] text-[var(--text-faint)]">ECHO MENU</div>
      <h2 className="font-editorial mt-3 text-3xl">Echo Self</h2>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">只属于你一个人的命谱 Agent。</p>
      <button type="button" className="echo-drawer-primary" onClick={onGuide}>
        Echo 使用说明
      </button>
      <div className="echo-drawer-list">
        <a href="/memory">回声日志</a>
        <a href="/life-chart">编辑档案</a>
        <a href="/relationship">关系线索</a>
      </div>
      <div className="echo-drawer-card">
        <span className="font-label">当前状态</span>
        <strong>{state?.lifeChart ? "已唤醒" : "正在建档"}</strong>
        <p>{state?.lifeChart ? "可以开始今日回声与夜间校准。" : "继续回答底部问题，让 Echo 完成第一层校准。"}</p>
      </div>
    </aside>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="echo-guide-backdrop">
      <section className="echo-guide">
        <button type="button" className="echo-close" onClick={onClose}>
          ×
        </button>
        <div className="font-label text-[11px] text-[var(--text-faint)]">ECHO 使用说明</div>
        <h2 className="font-editorial mt-3 text-4xl">你的私人 Echo Agent</h2>
        <p className="mt-3 text-xl text-[var(--text-secondary)]">只理解你一个人的长期档案，越校准越懂你。</p>
        <blockquote>
          Echo 不只是回答问题。你告诉它的纠正、偏好、关系线索和反复情绪，会改变它下一次回应你的方式。
        </blockquote>
        <div className="echo-loop">
          {["感知", "对话", "校准", "记忆"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="echo-guide-grid">
          <article>
            <span>清晨</span>
            <strong>今日回声</strong>
            <p>给你一句轻量判断和一个当天可执行的小动作。</p>
          </article>
          <article>
            <span>夜间</span>
            <strong>对话式校准</strong>
            <p>不是问卷，而是逐条聊今天哪里准、哪里跑偏。</p>
          </article>
          <article>
            <span>日志</span>
            <strong>留下痕迹</strong>
            <p>重要变化会沉淀为 Echo Log，让你看见它如何变懂你。</p>
          </article>
        </div>
        <button type="button" className="echo-guide-button" onClick={onClose}>
          开始和 Echo 过一天
        </button>
      </section>
    </div>
  );
}

function firstLine(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean)[0] ?? "";
}

function restLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1, 4)
    .join("\n");
}

function memoryNotice(status: "queued" | "skipped" | "completed", type: string) {
  if (type === "onboarding") return status === "completed" ? "初始档案已生成。" : "档案正在成形。";
  if (status === "queued") return "这条线索会进入长期记忆。";
  if (status === "completed") return "档案已更新。";
  return "这轮先留在近期对话里。";
}
