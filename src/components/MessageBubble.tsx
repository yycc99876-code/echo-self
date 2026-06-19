"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-br-md"
            : "rounded-bl-md"
        }`}
        style={{
          background: isUser
            ? "linear-gradient(135deg, #2d261e 0%, #231f1a 100%)"
            : "#1e1b18",
          border: `1px solid ${isUser ? "#3d3529" : "#2a2520"}`,
          color: isUser ? "#EFDAA3" : "#c0b8a8",
        }}
      >
        {/* Role label */}
        <div
          className="text-[10px] mb-1 font-medium tracking-wider uppercase"
          style={{ color: isUser ? "#a89870" : "#7a7060" }}
        >
          {isUser ? "你" : "Guoliang Echo"}
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <div
            className="text-[10px] mt-2 text-right"
            style={{ color: "#555" }}
          >
            {new Date(timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
