import React from "react";
import { Mic, Volume2, Sparkles, Hand } from "lucide-react";

export type SessionState = "idle" | "listening" | "thinking" | "speaking";

interface AudioOrbProps {
  state: SessionState;
  volumeLevel?: number; // 0.0 to 1.0
  onToggleSession: () => void;
  onBargeIn?: () => void;
}

export const AudioOrb: React.FC<AudioOrbProps> = ({
  state,
  volumeLevel = 0,
  onToggleSession,
  onBargeIn,
}) => {
  // Determine color and status description based on state
  let bgColor = "bg-stone-300";
  let ringColor = "border-stone-400";
  let statusText = "Chạm để bắt đầu trò chuyện";
  let subText = "An Nhiên luôn ở đây lắng nghe cụ";
  let icon = <Mic className="w-16 h-16 text-stone-700" />;

  if (state === "listening") {
    bgColor = "bg-emerald-500 shadow-lg shadow-emerald-500/30";
    ringColor = "border-emerald-400";
    statusText = "Con đang lắng nghe cụ nói...";
    subText = "Cụ cứ thong thả chia sẻ với con nhé";
    icon = <Mic className="w-16 h-16 text-white animate-pulse" />;
  } else if (state === "thinking") {
    bgColor = "bg-amber-500 shadow-lg shadow-amber-500/30";
    ringColor = "border-amber-400";
    statusText = "Con đang suy nghĩ một chút...";
    subText = "Con sẽ trò chuyện lại ngay ạ";
    icon = <Sparkles className="w-16 h-16 text-white animate-spin" />;
  } else if (state === "speaking") {
    bgColor = "bg-blue-600 shadow-xl shadow-blue-500/40";
    ringColor = "border-blue-400";
    statusText = "An Nhiên đang nói...";
    subText = "Cụ có thể nói để ngắt lời con bất cứ lúc nào";
    icon = <Volume2 className="w-16 h-16 text-white" />;
  }

  // Calculate dynamic scale based on volume
  const scaleMultiplier = 1 + Math.min(0.25, volumeLevel * 0.4);

  const handleClick = () => {
    if (state === "speaking" && onBargeIn) {
      onBargeIn();
    } else {
      onToggleSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 select-none">
      {/* Orb Outer Animation Rings */}
      <div className="relative flex items-center justify-center w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72">
        {state === "listening" && (
          <div
            className={`absolute inset-0 rounded-full border-4 ${ringColor} animate-ripple pointer-events-none`}
            style={{ transform: `scale(${scaleMultiplier * 1.1})` }}
          />
        )}
        {state === "speaking" && (
          <div
            className={`absolute inset-0 rounded-full border-4 ${ringColor} animate-pulse-ring pointer-events-none`}
          />
        )}

        {/* Central Tactile Orb Button */}
        <button
          onClick={handleClick}
          aria-label={statusText}
          className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer border-4 sm:border-8 border-white ${bgColor}`}
          style={{ transform: `scale(${scaleMultiplier})` }}
        >
          <div className="[&>svg]:w-12 [&>svg]:h-12 sm:[&>svg]:w-16 sm:[&>svg]:h-16 flex items-center justify-center">
            {icon}
          </div>
          {state === "speaking" && (
            <div className="mt-1 sm:mt-2 flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-white/20 rounded-full text-white text-xs sm:text-sm font-bold">
              <Hand className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Chạm ngắt lời</span>
            </div>
          )}
        </button>
      </div>

      {/* High Contrast Elder-Friendly Captions */}
      <div className="mt-3 sm:mt-5 text-center max-w-xl px-2">
        <h2 className="text-base sm:text-elder-lg md:text-elder-xl font-black text-stone-900 tracking-tight leading-tight">
          {statusText}
        </h2>
        <p className="mt-1 text-xs sm:text-elder-sm md:text-elder-base text-stone-700 font-semibold leading-snug">
          {subText}
        </p>
      </div>
    </div>
  );
};
