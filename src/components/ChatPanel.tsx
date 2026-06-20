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
        setMemoryNotice("我抓到了一条值得留下的线索，正在放进长期记忆。");
        onMemoryUpdating("updating");
        window.setTimeout(async () => {
          const state = await fetchMemoryState();
          setMemoryState(state);
          setMessages(state.messages);
          onMemoryState(state);
          onMemoryUpdating("idle");
          setMemoryNotice("已收进档案。下次我会带着这条线索回应你。");
        }, 1200);
      } else {
        setMemoryNotice("这轮先留在近期对话里，不打扰你的长期档案。");
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
      setError("Echo 刚才有点没接稳。再发一次，我会重新对齐。");
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
            <div className="font-label text-[11px] text-[var(--archive)]">ECHO IS STILL LEARNING YOU</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              现在也可以直接说话。只是我还没有你的初始档案，所以会先从几个轻问题里认识你：你是谁、正在卡在哪、希望我怎样陪你校准。
            </p>
            <a href="/echo" className="secondary-button mt-3 inline-block">
              回到 Echo 对话里建档
            </a>
          </div>
        ) : (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="font-label text-[11px] text-[var(--success)]">ECHO IS CALIBRATED</div>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              我已经带着 {memoryState.lifeChart.userName} 的 Life Chart、近期对话和长期记忆在场。你可以认真问，也可以先随便说一句今天的状态。
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
            <div className="font-label text-[11px] text-[var(--archive)]">FIRST SIGNAL</div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              先不用组织成一个完美问题。你可以只告诉我：你今天醒来后的第一种感觉，或者脑子里最吵的那句话。我会从这里开始接住你。
            </p>
            <p className="mt-3 text-xs leading-6 text-[var(--text-tertiary)]">
              轻松闲聊只进入近期对话；真正影响未来回应的偏好、纠正和长期主题，才会写入档案。
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <MessageView key={message.id} message={message} />
            ))}
            {status === "thinking" && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--archive-soft)] p-4 text-sm text-[var(--archive)]">
                我在把你的这句话和档案轻轻对齐...
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
