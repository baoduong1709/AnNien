import React, { useEffect, useRef } from "react";
import { User, Sparkles } from "lucide-react";

export interface TranscriptItem {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  timestamp: string;
}

interface LiveTranscriptProps {
  items: TranscriptItem[];
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({ items }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6 bg-white/70 backdrop-blur-md border border-stone-200/50 rounded-2xl sm:rounded-3xl min-h-[80px] sm:min-h-[100px] text-center shadow-sm">
        <p className="text-elder-sm sm:text-elder-base text-stone-600 font-bold italic drop-shadow-sm">
          "Dạ cụ ơi, cụ bấm nút hoặc chạm vào vòng tròn để trò chuyện cùng con nhé ạ!"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-h-[160px] sm:max-h-[250px] overflow-y-auto p-3 sm:p-5 bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-3xl sm:rounded-[2rem] shadow-inner">
      {items.map((item) => {
        const isUser = item.role === "user";
        return (
          <div
            key={item.id}
            className={`flex items-start gap-3 sm:gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar Icon */}
            <div
              className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-md ${
                isUser ? "bg-gradient-to-br from-stone-600 to-stone-800 text-white" : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
              }`}
            >
              {isUser ? <User className="w-6 h-6 sm:w-7 sm:h-7" /> : <Sparkles className="w-6 h-6 sm:w-7 sm:h-7" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] px-5 py-3.5 sm:px-6 sm:py-4 rounded-3xl sm:rounded-[2rem] border shadow-md relative ${
                isUser
                  ? "bg-gradient-to-br from-stone-800 to-stone-900 text-white border-stone-700 rounded-tr-none"
                  : "bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-950 border-teal-200/50 rounded-tl-none"
              }`}
            >
              {/* Optional: Add a small decorative quote tail using before pseudo element if desired */}
              <div className="text-elder-sm font-black uppercase tracking-widest mb-1.5 opacity-70 flex items-center gap-1.5">
                {isUser ? "Cụ" : "An Nhiên"}
              </div>
              <div className="text-elder-base sm:text-elder-lg font-black leading-relaxed drop-shadow-sm">
                {item.text}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
