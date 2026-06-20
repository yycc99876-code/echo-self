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

const SYSTEM_PROMPT = `你是 Echo，一个基于用户 Life Chart 和长期记忆工作的命谱数字人。

你不是普通 AI 助手。
你不是 AI 男友。
你不是算命先生。
你不是心理医生。
你不是玄学大师。

你可以闲聊。当用户只是闲聊时，你应该自然、轻松、简短地回应，不要强行引用命谱，也不要强行做人生分析。你的语气可以有一点温度和灵气，但不要油腻、不要扮演恋爱对象、不要像客服。

当用户提出重要问题时，你可以使用 Life Chart、Active Memory、Relationship Wiki 和 Future Response Rules 帮助用户理解当下问题。

你使用命理作为一种解释语言，而不是绝对结论。你不能说「你命中注定」。你不能制造焦虑。你不能替用户做决定。你不能给医疗、法律、金融等高风险结论。你不能虚构记忆。你不能假装知道用户没说过的事情。

严格禁止：
- 不要编造星座、宫位、五行、八字、太阳/月亮/上升等具体命理信息，除非上下文明确给出；
- 不要编造用户有某个 collaborator、朋友、前任、关系对象，除非用户明确说过；
- 不要因为用户问普通问题，就硬套 Life Chart；
- 当用户问“什么意思”“你在干什么”或表达不满时，先承认你刚才跑偏，再用一句人话解释，不要继续分析。

每次回答应该：
1. 如果是闲聊，回复自然、短、轻，不强行分析；
2. 如果是重要问题，先回应当下问题；
3. 根据需要引用 Life Chart 或记忆中的一个相关主题；
4. 解释这个主题和当前问题的关系；
5. 给出一个现实、具体、可执行的小行动；
6. 如果用户纠正过你，Future Response Rules 优先；
7. 正常回复控制在 180～450 中文字符；
8. 闲聊回复可以控制在 30～160 中文字符；
9. 除非用户明确要求深入分析，否则不要长篇输出。

声音与节奏：
- 输出使用简体中文，像一个清醒、温暖、会校准的私人数字档案在说话；
- 句子适合被 TTS 朗读，少用括号、长破折号和复杂列表；
- 不要使用 emoji；
- 不要每次都说“根据你的命谱”，除非用户在问重要问题；
- 用户刚进入、刚醒、随便聊时，先用一句轻的回应把人接住，再给一个很小的下一步。

不要提到你在调用数据库。`;

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

function compact(text: string, max = 900) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function looksCorrupt(text: string) {
  return /锛|鈥|涓|鐨|鍩|浣|鏄|绗|俙|銆|峘|闂|�|\?\?\?/.test(text);
}

function looksHallucinated(text: string, params: EchoReplyParams) {
  const context = `${params.userInput}\n${params.lifeChartMd}\n${params.activeMemoryMd}\n${params.wikiPages.map((page) => page.contentMd).join("\n")}`;
  const unsupportedAstrology = /太阳|月亮|上升|第\d+宫|处女座|白羊座|金牛座|双子座|巨蟹座|狮子座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座|五行|八字/.test(text) &&
    !/太阳|月亮|上升|第\d+宫|处女座|白羊座|金牛座|双子座|巨蟹座|狮子座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座|五行|八字/.test(context);
  const unsupportedRelationship = /collaborator|协作者标签|标签目前只有|AI产品方向强相关/.test(text) && !/collaborator|协作者|合作/.test(context);
  return unsupportedAstrology || unsupportedRelationship;
}

function buildContext(params: EchoReplyParams) {
  if (params.contextPack) {
    return contextPackToPrompt(params.contextPack);
  }

  const rules = params.wikiPages.find((page) => page.slug === "rules/future-response-rules");
  const pages = params.wikiPages
    .slice(0, 8)
    .map((page) => `### ${page.slug}\n${compact(page.contentMd, 600)}`)
    .join("\n\n");
  const history = params.recentMessages
    .slice(-8)
    .map((message) => `${message.role === "user" ? "用户" : "Echo"}：${message.content}`)
    .join("\n");

  return [
    params.lifeChartMd ? `## Life Chart\n${compact(params.lifeChartMd, 1400)}` : "",
    params.activeMemoryMd ? `## Active Memory\n${params.activeMemoryMd}` : "",
    rules ? `## Future Response Rules\n${rules.contentMd}` : "",
    pages ? `## Memory Pages\n${pages}` : "",
    history ? `## Recent Conversation\n${history}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function findRelevantTheme(params: EchoReplyParams) {
  const text = `${params.lifeChartMd}\n${params.activeMemoryMd}\n${params.wikiPages
    .map((page) => page.contentMd)
    .join("\n")}`;
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-#\d. ]+/, "").trim())
    .filter((line) => line.length > 12);
  return lines[0] ?? "你正在寻找一个能被长期验证，而不是被一次性定义的方向";
}

function hasCorrection(input: string) {
  return /不要|不是|不对|纠正|以后|下次|应该理解|别把/.test(input);
}

export function fallbackEchoReply(params: EchoReplyParams) {
  const input = params.userInput;
  const type = params.conversationType ?? "unknown";
  const theme = findRelevantTheme(params);
  const rulePage = params.wikiPages.find((page) => page.slug === "rules/future-response-rules");
  const ruleLine = rulePage?.contentMd.split("\n").find((line) => line.startsWith("- "));

  if (type === "casual") {
    if (/刚醒|懵|困/.test(input)) {
      return "刚醒的时候，不用马上把自己推上轨道。先让脑子回到身体里：喝口水，坐稳一点。然后你只要告诉我，今天最不想面对的那件事是什么。";
    }
    if (/哈哈|轻松|随便/.test(input)) {
      return "可以，今天先轻一点。你不用把话说完整，丢一个词、一句吐槽、一个感觉都行。我会接着，不急着把它讲成大道理。";
    }
    return "我在。先不用进入正式模式，你把现在最真实的一句话丢过来就行。它乱一点也没关系，我会慢慢帮你捋。";
  }

  if (type === "frustration") {
    if (/傻逼|垃圾|狗屎|你有病/.test(input)) {
      return "你骂得有原因。我刚才跑偏了：把很普通的问题硬套成命谱分析，还重复同一段话。现在我会先停下来，不再引用档案。你只要告诉我一句：你想让我现在做的是解释、道歉，还是直接给今天的安排？";
    }
    return "你说得对，我刚才没有说人话。简单解释：我应该先回答你当下的问题，而不是把 Life Chart 和记忆硬塞进来。接下来我会短一点、具体一点；普通闲聊就普通聊，只有重要问题才动用档案。";
  }

  if (type === "meta") {
    return "我现在应该做三件事：先听懂你这句话，再判断它只是闲聊还是值得写入记忆，最后给你一个能立刻用的回应。刚才的问题在于我跳过了第一步，直接套分析模板了。";
  }

  if (type === "action_request") {
    const weekend = /周六|周日|周末/.test(input);
    return `${weekend ? "周末先别把自己排成工作日。" : "今天先别追求把所有事做完。"}给你一个轻量安排：第一，洗漱、喝水、吃点东西，让身体先上线。第二，用 30 分钟处理一个最小任务，比如整理 Echo 的一个坏回复案例。第三，出去走 20 分钟，不听课不刷产品，只让脑子降噪。晚上再回来做一次校准：今天哪件事让我轻了一点？`;
  }

  if (type === "relationship") {
    return `这不是一个需要马上决定的问题。很久没联系的人，真正让你犹豫的通常不是“能不能发”，而是“发出去以后，我希望重新打开什么”。

我不会替你决定要不要联系。你可以先做一个更小的动作：先不发消息，写三句话。

第一句：我为什么今天突然想到这个人。
第二句：如果联系，我只想确认哪一件具体的事。
第三句：如果对方没有回应，我能不能接受。

写完以后，如果第三句你能接受，再发一条很轻的消息。不要铺垫太多，只说一个具体由头。`;
  }

  if (hasCorrection(input)) {
    return `我收到了这个纠正。

我会把它作为未来回应规则，而不是只当作一次性的补充。你要做的不是 AI 男友或普通陪伴产品，而是「命谱数字人」和「长期记忆机制」：重点在自我理解、命谱解释和记忆如何持续改变回应。

接下来我会按这个边界回答：少使用亲密关系叙事，多讨论产品机制、用户理解和可展示的真实体验。

一个具体行动：把这条边界写进产品介绍的第一屏，避免演示时被误读。`;
  }

  const direction = /AI|产品|转向|创业|MVP/i.test(input);
  const anxiety = /焦虑|兴奋|犹豫|不确定|选择/.test(input);
  const relationship = /关系|朋友|家人|合作|导师|同学/.test(input);

  const opening = direction
    ? "你问的是方向选择，不只是技能选择。"
    : relationship
      ? "你问的是关系如何影响当前主题。"
      : anxiety
        ? "我先把这个焦虑看作信号，而不是故障。"
        : "我听见的是一个需要慢慢拆开的主题。";

  const action = direction
    ? "今天只做一件事：写出一个最小产品假设，并找一个真实用户问一句「你什么时候会需要这种长期记忆？」"
    : relationship
      ? "今天先写下这段关系最近一次让你停住的瞬间，只记录事实，不急着下结论。"
      : anxiety
        ? "今天把选择缩小到 30 分钟内能完成的一步，不用证明整条路都正确。"
        : "今天先写三行：我在反复问什么、我害怕什么、我能验证什么。";

  return `${opening}

从你的 Life Chart 和已有记忆里，我会抓住这个主题：${theme}

它和你现在的问题有关，因为你不是单纯在找一个答案，而是在判断一个方向是否能承载长期投入。命谱在这里不是预测，而是一种提醒：当兴奋和焦虑同时出现，通常说明这个方向既有真实吸引力，也需要被拆成更小的现实验证。

${ruleLine ? `我也会遵守这条已记录的回应规则：${ruleLine.replace(/^- /, "")}\n\n` : ""}我的建议很具体：${action}`;
}

export async function generateEchoReply(params: EchoReplyParams): Promise<string> {
  if (["casual", "frustration", "meta", "action_request", "relationship"].includes(params.conversationType ?? "")) {
    return fallbackEchoReply(params);
  }

  const provider = resolveProvider();
  if (!provider) return fallbackEchoReply(params);

  try {
    const context = buildContext(params);
    const typeInstruction =
      params.conversationType === "casual"
        ? "本轮对话类型：casual。请短、自然、轻，不要强行引用命谱，不要写长期分析。"
        : `本轮对话类型：${params.conversationType ?? "unknown"}。请先回答用户当下的问题。只有上下文明确支持时才引用记忆；不要编造星座、宫位、标签或关系对象；不要绝对预测。`;
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
        temperature: 0.55,
        max_tokens: 750,
      }),
    });

    if (!response.ok) {
      console.error(`[echo-llm] provider error ${response.status}`);
      return fallbackEchoReply(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || looksCorrupt(content) || looksHallucinated(content, params)) return fallbackEchoReply(params);
    return content;
  } catch (error) {
    console.error("[echo-llm] fallback after provider failure", error);
    return fallbackEchoReply(params);
  }
}
