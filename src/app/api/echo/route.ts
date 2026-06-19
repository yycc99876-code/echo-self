import { NextRequest, NextResponse } from "next/server";
import {
  getActiveMemory,
  getLifeChart,
  getMemoryState,
  getRecentMessages,
  getWikiPages,
  saveMessage,
  type InputType,
} from "@/lib/server-memory-store";
import { generateEchoReply } from "@/lib/echo-llm";
import {
  buildContextPack,
  classifyConversation,
  shouldWriteLongTermMemory,
  type ConversationType,
} from "@/lib/conversation-context";
import { queueMemoryWriter } from "@/lib/wiki-updater";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string; inputType?: InputType };
    const message = body.message?.trim();
    const inputType = body.inputType ?? "text";

    if (!message) {
      return NextResponse.json({ error: "message is required", reply: "" }, { status: 400 });
    }

    const conversationType: ConversationType = classifyConversation(message);
    const userMessage = saveMessage({ role: "user", content: message, inputType, conversationType });

    const lifeChart = getLifeChart();
    const activeMemory = getActiveMemory();
    const wikiPages = getWikiPages();
    const recentMessages = getRecentMessages(10);
    const contextPack = buildContextPack({
      lifeChart,
      activeMemory,
      wikiPages,
      recentMessages,
      conversationType,
    });

    const reply = await generateEchoReply({
      userInput: message,
      lifeChartMd: lifeChart?.summaryMd ?? lifeChart?.contentMd ?? "",
      activeMemoryMd: activeMemory?.contentMd ?? "",
      wikiPages,
      recentMessages,
      conversationType,
      contextPack,
    });

    const assistantMessage = saveMessage({
      role: "assistant",
      content: reply,
      inputType: "text",
      conversationType,
    });

    const shouldWrite = shouldWriteLongTermMemory(conversationType, message);
    if (shouldWrite) {
      queueMemoryWriter({ userMessage, assistantMessage, conversationType, contextPack });
    }

    return NextResponse.json({
      reply,
      assistantMessageId: assistantMessage.id,
      conversationType,
      memoryUpdateStatus: shouldWrite ? "queued" : "skipped",
    });
  } catch (error) {
    console.error("[api/echo]", error);
    return NextResponse.json(
      {
        error: "internal_error",
        reply: "抱歉，我刚才没有稳定地接住这句话。请再发一次，我会继续沿着你的命谱和记忆来回应。",
        conversationType: "unknown",
        memoryUpdateStatus: "skipped",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", memoryState: getMemoryState() });
}
