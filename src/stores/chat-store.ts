"use client";

import { create } from "zustand";
import {
  getMessages,
  saveMessage,
  clearMessages,
  type Message,
} from "@/lib/memory-store";

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  loadMessages: () => void;
  sendMessage: (content: string, inputType?: "text" | "voice") => Promise<void>;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  loadMessages: () => {
    set({ messages: getMessages() });
  },

  sendMessage: async (content: string, inputType = "text") => {
    // Save user message locally
    const userMsg = saveMessage({ role: "user", content, inputType });
    set({ messages: [...get().messages, userMsg], isLoading: true, error: null });

    try {
      // Call API route (uses echo-llm with mock fallback)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: get().messages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      const assistantMsg = saveMessage({
        role: "assistant",
        content: data.reply,
        inputType: "text",
      });

      set({ messages: [...get().messages, assistantMsg], isLoading: false });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      set({ error: errorMessage, isLoading: false });
    }
  },

  clearChat: () => {
    clearMessages();
    set({ messages: [], error: null });
  },
}));
