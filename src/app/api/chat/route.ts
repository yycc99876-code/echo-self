/**
 * POST /api/chat — 简化版对话 API
 *
 * 供前端 ChatPanel 或自定义 chat store 调用。
 * 内部使用 echo-llm.ts 的 generateEchoReply，自动注入命谱、记忆、Wiki 上下文。
 *
 * 如果需要完整 Wiki 更新功能，请使用 /api/echo。
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLifeChart,
  getActiveMemory,
  getWikiPages,
  getRecentMessages,
  saveMessage,
} from "@/lib/server-memory-store";
import { generateEchoReply } from "@/lib/echo-llm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body as {
      message: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ reply: "消息不能为空" }, { status: 400 });
    }

    const trimmed = message.trim();

    // Read server-side context
    const lifeChart = getLifeChart();
    const activeMemory = getActiveMemory();
    const wikiPages = getWikiPages();
    const recentMessages = getRecentMessages(10);

    // Generate reply using echo-llm (has mock fallback when no API key)
    const reply = await generateEchoReply({
      userInput: trimmed,
      lifeChartMd: lifeChart?.contentMd ?? "",
      activeMemoryMd: activeMemory?.contentMd ?? "",
      wikiPages,
      recentMessages: recentMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        inputType: m.inputType,
        createdAt: m.createdAt,
      })),
    });

    // Save messages to server store
    saveMessage({ role: "user", content: trimmed, inputType: "text" });
    saveMessage({ role: "assistant", content: reply, inputType: "text" });

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[api/chat] Error:", err);
    return NextResponse.json({ reply: "[服务器错误]" }, { status: 500 });
  }
}
