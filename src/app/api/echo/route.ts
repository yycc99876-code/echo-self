import { NextRequest, NextResponse } from "next/server";
import {
  addWikiEdit,
  getActiveMemory,
  getLifeChart,
  getMemoryState,
  getOnboardingState,
  getRecentMessages,
  getRelationshipItems,
  getWikiPages,
  saveLifeChart,
  saveMessage,
  saveOnboardingState,
  upsertWikiPage,
  type InputType,
} from "@/lib/server-memory-store";
import { generateEchoReply } from "@/lib/echo-llm";
import { generateLifeChart, summarizeLifeChart } from "@/lib/life-chart-generator";
import { applyOnboardingInput, onboardingToLifeChartInput } from "@/lib/onboarding-flow";
import {
  buildContextPack,
  classifyConversation,
  shouldWriteLongTermMemory,
  type ConversationType,
} from "@/lib/conversation-context";
import { queueConversationConsolidation, queueMemoryWriter } from "@/lib/wiki-updater";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message?: string; inputType?: InputType };
    const message = body.message?.trim();
    const inputType = body.inputType ?? "text";

    if (!message) {
      return NextResponse.json({ error: "message is required", reply: "" }, { status: 400 });
    }

    const lifeChart = getLifeChart();

    if (!lifeChart) {
      const conversationType: ConversationType = "onboarding";
      const userMessage = saveMessage({ role: "user", content: message, inputType, conversationType });
      const result = applyOnboardingInput(getOnboardingState(), message);
      let onboarding = saveOnboardingState(result.state);
      let reply = result.reply;

      if (result.ready) {
        const readyState = saveOnboardingState({ ...result.state, status: "completed" });
        onboarding = readyState;
        const input = onboardingToLifeChartInput(readyState);
        const contentMd = await generateLifeChart(input);
        const savedChart = saveLifeChart({
          userName: input.name,
          birthDate: input.birthDate,
          birthTime: input.birthTime,
          birthPlace: input.birthPlace,
          currentQuestion: input.currentQuestion,
          currentEmotion: input.currentEmotion,
          companionStyle: input.companionStyle,
          contentMd,
          summaryMd: summarizeLifeChart(contentMd, input),
        });

        upsertWikiPage({
          slug: "user/life-chart-interpretations",
          title: "Life Chart Interpretations",
          contentMd: `# Life Chart Interpretations\n\n- [${new Date().toISOString().slice(0, 10)}] 通过 Echo 对话式唤醒建立初始档案：${input.currentQuestion}`,
          tags: ["life-chart", "onboarding"],
          sourceMessageIds: [userMessage.id],
          sourceQuotes: [message],
        });
        addWikiEdit({
          pageSlug: "user/life-chart-interpretations",
          editSummary: "通过对话式唤醒保存初始 Life Chart",
        });

        reply = `档案已经成形，${savedChart.userName}。\n\n我现在有了第一层地图：你的出生信息、当前问题，以及你希望我怎样陪你校准。\n\n接下来不用选入口，也不用切页面。你只要继续说一句此刻最真实的状态，我会沿着这份档案继续理解你。`;
      }

      const assistantMessage = saveMessage({
        role: "assistant",
        content: reply,
        inputType: "text",
        conversationType,
      });

      return NextResponse.json({
        reply,
        assistantMessageId: assistantMessage.id,
        conversationType,
        onboardingState: onboarding,
        memoryUpdateStatus: result.ready ? "completed" : "skipped",
      });
    }

    const conversationType: ConversationType = classifyConversation(message);
    const userMessage = saveMessage({ role: "user", content: message, inputType, conversationType });

    const activeMemory = getActiveMemory();
    const wikiPages = getWikiPages();
    const recentMessages = getRecentMessages(10);
    const relationshipItems = getRelationshipItems();
    const contextPack = buildContextPack({
      lifeChart,
      activeMemory,
      wikiPages,
      recentMessages,
      conversationType,
      relationshipItems,
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
    queueConversationConsolidation();

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
