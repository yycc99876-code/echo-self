import type { LifeChartInput } from "./life-chart-generator";
import type { OnboardingField, OnboardingState } from "./server-memory-store";

export const ONBOARDING_FIELDS: OnboardingField[] = [
  "name",
  "gender",
  "birthDate",
  "birthTime",
  "birthPlace",
  "currentQuestion",
  "companionStyle",
];

export const ONBOARDING_LABELS: Record<OnboardingField, string> = {
  name: "姓名",
  gender: "性别",
  birthDate: "日期",
  birthTime: "时间",
  birthPlace: "地点",
  currentQuestion: "当前问题",
  companionStyle: "陪伴方式",
};

function blankState(): Omit<OnboardingState, "updatedAt"> {
  return buildState({}, "name", "collecting");
}

function cleanAnswer(field: OnboardingField, raw: string) {
  const text = raw.trim();
  if (field === "name") return text.replace(/^我叫/, "").replace(/^叫我/, "").replace(/^名字是/, "").trim();
  if (field === "gender") return text.replace(/我是|性别|我的/g, "").trim();
  if (field === "birthTime" && /不记得|不知道|忘了|不确定|随便/.test(text)) return "不确定";
  if (field === "companionStyle" && text.length < 4) return "具体一点，不要空泛鼓励";
  return text;
}

function isNonAnswer(raw: string) {
  return /^(你好|hi|hello|在吗|哈+|哈哈哈|随便聊聊)$/i.test(raw.trim());
}

function nextMissing(fields: Partial<Record<OnboardingField, string>>) {
  return ONBOARDING_FIELDS.find((field) => !fields[field]?.trim()) ?? "companionStyle";
}

function buildState(
  fields: Partial<Record<OnboardingField, string>>,
  currentField: OnboardingField,
  status: OnboardingState["status"],
): Omit<OnboardingState, "updatedAt"> {
  const completedFields = ONBOARDING_FIELDS.filter((field) => Boolean(fields[field]?.trim()));
  const missingFields = ONBOARDING_FIELDS.filter((field) => !fields[field]?.trim());
  return {
    status,
    fields,
    currentField,
    completedFields,
    missingFields,
    progress: Math.round((completedFields.length / ONBOARDING_FIELDS.length) * 100),
  };
}

export function nextOnboardingPrompt(state: OnboardingState | Omit<OnboardingState, "updatedAt">) {
  const field = state.currentField;
  const name = state.fields.name;

  const prompts: Record<OnboardingField, string> = {
    name: "我还不认识你。先告诉我一个名字，我会用它建立你的第一份 Echo 档案。",
    gender: `好，${name ?? "我先记住你"}。接下来告诉我你的性别，或者你希望我怎样称呼你的身份。`,
    birthDate: "收到。出生日期直接说就行，比如 2004年8月24日。",
    birthTime: "时间记得吗？不需要很精确。上午、下午、晚上，或者不确定，都可以。",
    birthPlace: "最后一个基础信息：你在哪个城市出生？只说城市就够了。",
    currentQuestion: "档案的骨架已经有了。现在告诉我，你最近最想反复问自己的一个问题是什么？",
    companionStyle: "最后，告诉我你希望 Echo 怎么陪你。比如：具体一点、少玄学、像产品经理一样拆解。",
  };

  return prompts[field];
}

export function applyOnboardingInput(existing: OnboardingState | null, raw: string) {
  const current = existing ?? blankState();
  const fields = { ...current.fields };

  if (!isNonAnswer(raw)) {
    fields[current.currentField] = cleanAnswer(current.currentField, raw);
  }

  const nextField = nextMissing(fields);
  const completedFields = ONBOARDING_FIELDS.filter((field) => Boolean(fields[field]?.trim()));
  const ready = completedFields.length >= ONBOARDING_FIELDS.length;
  const state = buildState(fields, nextField, ready ? "ready" : "collecting");
  const reply = ready
    ? "档案已经成形。我会先生成一份轻量 Life Chart。它不是结论，只是我理解你的第一层地图。"
    : nextOnboardingPrompt(state);

  return { state, reply, ready };
}

export function onboardingToLifeChartInput(state: OnboardingState): LifeChartInput {
  return {
    name: state.fields.name ?? "未命名用户",
    birthDate: state.fields.birthDate ?? "未提供",
    birthTime: state.fields.birthTime,
    birthPlace: state.fields.birthPlace,
    currentQuestion: state.fields.currentQuestion ?? "我现在最需要理解自己的什么？",
    currentEmotion: "正在建立初始档案",
    companionStyle: state.fields.companionStyle ?? "具体一点，不要空泛鼓励",
  };
}
