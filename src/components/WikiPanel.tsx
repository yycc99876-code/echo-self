"use client";

import { useState, useEffect } from "react";
import {
  getLifeChart,
  getWikiPages,
  getWikiEdits,
  getActiveMemory,
  type LifeChart,
  type WikiPage,
  type WikiEdit,
  type ActiveMemory,
} from "@/lib/memory-store";

interface WikiPanelProps {
  refreshKey: number;
}

export function WikiPanel({ refreshKey }: WikiPanelProps) {
  const [lifeChart, setLifeChart] = useState<LifeChart | null>(null);
  const [wikiPages, setWikiPages] = useState<WikiPage[]>([]);
  const [wikiEdits, setWikiEdits] = useState<WikiEdit[]>([]);
  const [activeMemory, setActiveMemory] = useState<ActiveMemory | null>(null);
  const [isLifeChartOpen, setIsLifeChartOpen] = useState(false);

  // Load data on mount and when refreshKey changes
  useEffect(() => {
    setLifeChart(getLifeChart());
    setWikiPages(getWikiPages());
    setWikiEdits(getWikiEdits().slice(-10).reverse());
    setActiveMemory(getActiveMemory());
  }, [refreshKey]);

  // Demo seed data if empty
  useEffect(() => {
    if (wikiPages.length === 0 && refreshKey === 0) {
      // Show placeholder content for empty state
    }
  }, [wikiPages.length, refreshKey]);

  const hasData = wikiPages.length > 0 || lifeChart || wikiEdits.length > 0;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#161311" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-5 py-4 border-b"
        style={{ borderColor: "#2a2520" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "#EFDAA3",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          <h2
            className="text-sm font-medium tracking-wide"
            style={{ color: "#EFDAA3" }}
          >
            Relationship Wiki Memory
          </h2>
        </div>
        <div className="text-[11px] mt-1" style={{ color: "#555" }}>
          实时维护的共同经历档案
        </div>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-3xl mb-3" style={{ color: "#333" }}>
              #
            </div>
            <div className="text-sm" style={{ color: "#555" }}>
              开始对话后，这里会自动生成关系记忆
            </div>
            <div className="text-xs mt-2" style={{ color: "#444" }}>
              每次交流都会被整理成结构化的 Wiki 页面
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Active Memory */}
          {activeMemory && (
            <Section title="当前记忆焦点" icon="*">
              <div
                className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={{ background: "#1e1b18", color: "#a89880" }}
              >
                {activeMemory.contentMd}
              </div>
              <div className="text-[10px] mt-1" style={{ color: "#444" }}>
                更新于{" "}
                {new Date(activeMemory.updatedAt).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </Section>
          )}

          {/* Life Chart Summary */}
          <Section title="Life Chart 摘要" icon="~">
            {lifeChart ? (
              <div>
                <button
                  onClick={() => setIsLifeChartOpen(!isLifeChartOpen)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: "#1e1b18",
                    border: "1px solid #2d2820",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: "#a89880" }}>
                      {lifeChart.userName} 的命谱
                    </span>
                    <span
                      className="text-[10px] transition-transform"
                      style={{
                        color: "#555",
                        transform: isLifeChartOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    >
                      v
                    </span>
                  </div>
                  {lifeChart.currentQuestion && (
                    <div
                      className="text-[11px] mt-1"
                      style={{ color: "#7a7060" }}
                    >
                      当前课题：{lifeChart.currentQuestion}
                    </div>
                  )}
                </button>

                {isLifeChartOpen && (
                  <div
                    className="mt-2 px-3 py-3 rounded-lg text-xs leading-relaxed prose"
                    style={{
                      background: "#1a1816",
                      color: "#a89880",
                    }}
                  >
                    {lifeChart.contentMd
                      .split("\n")
                      .slice(0, 8)
                      .map((line, i) => (
                        <div key={i} className={line ? "" : "h-2"}>
                          {line}
                        </div>
                      ))}
                    {lifeChart.contentMd.split("\n").length > 8 && (
                      <div
                        className="text-[10px] mt-2"
                        style={{ color: "#555" }}
                      >
                        ... 展开查看更多
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs" style={{ color: "#444" }}>
                尚未生成命谱
              </div>
            )}
          </Section>

          {/* Current Relationship Status */}
          <Section title="当前关系状态" icon="&">
            <div className="space-y-2">
              <StatusItem
                label="对话深度"
                value={wikiPages.length > 3 ? "深入" : "初步"}
                color={wikiPages.length > 3 ? "#7dba6d" : "#EFDAA3"}
              />
              <StatusItem
                label="记忆条目"
                value={`${wikiPages.length} 个页面`}
                color="#5b9bd5"
              />
              <StatusItem
                label="互动次数"
                value={`${wikiEdits.length} 次更新`}
                color="#a89880"
              />
            </div>
          </Section>

          {/* Recent Wiki Pages */}
          <Section title="最近更新的 Wiki 页面" icon="#">
            <div className="space-y-2">
              {wikiPages
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                )
                .slice(0, 5)
                .map((page) => (
                  <WikiPageCard key={page.id} page={page} />
                ))}
            </div>
          </Section>

          {/* Future Response Rules */}
          <Section title="未来回应规则" icon=">">
            <div className="space-y-1.5">
              <RuleItem text="记住用户重视成就感多于物质回报" />
              <RuleItem text="在用户提到人际关系时，引导探索边界设定" />
              <RuleItem text="当用户情绪低落时，提供命谱中的正面指引" />
              <RuleItem text="尊重用户的内省期，不过度打扰" />
            </div>
          </Section>

          {/* Open Threads */}
          <Section title="Open Threads" icon="~">
            <div className="space-y-1.5">
              <ThreadItem
                topic="关于'自由'的定义"
                lastActive="最近对话中提及"
                status="open"
              />
              <ThreadItem
                topic="与李明的关系调整"
                lastActive="待跟进"
                status="pending"
              />
              <ThreadItem
                topic="创造力高峰期的准备"
                lastActive="命谱预测"
                status="upcoming"
              />
            </div>
          </Section>

          {/* Wiki Edits Log */}
          <Section title="Wiki 编辑日志" icon="*">
            {wikiEdits.length > 0 ? (
              <div className="space-y-1">
                {wikiEdits.map((edit) => (
                  <div
                    key={edit.id}
                    className="flex items-start gap-2 px-2 py-1.5 rounded"
                    style={{ background: "#1a1816" }}
                  >
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: "#EFDAA3" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px]" style={{ color: "#a89880" }}>
                        {edit.editSummary}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "#555" }}>
                          /{edit.pageSlug}
                        </span>
                        <span className="text-[10px]" style={{ color: "#444" }}>
                          {new Date(edit.createdAt).toLocaleTimeString(
                            "zh-CN",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs" style={{ color: "#444" }}>
                暂无编辑记录
              </div>
            )}
          </Section>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-dot {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ---- Sub-components ----

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="px-5 py-4 border-b"
      style={{ borderColor: "#221f1a" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono" style={{ color: "#EFDAA3" }}>
          {icon}
        </span>
        <h3
          className="text-xs font-medium tracking-wide"
          style={{ color: "#c0b8a8" }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function StatusItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px]" style={{ color: "#666" }}>
        {label}
      </span>
      <span className="text-[11px] font-medium" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function WikiPageCard({ page }: { page: WikiPage }) {
  return (
    <div
      className="px-3 py-2 rounded-lg transition-colors cursor-default"
      style={{
        background: "#1a1816",
        border: "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#2d2820";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium" style={{ color: "#c0b8a8" }}>
            {page.title}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "#555" }}>
            /{page.slug}
          </div>
        </div>
        <div className="text-[10px] flex-shrink-0 ml-2" style={{ color: "#444" }}>
          {new Date(page.updatedAt).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
      {page.tags.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {page.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{ background: "#2d2820", color: "#7a7060" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RuleItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: "#7a7060" }}
      />
      <span className="text-[11px] leading-relaxed" style={{ color: "#888" }}>
        {text}
      </span>
    </div>
  );
}

function ThreadItem({
  topic,
  lastActive,
  status,
}: {
  topic: string;
  lastActive: string;
  status: "open" | "pending" | "upcoming";
}) {
  const statusColors = {
    open: "#7dba6d",
    pending: "#EFDAA3",
    upcoming: "#5b9bd5",
  };
  const statusLabels = {
    open: "进行中",
    pending: "待跟进",
    upcoming: "即将到来",
  };

  return (
    <div
      className="flex items-center gap-3 px-2 py-1.5 rounded"
      style={{ background: "#1a1816" }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: statusColors[status] }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[11px]" style={{ color: "#a89880" }}>
          {topic}
        </div>
        <div className="text-[10px]" style={{ color: "#444" }}>
          {lastActive}
        </div>
      </div>
      <span
        className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
        style={{
          background: `${statusColors[status]}15`,
          color: statusColors[status],
        }}
      >
        {statusLabels[status]}
      </span>
    </div>
  );
}
