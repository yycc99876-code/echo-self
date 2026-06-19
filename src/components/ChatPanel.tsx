"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { fetchMemoryState, sendEchoMessage } from "@/lib/api-client";
import type { MemoryState, Message } from "@/lib/server-memory-store";
import { speakText } from "@/lib/tts";
import { CommandInput } from "./CommandInput";
import { IdentityCard, type EchoStatus } from "./IdentityCard";
import { PromptChips } from "./PromptChips";

export function ChatPanel({
  onMemoryState,
  onMemoryUpdating,
}: {
  onMemoryState: (state: MemoryState) => void;
  onMemoryUpdating: (status: "idle" | "updating" | "skipped") => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [memoryState, setMemoryState] = useState<MemoryState | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<EchoStatus>("standby");
  const [error, setError] = useState("");
  const [memoryNotice, setMemoryNotice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const stopSpeechRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetchMemoryState().then((state) => {
      setMemoryState(state);
      setMessages(state.messages);
      onMemoryState(state);
    });

    return () => stopSpeechRef.current();
  }, [onMemoryState]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  async function submit(raw: string, inputType: "text" | "voice" = "text") {
    const text = raw.trim();
    if (!text || status === "thinking" || status === "speaking") return;

    setError("");
    setInput("");
    setStatus("thinking");
    setMemoryNotice("");
    stopSpeechRef.current();
    onMemoryUpdating("idle");

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      inputType,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const response = await sendEchoMessage(text, inputType);
      const assistantMessage: Message = {
        id: response.assistantMessageId,
        role: "assistant",
        content: response.reply,
        inputType: "text",
        conversationType: response.conversationType,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [
        ...current.filter((message) => message.id !== optimistic.id),
        { ...optimistic, conversationType: response.conversationType },
        assistantMessage,
      ]);

      setStatus("speaking");
      if (response.memoryUpdateStatus === "queued") {
        setMemoryNotice("这轮对话有长期价值，正在写入 Memory。");
        onMemoryUpdating("updating");
        window.setTimeout(async () => {
          const state = await fetchMemoryState();
          setMemoryState(state);
          setMessages(state.messages);
          onMemoryState(state);
          onMemoryUpdating("idle");
          setMemoryNotice("Memory 已更新。");
        }, 1200);
      } else {
        setMemoryNotice("这轮只是近期对话，不写入长期记忆。");
        onMemoryUpdating("skipped");
        fetchMemoryState().then((state) => {
          setMemoryState(state);
          setMessages(state.messages);
          onMemoryState(state);
        });
      }
      stopSpeechRef.current = speakText(response.reply, () => setStatus("standby"));
    } catch {
      setStatus("standby");
      setError("Echo 暂时没有稳定回应，请稍后再试。");
      onMemoryUpdating("idle");
      fetchMemoryState().then((state) => {
        setMemoryState(state);
        setMessages(state.messages);
        onMemoryState(state);
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-subtle)] p-6">
        {!memoryState?.lifeChart ? (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--archive-soft)] p-4">
            <div className="font-label text-[11px] text-[var(--archive)]">LIFE CHART MISSING</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              你可以先聊天，但 Echo 还没有初始命谱档案。为了让对话真正形成连续理解，建议先建立 Life Chart。
            </p>
            <a href="/life-chart" className="secondary-button mt-3 inline-block">
              去建立 Life Chart
            </a>
          </div>
        ) : (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="font-label text-[11px] text-[var(--success)]">LIFE CHART ACTIVE</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Echo 正在使用 {memoryState.lifeChart.userName} 的 Life Chart 摘要、近期对话和长期 Memory 来回应。
            </p>
          </div>
        )}
        <IdentityCard status={status} />
        <div className="mt-4">
          <PromptChips disabled={status !== "standby"} onSelect={(text) => submit(text)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xl rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 text-center">
            <div className="font-label text-[11px] text-[var(--archive)]">OPENING NOTE</div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              我会基于你的 Life Chart、对话记忆和重要关系，陪你理解当下的问题。先选择一个预设问题，或者直接输入你正在反复想的事。
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            {status === "thinking" && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--archive-soft)] p-4 text-sm text-[var(--archive)]">
                Echo 正在整理命谱和记忆...
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {error && <div className="px-6 pb-2 text-xs text-[var(--danger)]">{error}</div>}
      {memoryNotice && <div className="px-6 pb-2 text-xs text-[var(--text-tertiary)]">{memoryNotice}</div>}
      <CommandInput
        value={input}
        disabled={status === "thinking"}
        onChange={setInput}
        onSend={(inputType = "text") => submit(input, inputType)}
        onVoiceState={(listening) => setStatus(listening ? "listening" : "standby")}
      />
    </div>
  );
}

function MessageView({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--archive-soft)] p-5">
      <div className="font-label mb-3 text-[11px] text-[var(--archive)]">ECHO RESPONSE</div>
      <div className="markdown">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
