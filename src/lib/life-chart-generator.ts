export interface LifeChartInput {
  name: string;
  birthDate: string;
  birthTime?: string;
  currentQuestion: string;
  currentEmotion: string;
  companionStyle: string;
}

type ProviderConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
};

function resolveProvider(): ProviderConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    };
  }

  if (process.env.DASHSCOPE_API_KEY) {
    return {
      apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey: process.env.DASHSCOPE_API_KEY,
      model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
    };
  }

  return null;
}

function systemPrompt() {
  return `You create clean-room Life Chart dossiers for Echo Self.

Principles:
- This is not fortune telling and not a fixed destiny claim.
- Use life-chart language as an interpretive lens for self-understanding.
- Never say "you are destined to" or make absolute predictions.
- Be calm, specific, restrained, and useful for long-term memory.
- Write in Simplified Chinese.

Return strict Markdown with these sections:
# Life Chart
## 基础信息
## 当前命题
## 天赋倾向
## 阴影倾向
## 关系需求
## Echo 的回应原则
## 可执行起点`;
}

function userMessage(input: LifeChartInput) {
  return [
    `名字：${input.name}`,
    `出生日期：${input.birthDate}`,
    input.birthTime ? `出生时间：${input.birthTime}` : "出生时间：未提供",
    `当前最想问的问题：${input.currentQuestion}`,
    `最近最强烈的情绪：${input.currentEmotion}`,
    `希望 Echo 如何陪伴：${input.companionStyle}`,
  ].join("\n");
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function looksCorrupt(text: string) {
  return /锛|鈥|涓|鐨|鍩|浣|鏄|绗|俙|銆|峘|闂|�|\?\?\?/.test(text);
}

export function fallbackGenerateLifeChart(input: LifeChartInput) {
  const text = `${input.currentQuestion} ${input.currentEmotion} ${input.companionStyle}`.toLowerCase();
  const strengths: string[] = [];
  const shadows: string[] = [];

  if (includesAny(text, ["ai", "产品", "product", "创业", "mvp", "用户"])) {
    strengths.push("你对产品方向的敏感度来自一种把抽象体验整理成系统的倾向。");
    strengths.push("你会自然关注机制、记忆、反馈和长期关系，而不只关注一次性的功能展示。");
  }
  if (includesAny(text, ["焦虑", "兴奋", "不确定", "犹豫"])) {
    strengths.push("焦虑和兴奋同时出现，说明这个问题既有风险，也真实牵动你的愿望。");
    shadows.push("你可能会在行动前反复验证方向，导致真正的市场反馈被推迟。");
  }
  if (includesAny(text, ["关系", "陪伴", "理解", "记忆"])) {
    strengths.push("你重视被长期理解，而不是被快速回应。这个倾向适合做长期记忆型产品。");
  }

  if (shadows.length === 0) {
    shadows.push("需要留意把思考继续加深，却没有转化成可被验证的小行动。");
  }

  const createdAt = new Date().toLocaleString("zh-CN", { hour12: false });

  return `# Life Chart

## 基础信息
- 名字：${input.name}
- 出生日期：${input.birthDate}
${input.birthTime ? `- 出生时间：${input.birthTime}` : "- 出生时间：未提供"}
- 生成时间：${createdAt}

## 当前命题
你现在最想面对的问题是：${input.currentQuestion}

当前情绪是：${input.currentEmotion}。这不是一个需要被立刻消除的噪音，而是一条信号：它提示你，这个方向同时连接着期待、压力和身份转换。

## 天赋倾向
${strengths.slice(0, 3).map((item) => `- ${item}`).join("\n")}

## 阴影倾向
${shadows.slice(0, 2).map((item) => `- ${item}`).join("\n")}

## 关系需求
你希望 Echo 的陪伴方式是：${input.companionStyle}

这会成为 Echo 的回应边界：少给空泛鼓励，多做具体拆解；少替你决定，多帮助你看见反复出现的主题。

## Echo 的回应原则
1. 不把命谱当作结论，只把它当作观察框架。
2. 回答与「${input.currentQuestion}」相关问题时，要先还原你的真实处境，再给行动建议。
3. 当你表达「${input.currentEmotion}」时，先承认它的复杂性，再帮助你缩小下一步。
4. 遵守你的陪伴偏好：${input.companionStyle}

## 可执行起点
接下来 24 小时内，只做一件小事：写下这个方向中最值得验证的一个用户问题，并找到一个真实的人问出来。`;
}

export function summarizeLifeChart(contentMd: string, input: LifeChartInput) {
  const plain = contentMd
    .replace(/[#>*_`]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");

  return [
    `用户：${input.name}。当前命题：${input.currentQuestion}`,
    `当前情绪：${input.currentEmotion}。希望 Echo：${input.companionStyle}`,
    `命谱摘要：${plain.slice(0, 360)}`,
  ].join("\n");
}

export async function generateLifeChart(input: LifeChartInput): Promise<string> {
  const provider = resolveProvider();
  if (!provider) return fallbackGenerateLifeChart(input);

  try {
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: userMessage(input) },
        ],
        temperature: 0.55,
        max_tokens: 1300,
      }),
    });

    if (!response.ok) {
      console.error(`[life-chart] provider error ${response.status}`);
      return fallbackGenerateLifeChart(input);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || looksCorrupt(content)) return fallbackGenerateLifeChart(input);
    return content;
  } catch (error) {
    console.error("[life-chart] fallback after provider failure", error);
    return fallbackGenerateLifeChart(input);
  }
}
