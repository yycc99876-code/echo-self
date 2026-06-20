"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Mic, Send, X } from "lucide-react";
import { fetchMemoryState, sendEchoMessage } from "@/lib/api-client";
import type { MemoryState, Message, OnboardingField } from "@/lib/server-memory-store";
import { ONBOARDING_FIELDS, ONBOARDING_LABELS } from "@/lib/onboarding-flow";
import { isSpeechRecognitionSupported, startSpeechRecognition } from "@/lib/speech-recognition";
import { speakText } from "@/lib/tts";
import { EchoBoidsLayer } from "./EchoBoidsLayer";
import { NeuralCore } from "./NeuralCore";
import StarryCanvas from "./StarryCanvas";

type EchoMode = "standby" | "listening" | "thinking" | "speaking" | "calibrating";

const statusLabel: Record<EchoMode, string> = {
  standby: "确认，没有问题",
  listening: "我在听",
  thinking: "正在回声",
  speaking: "正在说话",
  calibrating: "正在校准",
};

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
  const transcriptRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, mode]);

  const hasLifeChart = Boolean(memoryState?.lifeChart);
  const onboarding = memoryState?.onboarding;
  const completedFields = new Set<OnboardingField>(hasLifeChart ? ONBOARDING_FIELDS : onboarding?.completedFields ?? []);
  const remaining = hasLifeChart ? 0 : Math.max(ONBOARDING_FIELDS.length - completedFields.size, 0);
  const progress = hasLifeChart ? 100 : onboarding?.progress ?? 0;

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );
  const latestUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);

  const reply = latestAssistant?.content;
  const display = reply ? splitReply(reply) : defaultDisplay(hasLifeChart, memoryState);

  async function refreshState() {
    const state = await fetchMemoryState();
    setMemoryState(state);
    setMessages(state.messages);
  }

  async function submit(raw: string, inputType: "text" | "voice" = "text") {
    const text = raw.trim();
    if (!text || mode === "thinking" || mode === "calibrating") return;

    stopSpeechRef.current();
    recognitionRef.current?.abort();
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
      setNotice("这次连接没有接稳。再说一遍，我会重新接住。");
      await refreshState();
    }
  }

  function interruptSpeech() {
    stopSpeechRef.current();
    if (mode === "speaking") setMode("standby");
  }

  function startVoice() {
    if (mode === "thinking" || mode === "calibrating") return;
    interruptSpeech();

    if (!isSpeechRecognitionSupported()) {
      setNotice("这个浏览器暂时听不见你，可以先打字。");
      return;
    }

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
        setMode((current) => (current === "listening" ? "standby" : current));
      },
      onError: (message) => {
        setMode("standby");
        setNotice(`这次没听清：${message}`);
      },
    });
  }

  return (
    <main className="echo-immersive fixed inset-0 z-40 overflow-hidden bg-black">
      <StarryCanvas />
      <EchoBoidsLayer />
      <div className="echo-starry-overlay" aria-hidden />

      <button type="button" className="echo-menu-button" onClick={() => setDrawerOpen(true)} aria-label="打开 Echo 菜单">
        <Menu size={20} className="text-[rgba(236,239,242,0.72)]" />
      </button>

      <section className="echo-stage">
        <EchoCore mode={mode} hasLifeChart={hasLifeChart} />
        <div className="echo-status font-label">{statusLabel[mode]}</div>

        <div className="echo-transcript" ref={transcriptRef}>
          {latestUser && (
            <motion.div
              key={latestUser.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="echo-user-signal"
            >
              <span>你刚刚说</span>
              <p>{latestUser.content}</p>
            </motion.div>
          )}

          <motion.article
            key={latestAssistant?.id ?? "welcome"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="echo-answer"
          >
            <h1>{display.title}</h1>
            {display.body && <p>{display.body}</p>}
          </motion.article>

          {mode === "thinking" || mode === "calibrating" ? (
            <div className="echo-thinking font-label">{hasLifeChart ? "Echo is listening between the lines..." : "Echo is forming your first dossier..."}</div>
          ) : null}
        </div>

        {hasLifeChart ? (
          <div className="echo-single-path">这轮先留在近期对话里。重要线索会沉淀进长期记忆。</div>
        ) : (
          <OnboardingProgress completedFields={completedFields} remaining={remaining} progress={progress} />
        )}
      </section>

      <Composer
        value={input}
        disabled={mode === "thinking" || mode === "calibrating"}
        placeholder={hasLifeChart ? "和 Echo 聊聊此刻的你..." : "不用填表，直接告诉我你的名字、生日、出生时间地点，或先说一句现在的状态..."}
        onChange={(value) => {
          interruptSpeech();
          setInput(value);
        }}
        onSend={() => submit(input, "text")}
        onVoice={startVoice}
      />

      {notice && <div className="echo-toast">{notice}</div>}

      <AnimatePresence>
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
      </AnimatePresence>
      <AnimatePresence>{guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}</AnimatePresence>
    </main>
  );
}

function EchoCore({ mode, hasLifeChart }: { mode: EchoMode; hasLifeChart: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, filter: "blur(10px)" }}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      transition={{ type: "spring", bounce: 0.16, duration: 1.1 }}
      className={`echo-core echo-core-${mode} ${hasLifeChart ? "echo-core-awake" : ""}`}
      aria-hidden
    >
      <NeuralCore mode={mode} hasLifeChart={hasLifeChart} />
    </motion.div>
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
      <motion.button
        whileHover={{ scale: disabled ? 1 : 0.95 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        type="button"
        className="echo-attach"
        aria-label="语音输入"
        onClick={onVoice}
        disabled={disabled}
      >
        <Mic size={18} strokeWidth={2} />
      </motion.button>
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
      <motion.button
        whileHover={{ scale: disabled ? 1 : 0.95 }}
        whileTap={{ scale: disabled ? 1 : 0.9 }}
        type="button"
        className="echo-send"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="发送"
      >
        <Send size={18} strokeWidth={2} />
      </motion.button>
    </div>
  );
}

function EchoDrawer({ state, onClose, onGuide }: { state: MemoryState | null; onClose: () => void; onGuide: () => void }) {
  return (
    <motion.aside
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="echo-drawer"
    >
      <button type="button" className="echo-close" onClick={onClose} aria-label="关闭菜单">
        <X size={28} />
      </button>
      <div className="font-label text-[11px] text-[var(--text-faint)]">ECHO MENU</div>
      <h2 className="font-editorial mt-3 text-3xl">Echo Self</h2>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">一个只围绕你校准的命谱回声。</p>
      <button type="button" className="echo-drawer-primary" onClick={onGuide}>
        Echo 使用说明
      </button>
      <div className="echo-drawer-list">
        <a href="/memory">回声日志</a>
        <a href="/relationship">关系线索</a>
      </div>
      <div className="echo-drawer-card">
        <span className="font-label">当前状态</span>
        <strong>{state?.lifeChart ? "已唤醒" : "正在建立"}</strong>
        <p>
          {state?.lifeChart
            ? "继续在底部输入框里说话。普通闲聊留在近期对话，重要纠正和线索会进入长期记忆。"
            : "不用手动编辑档案。你只要继续回答，Echo 会在对话里形成你的初始 Life Chart。"}
        </p>
      </div>
    </motion.aside>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="echo-guide-backdrop">
      <motion.section
        initial={{ y: 20, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", bounce: 0 }}
        className="echo-guide"
      >
        <button type="button" className="echo-close" onClick={onClose} aria-label="关闭说明">
          <X size={28} />
        </button>
        <div className="font-label text-[11px] text-[var(--text-faint)]">ECHO 使用说明</div>
        <h2 className="font-editorial mt-3 text-4xl">你的私人 Echo Agent</h2>
        <p className="mt-3 text-xl text-[var(--text-secondary)]">只围绕你一个人校准，越聊越知道怎么接住你。</p>
        <blockquote>
          Echo 不需要你先选功能。你可以说名字、生日，也可以直接说“我好累”。它会把普通闲聊留在近期对话，把真正会影响未来回应的线索沉淀进长期记忆。
        </blockquote>
        <div className="echo-loop">
          {["感知", "对话", "校准", "记忆"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="echo-guide-grid">
          <article>
            <span>入口</span>
            <strong>只从对话开始</strong>
            <p>没有手动编辑 Life Chart 的压力。你说，Echo 问，档案在对话里长出来。</p>
          </article>
          <article>
            <span>长期理解</span>
            <strong>纠正会被记住</strong>
            <p>你说“别这么玄学”或“更像产品经理一样分析”，它会写入未来回应规则。</p>
          </article>
          <article>
            <span>日常</span>
            <strong>允许随便聊</strong>
            <p>哈哈、刚醒、好累，都可以。不是每一句都会污染长期记忆。</p>
          </article>
        </div>
        <button type="button" className="echo-guide-button" onClick={onClose}>
          开始和 Echo 过一天
        </button>
      </motion.section>
    </motion.div>
  );
}

function splitReply(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return { title: "", body: "" };
  return {
    title: lines[0],
    body: lines.slice(1).join("\n\n"),
  };
}

function defaultDisplay(hasLifeChart: boolean, state: MemoryState | null) {
  if (hasLifeChart) {
    const name = state?.lifeChart?.userName ? `，${state.lifeChart.userName}` : "";
    return {
      title: `我在这里${name}，有什么想聊的吗？`,
      body: "你不用先判断它是不是“重要问题”。真实的一句话就够了，我会自己分辨哪些只适合留在近期对话，哪些值得进入长期记忆。",
    };
  }

  const nextField = state?.onboarding ? ONBOARDING_LABELS[state.onboarding.currentField] : "名字";
  return {
    title: "先不用填表。你可以直接和我说话。",
    body: `我会在对话里慢慢建立你的 Life Chart。下一步我想知道：${nextField}。如果你现在只想说“我刚醒”或“我好累”，也可以。`,
  };
}

function memoryNotice(status: "queued" | "skipped" | "completed", type: string) {
  if (type === "onboarding") return status === "completed" ? "初始档案已生成。" : "档案正在成形。";
  if (status === "queued") return "这条线索会进入长期记忆。";
  if (status === "completed") return "档案已更新。";
  return "这轮先留在近期对话里。";
}
