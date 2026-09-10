import { useState, useEffect } from "react";
import { PhoneCall, X, ShieldAlert } from "lucide-react";

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSos: (reason: string) => void;
  emergencyPhone?: string;
  caregiverPhone?: string;
  activeAlertMessage?: string;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  onConfirmSos,
  emergencyPhone = "115",
  caregiverPhone = "0912345678",
  activeAlertMessage,
}) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [isAlertDispatched, setIsAlertDispatched] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen && countdown > 0 && !isAlertDispatched) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isOpen && countdown === 0 && !isAlertDispatched) {
      setIsAlertDispatched(true);
      onConfirmSos("Báo động khẩn cấp do cụ nhấn nút SOS");
    }
    return () => clearTimeout(timer);
  }, [isOpen, countdown, isAlertDispatched]);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      setIsAlertDispatched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/80 backdrop-blur-xl animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-lg bg-gradient-to-b from-white to-red-50 border-4 sm:border-8 border-red-500 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-[0_0_50px_rgba(220,38,38,0.4)] flex flex-col items-center text-center max-h-[92dvh] overflow-y-auto">
        {/* Urgent Icon */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mb-4 text-red-600 animate-bounce shrink-0 shadow-lg border-2 border-white">
          <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-20"></div>
          <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-md z-10" />
        </div>

        <h2 className="text-elder-xl sm:text-elder-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-600 to-red-900 tracking-tight leading-tight drop-shadow-sm">
          {isAlertDispatched ? "ĐANG GỌI CỨU HỘ!" : "BÁO ĐỘNG KHẨN CẤP"}
        </h2>

        {!isAlertDispatched ? (
          <div className="mt-5 w-full">
            <p className="text-elder-lg text-stone-800 font-bold leading-snug">
              Hệ thống sẽ tự động gửi thông báo cứu hộ tới người thân trong:
            </p>
            <div className="my-8 flex justify-center items-baseline gap-2">
              <span className="text-8xl font-black text-red-600 drop-shadow-md animate-pulse">
                {countdown}
              </span>
              <span className="text-3xl font-bold text-red-700">giây</span>
            </div>
            <p className="text-elder-lg font-bold text-stone-600 bg-white/60 p-4 rounded-2xl border border-red-100 shadow-inner">
              Nếu cụ bấm nhầm, hãy nhấn nút <strong className="text-stone-900">HỦY BÁO ĐỘNG</strong> dưới đây ngay nhé.
            </p>
          </div>
        ) : (
          <div className="mt-5 w-full">
            <div className="p-5 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 rounded-3xl mb-6 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
              <p className="text-elder-lg text-red-900 font-black relative z-10">
                {activeAlertMessage || "Cụ hãy ngồi yên một chỗ, thở đều và giữ bình tĩnh! Còi báo động đã được kích hoạt tới người thân và đội y tế."}
              </p>
            </div>

            {/* Quick Call Buttons */}
            <div className="flex flex-col gap-4 w-full">
              <a
                href={`tel:${emergencyPhone}`}
                className="w-full py-5 px-6 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-[3px] border-red-800 shadow-[0_8px_20px_rgba(220,38,38,0.4)] active:scale-[0.98] transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                <PhoneCall className="w-8 h-8 drop-shadow-md group-hover:animate-wiggle" />
                <span className="drop-shadow-sm">GỌI CẤP CỨU {emergencyPhone}</span>
              </a>

              <a
                href={`tel:${caregiverPhone}`}
                className="w-full py-5 px-6 bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-[3px] border-amber-800 shadow-[0_8px_20px_rgba(217,119,6,0.4)] active:scale-[0.98] transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                <PhoneCall className="w-8 h-8 drop-shadow-md group-hover:animate-wiggle" />
                <span className="drop-shadow-sm">GỌI CON CHÁU</span>
              </a>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <div className="mt-6 w-full">
          <button
            onClick={onClose}
            className="w-full py-5 px-6 bg-gradient-to-br from-stone-100 to-stone-300 hover:from-stone-200 hover:to-stone-400 text-stone-900 rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-[3px] border-stone-400 shadow-[0_8px_15px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
            <X className="w-8 h-8 drop-shadow-sm text-stone-700" />
            <span className="drop-shadow-sm">{isAlertDispatched ? "ĐÓNG CỬA SỔ NÀY" : "HỦY BÁO ĐỘNG NGAY"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
