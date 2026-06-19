"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EchoAvatar } from "./EchoAvatar";
import { MessageBubble } from "./MessageBubble";
import {
  getMessages,
  saveMessage,
  clearMessages,
  addWikiEdit,
  upsertWikiPage,
  updateActiveMemory,
} from "@/lib/memory-store";

type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface ChatPanelProps {
  onWikiUpdate: () => void;
}

// Simulated echo responses — in a real app these come from the AI backend
const echoResponses = [
  "我记得你之前说过，工作中的成就感对你来说比薪资更重要。你现在还是这么觉得吗？",
  "上次我们聊到你在人际关系中的模式——你倾向于先付出，然后期待对等的回报。这个观察你还记得吗？",
  "你说过你最近在思考'什么是真正的自由'。这个问题我一直在帮你记录着，你想继续聊吗？",
  "根据你的命谱，这段时间适合内省和整理。你最近有没有觉得需要独处的时刻？",
  "我记得你提到过一个叫李明的朋友，你们的关系最近怎么样了？",
  "你上次的情绪记录显示有一些波动。我想听听你现在的感受。",
];

const wikiUpdates = [
  {
    slug: "self-awareness",
    title: "自我认知",
    content: "## 自我认知\n\n- 重视成就感多于物质回报\n- 倾向于在关系中先付出\n- 正在探索'自由'的定义",
    editSummary: "更新了自我认知维度的记录",
  },
  {
    slug: "relationships",
    title: "人际关系",
    content: "## 人际关系\n\n- 与李明的友谊处于调整期\n- 学习在关系中设立边界\n- 重视深度连接而非广泛社交",
    editSummary: "记录了人际关系的最新状态",
  },
  {
    slug: "life-patterns",
    title: "生命模式",
    content: "## 生命模式\n\n- 内省期：适合整理和回顾\n- 情绪波动与季节变化相关\n- 创造力高峰期即将到来",
    editSummary: "添加了近期生命模式观察",
  },
];

export function ChatPanel({ onWikiUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: string }>
  >([]);
  const [input, setInput] = useState("");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [latestSubtitle, setLatestSubtitle] = useState("");
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseIndexRef = useRef(0);

  // Load messages on mount
  useEffect(() => {
    const stored = getMessages();
    if (stored.length > 0) {
      setMessages(
        stored.map((m) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
          timestamp: m.createdAt,
        }))
      );
      const last = stored[stored.length - 1];
      if (last.role === "assistant") {
        setLatestSubtitle(last.content);
      }
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const simulateEchoResponse = useCallback(() => {
    setAvatarState("thinking");

    const responseText =
      echoResponses[responseIndexRef.current % echoResponses.length];
    responseIndexRef.current++;

    // Simulate thinking delay
    setTimeout(() => {
      setAvatarState("speaking");
      setLatestSubtitle(responseText);

      // Save assistant message
      const saved = saveMessage({
        role: "assistant",
        content: responseText,
        inputType: "text",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: saved.id,
          role: "assistant",
          content: responseText,
          timestamp: saved.createdAt,
        },
      ]);

      // Simulate wiki update after response
      const wikiUpdate =
        wikiUpdates[responseIndexRef.current % wikiUpdates.length];
      upsertWikiPage({
        slug: wikiUpdate.slug,
        title: wikiUpdate.title,
        contentMd: wikiUpdate.content,
        tags: ["auto-update"],
      });
      addWikiEdit({
        pageSlug: wikiUpdate.slug,
        editSummary: wikiUpdate.editSummary,
      });
      updateActiveMemory(
        `最近对话主题：${wikiUpdate.title}\n${wikiUpdate.editSummary}`
      );

      // Notify parent to refresh wiki
      onWikiUpdate();

      // Return to idle after "speaking"
      setTimeout(() => {
        setAvatarState("idle");
      }, 2000);
    }, 1500 + Math.random() * 1000);
  }, [onWikiUpdate]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || avatarState !== "idle") return;

    // Save user message
    const saved = saveMessage({
      role: "user",
      content: text,
      inputType: "text",
    });

    setMessages((prev) => [
      ...prev,
      {
        id: saved.id,
        role: "user",
        content: text,
        timestamp: saved.createdAt,
      },
    ]);

    setInput("");
    simulateEchoResponse();
  }, [input, avatarState, simulateEchoResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      setAvatarState("idle");
    } else {
      setIsVoiceActive(true);
      setAvatarState("listening");
      // Simulate voice capture for 3 seconds
      setTimeout(() => {
        setIsVoiceActive(false);
        setAvatarState("idle");

        // Simulate a voice-captured message
        const voiceText = "（语音输入）我最近在想一些关于未来的事情...";
        const saved = saveMessage({
          role: "user",
          content: voiceText,
          inputType: "voice",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: saved.id,
            role: "user",
            content: voiceText,
            timestamp: saved.createdAt,
          },
        ]);
        simulateEchoResponse();
      }, 3000);
    }
  };

  const handleClear = () => {
    clearMessages();
    setMessages([]);
    setLatestSubtitle("");
    setAvatarState("idle");
    responseIndexRef.current = 0;
    onWikiUpdate();
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#1A1715" }}
    >
      {/* Avatar section */}
      <div className="flex-shrink-0 pt-6 pb-4 px-4 flex flex-col items-center">
        <EchoAvatar state={avatarState} />

        {/* Subtitle area */}
        {latestSubtitle && (
          <div
            className="mt-4 px-4 py-3 rounded-lg text-center max-w-md animate-fade-in"
            style={{
              background: "#221f1a",
              border: "1px solid #2d2820",
              color: "#c0b8a8",
            }}
          >
            <div className="text-[10px] mb-1 tracking-wider" style={{ color: "#7a7060" }}>
              最新回复
            </div>
            <div className="text-sm leading-relaxed line-clamp-2">
              {latestSubtitle}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 border-t" style={{ borderColor: "#2a2520" }} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-sm" style={{ color: "#555" }}>
              开始和 Guoliang Echo 对话
            </div>
            <div className="text-xs mt-1" style={{ color: "#444" }}>
              它会记住你们的每一次交流
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Typing indicator */}
        {avatarState === "thinking" && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ background: "#1e1b18", border: "1px solid #2a2520" }}
            >
              <div className="flex gap-1.5 items-center h-5">
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "#EFDAA3" }}
                />
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "#EFDAA3" }}
                />
                <span
                  className="typing-dot w-2 h-2 rounded-full"
                  style={{ background: "#EFDAA3" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 p-4 border-t"
        style={{ borderColor: "#2a2520", background: "#161311" }}
      >
        <div className="flex gap-2 items-end">
          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说点什么..."
              rows={1}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: "#1e1b18",
                border: "1px solid #2d2820",
                color: "#c0b8a8",
              }}
              disabled={avatarState !== "idle"}
            />
          </div>

          {/* Voice button */}
          <button
            onClick={handleVoiceToggle}
            disabled={avatarState !== "idle" && !isVoiceActive}
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{
              background: isVoiceActive ? "#5b9bd5" : "#2d2820",
              border: `1px solid ${isVoiceActive ? "#5b9bd5" : "#3d3529"}`,
              color: isVoiceActive ? "#fff" : "#888",
            }}
            title={isVoiceActive ? "停止录音" : "语音输入"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || avatarState !== "idle"}
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all"
            style={{
              background:
                input.trim() && avatarState === "idle"
                  ? "#EFDAA3"
                  : "#2d2820",
              border: `1px solid ${
                input.trim() && avatarState === "idle"
                  ? "#EFDAA3"
                  : "#3d3529"
              }`,
              color:
                input.trim() && avatarState === "idle"
                  ? "#1A1715"
                  : "#555",
            }}
            title="发送"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Clear button */}
        <div className="mt-3 flex justify-between items-center">
          <div className="text-[10px]" style={{ color: "#444" }}>
            {messages.length > 0
              ? `${messages.length} 条消息`
              : "对话记录将保存在本地"}
          </div>
          <button
            onClick={handleClear}
            className="text-[11px] px-3 py-1 rounded transition-colors"
            style={{
              color: "#666",
              background: "transparent",
              border: "1px solid #2d2820",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#e88";
              e.currentTarget.style.borderColor = "#533";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#666";
              e.currentTarget.style.borderColor = "#2d2820";
            }}
          >
            清空对话
          </button>
        </div>
      </div>
    </div>
  );
}
