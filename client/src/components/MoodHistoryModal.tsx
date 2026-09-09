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
        return <Smile className="w-8 h-8 text-emerald-600" />;
      case "NEGATIVE":
        return <Frown className="w-8 h-8 text-red-500" />;
      case "ANXIOUS":
        return <AlertCircle className="w-8 h-8 text-amber-500" />;
      default:
        return <Meh className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-2xl bg-white border-2 sm:border-4 border-teal-600 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-800 shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h2 className="text-base sm:text-elder-xl font-black text-stone-900">Kỷ Niệm & An Sinh</h2>
              <p className="text-xs sm:text-elder-base text-stone-600">Nhật ký an sinh được AI ghi nhớ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 border-2 border-stone-300 active:scale-95 transition-all shrink-0"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Tabs / Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Section: Memories */}
          <div>
            <h3 className="text-elder-lg font-black text-stone-900 flex items-center gap-2 mb-3">
              <Heart className="w-6 h-6 text-rose-500" />
              <span>Những điều An Nhiên đã ghi nhớ về cụ</span>
            </h3>
            {memories.length === 0 ? (
              <p className="text-stone-500 italic p-4 bg-stone-50 rounded-2xl">
                Chưa có ký ức nào được ghi nhận. Khi cụ trò chuyện về gia đình, quê quán, sở thích, An Nhiên sẽ tự động ghi nhớ nhé!
              </p>
            ) : (
              <div className="space-y-3">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 bg-rose-50/60 border-2 border-rose-200 rounded-2xl"
                  >
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full">
                      {m.category}
                    </span>
                    <p className="text-elder-base font-bold text-stone-800 mt-1">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Moods */}
          <div className="pt-4 border-t-2 border-stone-200">
            <h3 className="text-elder-lg font-black text-stone-900 flex items-center gap-2 mb-3">
              <Smile className="w-6 h-6 text-teal-600" />
              <span>Nhật ký tâm trạng gần đây</span>
            </h3>
            {moods.length === 0 ? (
              <p className="text-stone-500 italic p-4 bg-stone-50 rounded-2xl">
                Chưa có nhật ký tâm trạng.
              </p>
            ) : (
              <div className="space-y-3">
                {moods.map((mood) => (
                  <div
                    key={mood.id}
                    className="p-4 bg-stone-50 border-2 border-stone-200 rounded-2xl flex items-start gap-3"
                  >
                    <div className="shrink-0 pt-1">
                      {renderSentimentIcon(mood.sentiment)}
                    </div>
                    <div>
                      <h4 className="text-elder-base font-black text-stone-900">
                        {mood.emotion}
                      </h4>
                      <p className="text-elder-base text-stone-700 font-medium">
                        {mood.notes}
                      </p>
                      <span className="text-xs text-stone-500 mt-1 block">
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
