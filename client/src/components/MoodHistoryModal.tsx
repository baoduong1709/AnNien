import React from "react";
import { Heart, BookOpen, Smile, Frown, Meh, AlertCircle, X } from "lucide-react";

export interface MoodItem {
  id: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "ANXIOUS" | "TIRED";
  emotion: string;
  notes: string;
  timestamp: string;
}

export interface MemoryItem {
  id: string;
  category: string;
  content: string;
  importance: number;
}

interface MoodHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  moods: MoodItem[];
  memories: MemoryItem[];
}

export const MoodHistoryModal: React.FC<MoodHistoryModalProps> = ({
  isOpen,
  onClose,
  moods,
  memories,
}) => {
  if (!isOpen) return null;

  const renderSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE":
        return <Smile className="w-10 h-10 text-emerald-500 drop-shadow-sm" />;
      case "NEGATIVE":
        return <Frown className="w-10 h-10 text-red-500 drop-shadow-sm" />;
      case "ANXIOUS":
        return <AlertCircle className="w-10 h-10 text-amber-500 drop-shadow-sm" />;
      default:
        return <Meh className="w-10 h-10 text-blue-500 drop-shadow-sm" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xl animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-2xl bg-gradient-to-b from-teal-50 to-white border-2 sm:border-[6px] border-teal-400 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(20,184,166,0.3)] flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b-2 border-teal-200/50 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-teal-200 to-teal-400 flex items-center justify-center text-teal-800 shrink-0 shadow-lg border-2 border-white">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md" />
              <div className="absolute inset-0 rounded-full bg-white/20 pointer-events-none"></div>
            </div>
            <div>
              <h2 className="text-elder-lg sm:text-elder-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-950">Kỷ Niệm & An Sinh</h2>
              <p className="text-elder-sm sm:text-elder-base font-bold text-teal-700/80">Nhật ký an sinh được AI ghi nhớ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.25rem] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-600 hover:from-stone-200 hover:to-stone-300 border-[3px] border-stone-300/50 shadow-md active:scale-95 transition-all shrink-0"
          >
            <X className="w-8 h-8 drop-shadow-sm" />
          </button>
        </div>

        {/* Tabs / Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-8">
          {/* Section: Memories */}
          <div>
            <h3 className="text-elder-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-500 flex items-center gap-3 mb-5 drop-shadow-sm">
              <Heart className="w-8 h-8 text-rose-500" />
              <span>Những điều An Nhiên đã ghi nhớ về cụ</span>
            </h3>
            {memories.length === 0 ? (
              <div className="p-6 bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 rounded-3xl text-center shadow-inner">
                <p className="text-elder-base text-stone-500 font-bold italic">
                  Chưa có ký ức nào được ghi nhận. Khi cụ trò chuyện về gia đình, quê quán, sở thích, An Nhiên sẽ tự động ghi nhớ nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-5 bg-gradient-to-br from-rose-50 to-white border-[3px] border-rose-200 rounded-3xl shadow-md relative overflow-hidden group hover:border-rose-300 transition-colors"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-[1.75rem]"></div>
                    <span className="relative z-10 text-elder-sm font-black uppercase tracking-wider px-4 py-1.5 bg-gradient-to-r from-rose-200 to-rose-300 text-rose-800 rounded-full shadow-sm">
                      {m.category}
                    </span>
                    <p className="relative z-10 text-elder-lg font-black text-stone-800 mt-4 leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Moods */}
          <div className="pt-6 border-t-2 border-teal-200/50">
            <h3 className="text-elder-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 flex items-center gap-3 mb-5 drop-shadow-sm">
              <Smile className="w-8 h-8 text-teal-500" />
              <span>Nhật ký tâm trạng gần đây</span>
            </h3>
            {moods.length === 0 ? (
              <div className="p-6 bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 rounded-3xl text-center shadow-inner">
                <p className="text-elder-base text-stone-500 font-bold italic">
                  Chưa có nhật ký tâm trạng.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {moods.map((mood) => (
                  <div
                    key={mood.id}
                    className="p-5 bg-gradient-to-br from-white to-stone-50 border-[3px] border-stone-200 rounded-3xl shadow-sm flex items-start gap-5 relative overflow-hidden group hover:border-teal-200 transition-colors"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-[1.75rem]"></div>
                    <div className="shrink-0 pt-1 relative z-10">
                      <div className="p-2 bg-stone-100 rounded-2xl shadow-inner border border-stone-200">
                        {renderSentimentIcon(mood.sentiment)}
                      </div>
                    </div>
                    <div className="relative z-10">
                      <h4 className="text-elder-lg font-black text-stone-900 drop-shadow-sm">
                        {mood.emotion}
                      </h4>
                      <p className="text-elder-base text-stone-600 font-bold mt-2 bg-stone-100/50 p-3 rounded-2xl border border-stone-100">
                        {mood.notes}
                      </p>
                      <span className="text-elder-sm font-bold text-stone-400 mt-3 block">
                        {new Date(mood.timestamp).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
