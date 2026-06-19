/**
 * Digital Self Chat - 类型定义
 *
 * Digital Self 是基于用户工作历史、命谱和长期记忆生成的数字分身。
 * 它不是一个通用 AI 助手，而是用户的镜像人格。
 */

/** 角色运行状态 */
export type DigitalSelfState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** 角色身份配置 */
export interface DigitalSelfIdentity {
  /** 角色名称，默认 "Guoliang Echo" */
  displayName: string;
  /** 头像：URL 或 placeholder 标识 */
  avatar: string;
  /** 语音配置 */
  voice: VoiceConfig;
  /** 角色自我描述（由系统生成，用于 prompt 注入） */
  selfDescription: string;
}

/** 语音配置 */
export interface VoiceConfig {
  /** 当前使用 browser TTS fallback */
  engine: 'browser-tts' | 'custom';
  /** 语速 */
  rate: number;
  /** 音调 */
  pitch: number;
  /** 语言 */
  lang: string;
}

/** 单条对话消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'echo';
  content: string;
  timestamp: number;
  /** 该消息生成时的活跃记忆快照（用于调试/回溯） */
  memorySnapshot?: string;
}

/** 一轮对话会话 */
export interface ChatSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  messages: ChatMessage[];
  /** 会话期间产生的关系记忆条目 ID */
  memoryEntryIds: string[];
}

/** Digital Self 的完整运行时状态 */
export interface DigitalSelfRuntime {
  state: DigitalSelfState;
  identity: DigitalSelfIdentity;
  currentSession: ChatSession | null;
  /** 最近一次错误 */
  lastError?: string;
}
