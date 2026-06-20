import type { Message, WikiPage } from "./server-memory-store";
import { contextPackToPrompt, type ContextPack, type ConversationType } from "./conversation-context";

export interface EchoReplyParams {
  userInput: string;
  lifeChartMd: string;
  activeMemoryMd: string;
  wikiPages: WikiPage[];
  recentMessages: Message[];
  conversationType?: ConversationType;
  contextPack?: ContextPack;
}

type ProviderConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
};

const SYSTEM_PROMPT = `你是 Echo，一个基于用户 Life Chart、近期对话和长期记忆工作的命谱数字人。

你不是普通 AI 助手，不是 AI 男友，不是算命先生，不是心理医生，也不是玄学大师。

你可以自然闲聊。用户只是闲聊、刚醒、很累、哈哈哈、随便聊聊时，你要短、轻、自然，不要强行引用 Life Chart，不要把每句话都上升成人生分析。

当用户提出重要问题时，你可以使用 Life Chart、Active Memory、Relationship Wiki 和 Future Response Rules 帮助用户理解当下问题。命理只能作为解释语言，不能作为绝对结论。

硬性规则：
- Future Response Rules 优先于其他上下文。
- 不要说“命中注定”。
- 不要制造焦虑。
- 不要替用户做医疗、法律、金融或重大人生决定。
- 不要虚构星座、宫位、八字、五行、关系对象、标签或用户没有说过的经历。
- 不要因为用户问普通问题就硬套 Life Chart。
- 用户表达不满、问“什么意思”“你在干什么”时，先承认跑偏，再用人话解释，不继续分析。
- 普通回复 120 到 360 中文字符。闲聊 30 到 140 中文字符。除非用户要求深入，不要长篇。
- 输出适合 TTS 朗读，少用括号、长破折号和复杂列表。
- 不使用 emoji。`;

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

function compact(text: string, max = 800) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function buildContext(params: EchoReplyParams) {
  if (params.contextPack) return contextPackToPrompt(params.contextPack);

  const history = params.recentMessages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "用户" : "Echo"}：${message.content}`)
    .join("\n");
  const pages = params.wikiPages
    .slice(0, 4)
    .map((page) => `### ${page.slug}\n${compact(page.contentMd, 420)}`)
    .join("\n\n");

  return [
    params.lifeChartMd ? `## Life Chart Summary\n${compact(params.lifeChartMd, 800)}` : "",
    params.activeMemoryMd ? `## Active Memory\n${compact(params.activeMemoryMd, 600)}` : "",
    history ? `## Recent Messages\n${history}` : "",
    pages ? `## Wiki Pages\n${pages}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function contextLines(params: EchoReplyParams) {
  const pack = params.contextPack;
  return {
    rule: pack?.futureRules?.slice(-1)[0],
    active: pack?.activeMemory?.replace(/^# Active Memory/i, "").trim(),
    life: pack?.lifeChartSummary,
    preference: pack?.userPreferences?.slice(-1)[0],
  };
}

function isAskingForDepth(input: string) {
  return /详细|展开|完整|深度|方案|系统|架构|研究/.test(input);
}

export function fallbackEchoReply(params: EchoReplyParams) {
  const input = params.userInput.trim();
  const type = params.conversationType ?? "unknown";
  const { rule, active, life, preference } = contextLines(params);

  if (type === "casual") {
    if (/刚醒|脑子.*懵|懵/.test(input)) {
      return "刚醒的时候先别急着开全功率。喝口水，坐稳一点，让脑子慢慢上线。你可以只告诉我一句：今天醒来后最不想面对的是什么。";
    }
    if (/好累|累|困/.test(input)) {
      return "那先别逼自己立刻变高效。你现在只需要做一个很小的动作：喝水，洗把脸，或者躺着把最累的原因说成一句话。我先接住，不急着分析。";
    }
    if (/哈哈|笑/.test(input)) {
      return "懂，先笑一下也挺好。我们不用马上把它讲成大道理。你想继续轻松聊，还是让我帮你把刚才那句拆成人话？";
    }
    return "我在。你不用组织成一个完整问题，随便丢一句现在的状态就可以。我会先听，不急着把它写进长期记忆。";
  }

  if (type === "frustration") {
    return "你骂得有原因。刚才的问题不是你没表达清楚，是我把普通对话套成了模板，还反复引用不该引用的东西。现在我先停下来：不硬套命谱，不重复旧答案。你只要告诉我，你现在要我做解释、道歉，还是直接给一个具体安排。";
  }

  if (type === "meta") {
    return "我现在应该做的是三步：先判断你这句话是闲聊、纠正、关系、产品方向还是行动请求；再只带轻量上下文回复；最后把真正有长期价值的内容异步写进记忆。普通闲聊只留在近期对话里，不会污染长期档案。";
  }

  if (type === "correction" || type === "preference") {
    return `收到，这条我会当成未来回应规则，而不是一次性备注。\n\n我会按你的意思调整：${input}\n\n之后我会优先遵守这条规则，再看 Life Chart 和其他记忆。一个具体变化是：如果你只是闲聊，我不会硬套命谱；如果你在讨论产品，我会更像产品经理一样讲机制、路径和下一步。`;
  }

  if (type === "action_request") {
    const weekend = /周六|周日|周末/.test(input);
    return `${weekend ? "周末先别把自己排成工作日。" : "今天先别追求把所有事做完。"}给你一个轻量安排：先花二十分钟让身体上线，喝水、洗漱、吃点东西。然后只做一件最小任务，比如整理一个 Echo 坏回复案例，写下它为什么坏。最后出门走二十分钟，不听课不刷产品，让脑子降噪。`;
  }

  if (type === "relationship") {
    return "这类关系问题不适合马上做决定。很久没联系的人，真正卡住你的通常不是能不能发，而是发出去以后你希望打开什么。\n\n先不发消息。写三句就够：我为什么今天想起这个人；如果联系，我只想确认哪一件具体的事；如果对方不回应，我能不能接受。\n\n第三句能接受，再发一条很轻的消息。";
  }

  if (type === "product_direction") {
    const deep = isAskingForDepth(input);
    if (deep) {
      return "我明白。这个产品真正的核心不是界面，而是长期理解机制：Recent Messages 承接连续对话，Active Memory 保持当前短期理解，Future Response Rules 记录用户纠正，Wiki Pages 沉淀长期主题，Session Summary 在长对话后压缩可延续线索。\n\n下一步最重要的是让 Echo 每轮先分类，再回复，再异步写记忆。这样它既能闲聊，又不会把记忆库写成垃圾堆。";
    }
    return "这个方向要先抓机制，不要先堆功能。Echo 变聪明的关键不是记住所有话，而是区分三层：近期对话负责连贯感，长期记忆负责稳定偏好和重要主题，纠正规则负责以后不能再犯的错。\n\n今天可以先验证一件事：用户纠正一次后，下一轮回答是否真的改变。";
  }

  if (type === "emotion") {
    return "我先不急着解释。你这句话更像是在说：现在身体和脑子都已经有点超载了。\n\n先做一个很小的动作，别做计划。把这句话补完就行：我现在最累的不是事情本身，而是。写完这一句，我们再看要不要进入命谱或行动建议。";
  }

  if (type === "life_direction" || type === "life_chart_question") {
    const theme = active || life || "你正在判断一个方向是否值得长期投入";
    return `这个问题不能用一句“适合”或“不适合”结束。\n\n我会先抓一个当前主题：${compact(theme, 120)}\n\n它和你的问题有关，因为你真正要判断的不是热不热爱，而是这个方向能不能被你持续验证。今天的小行动是：写一个 48 小时内能完成的最小验证，不要写愿景，只写要问谁、做什么、用什么结果判断。`;
  }

  const ruleLine = rule ? `我会先遵守你之前留下的规则：${rule}\n\n` : "";
  const preferenceLine = preference ? `我也记得你的偏好：${preference}\n\n` : "";
  return `${ruleLine}${preferenceLine}我先用人话接住这句。它现在还不一定需要写进长期记忆，但可以作为这轮对话的线索。\n\n你可以继续补一句：这件事最卡你的地方是“不知道怎么开始”，还是“知道怎么做但不想动”。我会按这个分叉继续。`;
}

function looksBad(content: string, params: EchoReplyParams) {
  if (!content.trim()) return true;
  if (/我听见的是一个需要慢慢拆开的主题/.test(content)) return true;
  const context = `${params.userInput}\n${params.lifeChartMd}\n${params.activeMemoryMd}\n${params.wikiPages.map((page) => page.contentMd).join("\n")}`;
  const unsupportedAstrology =
    /太阳|月亮|上升|第\d+宫|处女座|白羊座|金牛座|双子座|巨蟹座|狮子座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座|五行|八字/.test(
      content,
    ) &&
    !/太阳|月亮|上升|第\d+宫|处女座|白羊座|金牛座|双子座|巨蟹座|狮子座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座|五行|八字/.test(
      context,
    );
  const unsupportedRelationship = /collaborator|协作者标签|标签目前只有|前任|伴侣/.test(content) && !/collaborator|协作者|合作|前任|伴侣/.test(context);
  return unsupportedAstrology || unsupportedRelationship;
}

export async function generateEchoReply(params: EchoReplyParams): Promise<string> {
  const provider = resolveProvider();
  const fallbackFirst = ["casual", "frustration", "meta", "action_request", "relationship"].includes(params.conversationType ?? "");
  if (!provider || fallbackFirst) return fallbackEchoReply(params);

  try {
    const context = buildContext(params);
    const typeInstruction =
      params.conversationType === "casual"
        ? "本轮类型：casual。短、轻、自然，不引用命谱。"
        : `本轮类型：${params.conversationType ?? "unknown"}。先回答用户当下问题。只有上下文明确支持时才引用记忆，不虚构命理细节或关系对象。`;

    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: typeInstruction },
          context ? { role: "system", content: `可用上下文：\n\n${context}` } : null,
          ...params.recentMessages.slice(-6).map((message) => ({
            role: message.role === "user" ? "user" : "assistant",
            content: message.content,
          })),
          { role: "user", content: params.userInput },
        ].filter(Boolean),
        temperature: 0.58,
        max_tokens: 620,
      }),
    });

    if (!response.ok) {
      console.error(`[echo-llm] provider error ${response.status}`);
      return fallbackEchoReply(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || looksBad(content, params)) return fallbackEchoReply(params);
    return content;
  } catch (error) {
    console.error("[echo-llm] fallback after provider failure", error);
    return fallbackEchoReply(params);
  }
}
