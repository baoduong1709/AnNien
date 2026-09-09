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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-2xl bg-white border-2 sm:border-4 border-amber-500 rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b-2 border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Pill className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h2 className="text-base sm:text-elder-xl font-black text-stone-900">Sổ Nhắc Thuốc</h2>
              <p className="text-xs sm:text-elder-base text-stone-600">Đơn thuốc hằng ngày của cụ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 border-2 border-stone-300 active:scale-95 transition-all shrink-0"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Medication List */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {medications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <AlertCircle className="w-16 h-16 text-stone-400 mx-auto mb-3" />
              <p className="text-elder-lg font-bold text-stone-700">Chưa có đơn thuốc nào được ghi nhớ</p>
              <p className="text-elder-base text-stone-500 mt-2">
                Cụ có thể nói: "An Nhiên ơi, nhắc cụ 8 giờ tối uống 1 viên thuốc huyết áp" nhé!
              </p>
            </div>
          ) : (
            medications.map((med) => (
              <div
                key={med.id}
                className={`p-5 rounded-3xl border-4 transition-all flex items-center justify-between gap-4 ${
                  med.is_taken
                    ? "bg-emerald-50 border-emerald-400 opacity-75"
                    : "bg-amber-50/60 border-amber-300 shadow-sm"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-amber-800 font-black text-elder-base">
                    <Clock className="w-6 h-6" />
                    <span>{med.time_str}</span>
                  </div>
                  <h3 className="text-elder-lg font-black text-stone-900 mt-1">
                    {med.medicine_name}
                  </h3>
                  <p className="text-elder-base text-stone-700 font-bold">
                    Liều lượng: <span className="text-teal-800">{med.dosage}</span>
                  </p>
                  {med.note && (
                    <p className="text-stone-600 text-sm mt-1 bg-white/70 p-2 rounded-xl border border-stone-200">
                      💡 Lưu ý: {med.note}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onToggleTaken(med.id)}
                  className={`shrink-0 px-5 py-4 rounded-2xl font-black text-elder-base flex items-center gap-2 border-2 ${
                    med.is_taken
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-white text-stone-800 border-amber-400 hover:bg-amber-100"
                  }`}
                >
                  <CheckCircle2 className="w-7 h-7" />
                  <span>{med.is_taken ? "Đã uống" : "Chưa uống"}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t-2 border-stone-200 text-center">
          <p className="text-elder-base text-stone-700 font-medium">
            💡 Để thêm thuốc mới, cụ chỉ cần trò chuyện bằng giọng nói với An Nhiên bất cứ lúc nào ạ!
          </p>
        </div>
      </div>
    </div>
  );
};
