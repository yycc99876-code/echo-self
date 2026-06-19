# Echo Self Demo Script

## 项目简介

Echo Self 是一个基于关系记忆的 AI 角色产品，核心理念是让数字分身（Guoliang Echo）通过共同经历不断理解用户，而非简单的聊天机器人。

### 核心架构

```
src/
├── types/digital-self.ts    # 类型定义：角色身份、语音配置、对话消息
├── lib/memory-store.ts      # 本地存储层：消息、命谱、Wiki、活跃记忆
├── core/
│   ├── active-memory/       # 活跃记忆管理
│   ├── digital-self/        # 数字分身核心逻辑
│   ├── life-chart/          # 命谱系统
│   └── relationship-wiki/   # 关系 Wiki 系统
├── ui/
│   ├── components/          # UI 组件
│   └── pages/               # 页面
├── app/                     # Next.js App Router
└── storage/                 # 存储抽象层
```

### 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS 4
- **状态管理**: Zustand
- **存储**: localStorage (MVP) → 数据库 (后续)
- **语音**: Browser TTS (fallback) → 百炼 TTS (后续)

---

## 启动步骤

### 1. 安装依赖

```bash
cd C:\Users\CHOU\echo-self
npm install
```

### 2. 环境变量配置

创建 `.env.local` 文件：

```env
# 百炼 API (后续接入)
DASHSCOPE_API_KEY=your_api_key_here

# 语音配置 (后续接入)
BAILIAN_TTS_ENABLED=false
BAILIAN_VOICE_ID=your_voice_id

# 头像配置 (后续接入)
AVATAR_URL=/avatars/default.png
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## Demo 流程

### 第一轮：产品定位

**用户输入**:
```
我想做一个偏 infiDive 的 AI 角色产品，不是普通聊天机器人。
```

**预期系统行为**:

1. **Guoliang Echo 理解**:
   - 识别关键词: infiDive, AI 角色, 非普通聊天机器人
   - 理解用户要做的是长期关系型 AI 角色产品

2. **Wiki 生成**:
   - 创建页面: `product-vision`
   - 内容:
     ```markdown
     # 产品愿景

     ## 核心定位
     - 不是普通聊天机器人
     - 偏向 infiDive 风格的 AI 角色产品
     - 强调长期关系和深度互动

     ## 关键特性
     - 角色化交互
     - 关系记忆机制
     - 个性化成长
     ```

3. **Active Memory 更新**:
   ```markdown
   当前对话焦点: 产品定位讨论
   用户意图: 创建 AI 角色产品，非通用聊天机器人
   情感倾向: 积极探索
   ```

**实际修改的文件**:
- `localStorage.echo_wiki_pages` - 新增 product-vision 页面
- `localStorage.echo_active_memory` - 更新活跃记忆
- `localStorage.echo_messages` - 保存对话消息

---

### 第二轮：修正理解

**用户输入**:
```
不是 AI 男友，我想做的是关系记忆机制，让角色从共同经历里越来越懂用户。
```

**预期系统行为**:

1. **Guoliang Echo 修正理解**:
   - 识别否定: "不是 AI 男友"
   - 提取核心: "关系记忆机制", "共同经历", "越来越懂用户"
   - 修正方向: 从伴侣型转向记忆型

2. **future-response-rules 更新**:
   ```markdown
   # 未来回答规则

   ## 产品理解
   - 不要把产品理解成普通 AI 伴侣
   - 不要强调浪漫关系或情感陪伴
   - 要强调关系记忆和共同经历

   ## 回答重点
   - 记忆机制如何工作
   - 如何从经历中学习
   - 个性化成长路径
   ```

3. **relationship/current-state 更新**:
   ```markdown
   # 当前关系状态

   ## 理解深度
   - 已理解: 关系记忆机制
   - 已排除: AI 男友/伴侣定位
   - 待深入: 记忆如何转化为理解

   ## 对话进展
   - 第1轮: 产品定位
   - 第2轮: 修正理解，明确核心机制
   ```

4. **Wiki 更新**:
   - 更新 `product-vision` 页面
   - 新增 `relationship-memory` 页面
     ```markdown
     # 关系记忆机制

     ## 核心理念
     - 从共同经历中学习
     - 逐步理解用户
     - 不是预设的人格，而是成长的伙伴

     ## 实现方式
     - 记录每次互动
     - 提取关键信息
     - 构建用户画像
     - 动态调整回答策略
     ```

**实际修改的文件**:
- `localStorage.echo_wiki_pages` - 更新 product-vision, 新增 relationship-memory
- `localStorage.echo_wiki_edits` - 记录编辑历史
- `localStorage.echo_active_memory` - 更新活跃记忆
- `localStorage.echo_messages` - 保存对话消息

---

### 第三轮：新增语音功能

**用户输入**:
```
我还需要语音功能。用户可以打字或语音输入，然后一个数字分身角色用声音回应。但头像和声音素材我明天再弄，今天先预留字段。
```

**预期系统行为**:

1. **Guoliang Echo 识别新增需求**:
   - 语音输入 (STT)
   - 语音输出 (TTS)
   - 数字分身角色
   - 头像和声音素材 (暂不实现)

2. **Wiki 记录语音需求**:
   - 新增页面: `voice-feature`
     ```markdown
     # 语音功能需求

     ## 输入方式
     - 文字输入
     - 语音输入 (STT)

     ## 输出方式
     - 文字显示
     - 语音输出 (TTS)

     ## 角色呈现
     - 数字分身头像
     - 角色声音

     ## 当前状态
     - 头像: 预留 avatarUrl 字段，明天提供素材
     - 声音: 预留 voiceId 字段，明天提供素材
     - 今天只做字段预留，不做真实头像和声音复刻
     ```

3. **类型系统更新**:
   - 确认 `AvatarProfile` 已有 `avatarUrl` 字段
   - 确认 `VoiceProfile` 已有 `voiceId` 字段
   - 确认 `Message` 已有 `inputType: 'text' | 'voice'` 字段

4. **后续回答策略调整**:
   - 同时考虑语音角色和记忆机制
   - 回答时提及语音交互场景
   - 记住今天只预留字段，明天做素材

**实际修改的文件**:
- `localStorage.echo_wiki_pages` - 新增 voice-feature 页面
- `localStorage.echo_active_memory` - 更新活跃记忆，包含语音需求
- `localStorage.echo_messages` - 保存对话消息

---

## 文件修改总结

### 代码文件 (已存在)

| 文件 | 用途 | 状态 |
|------|------|------|
| `src/types/digital-self.ts` | 类型定义 | 已完成 |
| `src/lib/memory-store.ts` | 存储层 | 已完成 |

### 代码文件 (待创建)

| 文件 | 用途 | 优先级 |
|------|------|--------|
| `src/core/digital-self/index.ts` | 数字分身核心逻辑 | 高 |
| `src/core/relationship-wiki/index.ts` | Wiki 管理逻辑 | 高 |
| `src/core/active-memory/index.ts` | 活跃记忆管理 | 高 |
| `src/core/life-chart/index.ts` | 命谱系统 | 中 |
| `src/app/api/chat/route.ts` | 对话 API | 高 |
| `src/app/page.tsx` | 主页面 | 高 |
| `src/ui/components/ChatWindow.tsx` | 对话窗口组件 | 高 |
| `src/ui/components/VoiceInput.tsx` | 语音输入组件 | 中 |
| `src/ui/components/AvatarDisplay.tsx` | 头像显示组件 | 中 |

### localStorage 数据 (Demo 运行时)

| 键名 | 内容 | 变化 |
|------|------|------|
| `echo_messages` | 对话消息 | 每轮新增 2 条 |
| `echo_wiki_pages` | Wiki 页面 | 3 轮后有 3 个页面 |
| `echo_wiki_edits` | 编辑历史 | 记录每次 Wiki 更新 |
| `echo_active_memory` | 活跃记忆 | 每轮更新 |
| `echo_avatar_profile` | 头像配置 | 预留字段 |
| `echo_voice_profile` | 语音配置 | 预留字段 |

---

## 环境变量说明

### 必需 (当前)

```env
# 无，MVP 阶段使用 localStorage + Browser TTS
```

### 可选 (后续接入)

```env
# 百炼 API
DASHSCOPE_API_KEY=sk-xxx

# 百炼 TTS
BAILIAN_TTS_ENABLED=true
BAILIAN_VOICE_ID=your_voice_id

# 头像资源
AVATAR_URL=https://your-cdn.com/avatar.png

# 数据库 (替换 localStorage)
DATABASE_URL=postgresql://...
```

---

## 功能状态

### 真实 API

| 功能 | 状态 | 说明 |
|------|------|------|
| localStorage 存储 | ✅ 已实现 | memory-store.ts |
| Browser TTS | ✅ 已实现 | 使用 Web Speech API |
| 类型定义 | ✅ 已实现 | digital-self.ts |

### Mock / 待实现

| 功能 | 状态 | 说明 |
|------|------|------|
| LLM 对话 | ❌ Mock | 需接入百炼或其他 LLM |
| STT 语音识别 | ❌ Mock | 需接入百炼或其他 STT |
| TTS 语音合成 | ❌ Mock | 当前用 Browser TTS，需接入百炼 TTS |
| 声音复刻 | ❌ 未实现 | 需百炼声音复刻 API |
| 头像生成 | ❌ 未实现 | 需提供素材或使用 AI 生成 |
| Wiki 自动生成 | ❌ Mock | 需 LLM 提取关键信息 |
| 记忆提取 | ❌ Mock | 需 LLM 分析对话内容 |

---

## 后续接入指南

### 1. 接入百炼 LLM

**步骤**:

1. 获取百炼 API Key
2. 创建 `src/lib/bailian.ts`:

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

export async function chat(messages: ChatMessage[]): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    temperature: 0.8,
  })
  return response.choices[0].message.content
}
```

3. 在 `src/app/api/chat/route.ts` 中调用

**关键配置**:
- 模型选择: qwen-plus (平衡) / qwen-turbo (快速) / qwen-max (最强)
- Temperature: 0.7-0.9 (角色对话需要一定创造性)
- System Prompt: 注入角色身份、活跃记忆、Wiki 内容

---

### 2. 接入百炼 TTS / 声音复刻

**步骤**:

1. 开通百炼语音服务
2. 创建声音模型 (声音复刻)
3. 创建 `src/lib/bailian-tts.ts`:

```typescript
export async function textToSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sambert-zhichu-v1',
      input: { text },
      parameters: {
        voice: voiceId,
        format: 'mp3',
        sample_rate: 48000,
      },
    }),
  })
  return response.arrayBuffer()
}
```

4. 保存到 `localStorage.echo_voice_profile`:

```typescript
saveVoiceProfile({
  provider: 'bailian',
  voiceId: 'your_cloned_voice_id',
  type: 'cloned_user_voice',
  description: '用户声音复刻',
})
```

**关键配置**:
- 声音复刻需要用户提供 10-30 秒音频样本
- 复刻完成后获得 voiceId
- 在 VoiceProfile 中保存 voiceId

---

### 3. 替换本人头像

**步骤**:

1. 准备头像素材 (PNG/JPG, 推荐 512x512)
2. 上传到 CDN 或 public 目录
3. 更新 `localStorage.echo_avatar_profile`:

```typescript
saveAvatarProfile({
  displayName: 'Guoliang Echo',
  avatarUrl: '/avatars/guoliang.png',  // 或 CDN URL
  identityType: 'digital_self',
  description: '数字分身头像',
})
```

4. 在 UI 组件中读取并显示:

```typescript
const profile = getAvatarProfile()
// 使用 profile.avatarUrl 显示头像
```

**关键配置**:
- 支持静态图片或 AI 生成头像
- 建议使用透明背景 PNG
- 可以准备多个表情变体 (后续扩展)

---

## 下一步优化建议

### 优先级 P0 (核心体验)

1. **实现对话 API**
   - 创建 `/api/chat` 路由
   - 接入百炼 LLM
   - 注入角色 prompt + 活跃记忆 + Wiki

2. **实现主对话界面**
   - ChatWindow 组件
   - 消息列表
   - 输入框 + 发送按钮

3. **实现 Wiki 自动更新**
   - LLM 分析对话内容
   - 自动提取关键信息
   - 更新 Wiki 页面

### 优先级 P1 (语音体验)

4. **实现语音输入**
   - 浏览器 SpeechRecognition API
   - 或接入百炼 STT

5. **实现语音输出**
   - 当前: Browser TTS
   - 后续: 百炼 TTS + 声音复刻

6. **实现头像显示**
   - 静态头像
   - 说话时动画 (后续)

### 优先级 P2 (体验增强)

7. **命谱系统**
   - 用户生日/时间输入
   - 生成个性化命谱
   - 影响角色回答风格

8. **记忆可视化**
   - Wiki 浏览界面
   - 记忆时间线
   - 关系深度指标

9. **多模态输入**
   - 图片理解
   - 表情识别 (后续)

---

## 录屏脚本建议

### 开场 (30 秒)

```
大家好，这是 Echo Self，一个基于关系记忆的 AI 角色产品。
不同于普通聊天机器人，Echo Self 会从每次互动中学习，
逐步理解你，成为真正的数字分身。
```

### 第一轮演示 (1 分钟)

```
让我演示一下产品定位的对话。

[输入] 我想做一个偏 infiDive 的 AI 角色产品，不是普通聊天机器人。

[展示 Wiki 生成]
可以看到系统自动生成了产品愿景页面，
记录了核心定位和关键特性。

[展示活跃记忆]
活跃记忆也更新了，记录了当前对话焦点和用户意图。
```

### 第二轮演示 (1 分钟)

```
现在我说得更具体一些。

[输入] 不是 AI 男友，我想做的是关系记忆机制，让角色从共同经历里越来越懂用户。

[展示 Wiki 更新]
系统修正了理解，更新了产品愿景，
还新增了关系记忆机制的详细页面。

[展示未来回答规则]
未来回答规则也更新了，明确不要把产品理解成 AI 伴侣。
```

### 第三轮演示 (1 分钟)

```
最后，我来添加语音功能的需求。

[输入] 我还需要语音功能。用户可以打字或语音输入，然后一个数字分身角色用声音回应。但头像和声音素材我明天再弄，今天先预留字段。

[展示 Wiki 更新]
系统记录了语音功能需求，包括输入输出方式。
还特别记录了今天只预留字段，明天再做素材。

[展示类型系统]
可以看到代码中已经有 avatarUrl 和 voiceId 的预留字段。
```

### 结尾 (30 秒)

```
这就是 Echo Self 的核心体验。
通过三轮对话，系统已经理解了产品定位、核心机制和功能需求。
接下来我们会接入百炼 LLM 和 TTS，
让这个数字分身真正活起来。
谢谢大家！
```

---

## 常见问题

### Q: 为什么用 localStorage 而不是数据库？

A: MVP 阶段优先验证核心体验，localStorage 足够且零配置。后续可无缝切换到数据库，因为 `memory-store.ts` 已经封装了存储接口。

### Q: 如何清空 Demo 数据？

A: 在浏览器控制台执行:
```javascript
localStorage.removeItem('echo_messages')
localStorage.removeItem('echo_wiki_pages')
localStorage.removeItem('echo_wiki_edits')
localStorage.removeItem('echo_active_memory')
localStorage.removeItem('echo_avatar_profile')
localStorage.removeItem('echo_voice_profile')
localStorage.removeItem('echo_life_chart')
```

### Q: 如何导出 Demo 数据？

A: 在浏览器控制台执行:
```javascript
const data = {
  messages: JSON.parse(localStorage.getItem('echo_messages') || '[]'),
  wikiPages: JSON.parse(localStorage.getItem('echo_wiki_pages') || '[]'),
  activeMemory: JSON.parse(localStorage.getItem('echo_active_memory') || 'null'),
}
console.log(JSON.stringify(data, null, 2))
```

---

## 总结

Echo Self 的核心创新在于**关系记忆机制**——不是预设一个固定人格的聊天机器人，而是通过共同经历让 AI 角色逐步理解用户。

Demo 展示了:
1. ✅ 产品定位理解
2. ✅ 理解修正机制
3. ✅ 需求扩展能力
4. ✅ Wiki 自动生成
5. ✅ 活跃记忆管理

后续重点:
- 接入百炼 LLM 实现真实对话
- 接入百炼 TTS 实现语音交互
- 完善 UI 体验
