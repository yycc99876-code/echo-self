import { NextRequest, NextResponse } from "next/server";
import { generateLifeChart, summarizeLifeChart, type LifeChartInput } from "@/lib/life-chart-generator";
import { addWikiEdit, saveLifeChart, upsertWikiPage } from "@/lib/server-memory-store";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as LifeChartInput;
    if (!input.name || !input.birthDate || !input.currentQuestion || !input.currentEmotion || !input.companionStyle) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const contentMd = await generateLifeChart(input);
    const lifeChart = saveLifeChart({
      userName: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime || undefined,
      currentQuestion: input.currentQuestion,
      currentEmotion: input.currentEmotion,
      companionStyle: input.companionStyle,
      contentMd,
      summaryMd: summarizeLifeChart(contentMd, input),
    });

    upsertWikiPage({
      slug: "user/life-chart-interpretations",
      title: "Life Chart Interpretations",
      contentMd: `# Life Chart Interpretations\n\n- [${new Date().toISOString().slice(0, 10)}] 建立初始命谱档案：${input.currentQuestion}`,
      tags: ["life-chart", "interpretation"],
      references: 1,
      relatedSlugs: ["destiny/current-theme", "rules/future-response-rules"],
    });
    addWikiEdit({ pageSlug: "user/life-chart-interpretations", editSummary: "保存初始 Life Chart" });

    return NextResponse.json({ lifeChart });
  } catch (error) {
    console.error("[api/life-chart]", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
