import React from "react";
import { Pill, CheckCircle2, Clock, X, AlertCircle } from "lucide-react";

export interface MedicationItem {
  id: string;
  medicine_name: string;
  time_str: string;
  dosage: string;
  note?: string;
  is_taken?: boolean;
}

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: MedicationItem[];
  onToggleTaken: (id: string) => void;
}

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  medications,
  onToggleTaken,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xl animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-2xl bg-gradient-to-b from-amber-50 to-white border-2 sm:border-[6px] border-amber-400 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-[0_0_50px_rgba(251,191,36,0.3)] flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 sm:pb-5 border-b-2 border-amber-200/50 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center text-amber-800 shrink-0 shadow-lg border-2 border-white">
              <Pill className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-md" />
              <div className="absolute inset-0 rounded-full bg-white/20 pointer-events-none"></div>
            </div>
            <div>
              <h2 className="text-elder-lg sm:text-elder-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-950">Sổ Nhắc Thuốc</h2>
              <p className="text-elder-sm sm:text-elder-base font-bold text-amber-700/80">Đơn thuốc hằng ngày của cụ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.25rem] bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-600 hover:from-stone-200 hover:to-stone-300 border-[3px] border-stone-300/50 shadow-md active:scale-95 transition-all shrink-0"
          >
            <X className="w-8 h-8 drop-shadow-sm" />
          </button>
        </div>

        {/* Medication List */}
        <div className="flex-1 overflow-y-auto py-6 space-y-5">
          {medications.length === 0 ? (
            <div className="text-center py-12 px-6 bg-amber-50/50 rounded-[2rem] border-2 border-dashed border-amber-200">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-amber-500 drop-shadow-sm" />
              </div>
              <p className="text-elder-xl font-black text-stone-700">Chưa có đơn thuốc nào</p>
              <p className="text-elder-lg font-bold text-stone-500 mt-3">
                Cụ có thể nói: "An Nhiên ơi, nhắc cụ 8 giờ tối uống 1 viên thuốc huyết áp" nhé!
              </p>
            </div>
          ) : (
            medications.map((med) => (
              <div
                key={med.id}
                className={`p-5 rounded-3xl border-4 transition-all flex items-center justify-between gap-4 relative overflow-hidden group ${
                  med.is_taken
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300 opacity-80 scale-[0.98]"
                    : "bg-gradient-to-br from-white to-amber-50 border-amber-300 shadow-lg"
                }`}
              >
                {!med.is_taken && <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-white/60 to-transparent pointer-events-none rounded-t-[1.75rem]"></div>}
                
                <div className="flex-1 relative z-10">
                  <div className={`flex items-center gap-2 font-black text-elder-lg ${med.is_taken ? "text-emerald-700" : "text-amber-600"}`}>
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 drop-shadow-sm" />
                    <span className="drop-shadow-sm">{med.time_str}</span>
                  </div>
                  <h3 className={`text-elder-xl font-black mt-2 drop-shadow-sm ${med.is_taken ? "text-stone-500 line-through decoration-emerald-500/50 decoration-4" : "text-stone-900"}`}>
                    {med.medicine_name}
                  </h3>
                  <p className="text-elder-lg text-stone-700 font-bold mt-1">
                    Liều lượng: <span className={med.is_taken ? "text-emerald-700" : "text-teal-700"}>{med.dosage}</span>
                  </p>
                  {med.note && (
                    <p className={`text-elder-base font-bold mt-3 p-3.5 rounded-2xl border ${med.is_taken ? "bg-emerald-100/50 border-emerald-200 text-emerald-800" : "bg-amber-100/50 border-amber-200 text-amber-900 shadow-inner"}`}>
                      💡 Lưu ý: {med.note}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onToggleTaken(med.id)}
                  className={`relative z-10 shrink-0 px-6 py-5 rounded-[1.5rem] font-black text-elder-lg flex flex-col items-center gap-2 border-[3px] transition-all active:scale-95 overflow-hidden ${
                    med.is_taken
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-800 shadow-[0_4px_10px_rgba(16,185,129,0.3)]"
                      : "bg-gradient-to-br from-white to-stone-100 text-stone-800 border-amber-400 hover:border-amber-500 shadow-[0_4px_15px_rgba(251,191,36,0.2)]"
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                  <CheckCircle2 className={`w-10 h-10 drop-shadow-md ${med.is_taken ? "text-white" : "text-amber-500"}`} />
                  <span className="drop-shadow-sm">{med.is_taken ? "Đã uống" : "Chưa uống"}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-5 border-t-2 border-amber-200/50 text-center">
          <p className="text-elder-base text-amber-800/80 font-bold bg-amber-100/40 p-3 rounded-2xl border border-amber-100 inline-block">
            💡 Để thêm thuốc mới, cụ chỉ cần trò chuyện bằng giọng nói với An Nhiên bất cứ lúc nào ạ!
          </p>
        </div>
      </div>
    </div>
  );
};
