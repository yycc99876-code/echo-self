"use client";

type AvatarState = "idle" | "listening" | "thinking" | "speaking";

interface EchoAvatarProps {
  state: AvatarState;
  avatarUrl?: string;
  displayName?: string;
}

const stateLabels: Record<AvatarState, string> = {
  idle: "待命",
  listening: "正在聆听...",
  thinking: "正在思考...",
  speaking: "正在表达...",
};

const stateColors: Record<AvatarState, string> = {
  idle: "#555",
  listening: "#5b9bd5",
  thinking: "#EFDAA3",
  speaking: "#7dba6d",
};

export function EchoAvatar({
  state,
  avatarUrl,
  displayName = "Guoliang Echo",
}: EchoAvatarProps) {
  const ringColor = stateColors[state];
  const isAnimating = state !== "idle";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div className="relative">
        {/* Animated outer ring */}
        <div
          className={`absolute inset-[-6px] rounded-full transition-all duration-500 ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}
          style={{
            border: `2px solid ${ringColor}`,
            animation: isAnimating
              ? state === "thinking"
                ? "spin 3s linear infinite"
                : "pulse-ring 2s ease-in-out infinite"
              : "none",
          }}
        />

        {/* Main avatar */}
        <div
          className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center relative"
          style={{
            background: avatarUrl
              ? undefined
              : "linear-gradient(135deg, #2a2520 0%, #1a1715 100%)",
            border: `2px solid ${state === "idle" ? "#333" : ringColor}`,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span
              className="text-3xl font-light tracking-widest select-none"
              style={{ color: "#EFDAA3" }}
            >
              GL
            </span>
          )}

          {/* State glow overlay */}
          {isAnimating && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${ringColor}15 0%, transparent 70%)`,
              }}
            />
          )}
        </div>

        {/* Status dot */}
        <div
          className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
          style={{
            backgroundColor: ringColor,
            borderColor: "#1A1715",
            animation:
              state === "thinking"
                ? "blink 1.4s infinite both"
                : state !== "idle"
                ? "pulse-dot 1.5s ease-in-out infinite"
                : "none",
          }}
        />
      </div>

      {/* Name + state */}
      <div className="text-center">
        <div
          className="text-sm font-medium tracking-wide"
          style={{ color: "#EFDAA3" }}
        >
          {displayName}
        </div>
        <div
          className="text-xs mt-0.5 transition-colors duration-300"
          style={{ color: ringColor }}
        >
          {stateLabels[state]}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-ring {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        @keyframes pulse-dot {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
