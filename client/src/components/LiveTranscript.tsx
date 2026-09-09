import React, { useEffect, useRef } from "react";
import { User, Bot } from "lucide-react";

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
      <div className="flex items-center justify-center p-3 sm:p-4 bg-white/70 backdrop-blur-sm border border-stone-200 rounded-2xl sm:rounded-3xl min-h-[50px] sm:min-h-[70px] text-center shadow-sm">
        <p className="text-xs sm:text-sm md:text-base text-stone-600 font-medium italic">
          "Dạ cụ ơi, cụ bấm nút hoặc chạm vào vòng tròn để trò chuyện cùng con nhé ạ!"
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 max-h-[120px] sm:max-h-[200px] overflow-y-auto p-2.5 sm:p-4 bg-white/80 border border-stone-200 rounded-2xl sm:rounded-3xl shadow-inner">
      {items.map((item) => {
        const isUser = item.role === "user";
        return (
          <div
            key={item.id}
            className={`flex items-start gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar Icon */}
            <div
              className={`shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                isUser ? "bg-stone-800 text-white" : "bg-teal-700 text-white"
              }`}
            >
              {isUser ? <User className="w-4 h-4 sm:w-6 sm:h-6" /> : <Bot className="w-4 h-4 sm:w-6 sm:h-6" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] px-3 py-2 sm:px-4 sm:py-3 rounded-2xl border shadow-sm ${
                isUser
                  ? "bg-stone-900 text-white border-stone-800 rounded-tr-none"
                  : "bg-teal-50 text-teal-950 border-teal-200 rounded-tl-none"
              }`}
            >
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 opacity-80">
                {isUser ? "Cụ" : "An Nhiên"}
              </div>
              <div className="text-xs sm:text-sm md:text-base font-bold leading-relaxed">
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
