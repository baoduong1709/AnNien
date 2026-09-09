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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-red-950/80 backdrop-blur-md animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-lg bg-white border-4 sm:border-8 border-red-600 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl flex flex-col items-center text-center max-h-[92dvh] overflow-y-auto">
        {/* Urgent Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-100 flex items-center justify-center mb-3 text-red-600 animate-bounce shrink-0">
          <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        <h2 className="text-xl sm:text-elder-2xl font-black text-red-700 tracking-tight leading-tight">
          {isAlertDispatched ? "ĐANG GỌI CỨU HỘ KHẨN CẤP!" : "BÁO ĐỘNG KHẨN CẤP (SOS)"}
        </h2>

        {!isAlertDispatched ? (
          <div className="mt-4">
            <p className="text-elder-lg text-stone-800 font-bold">
              Hệ thống sẽ tự động gửi thông báo cứu hộ tới người thân trong:
            </p>
            <div className="my-6 text-7xl font-black text-red-600">
              {countdown} <span className="text-3xl font-bold">giây</span>
            </div>
            <p className="text-elder-base text-stone-600">
              Nếu cụ bấm nhầm, hãy nhấn nút <strong className="text-stone-900">HỦY BÁO ĐỘNG</strong> dưới đây ngay nhé.
            </p>
          </div>
        ) : (
          <div className="mt-4 w-full">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl mb-6">
              <p className="text-elder-base text-red-900 font-bold">
                {activeAlertMessage || "Cụ hãy ngồi yên một chỗ, thở đều và giữ bình tĩnh! Còi báo động đã được kích hoạt tới người thân và đội y tế."}
              </p>
            </div>

            {/* Quick Call Buttons */}
            <div className="flex flex-col gap-3 w-full">
              <a
                href={`tel:${emergencyPhone}`}
                className="w-full py-5 px-6 bg-red-600 hover:bg-red-700 text-white rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-4 border-red-800 shadow-lg"
              >
                <PhoneCall className="w-8 h-8" />
                <span>GỌI CẤP CỨU {emergencyPhone}</span>
              </a>

              <a
                href={`tel:${caregiverPhone}`}
                className="w-full py-5 px-6 bg-amber-600 hover:bg-amber-700 text-white rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-4 border-amber-800 shadow-lg"
              >
                <PhoneCall className="w-8 h-8" />
                <span>GỌI CON CHÁU ({caregiverPhone})</span>
              </a>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <div className="mt-6 w-full">
          <button
            onClick={onClose}
            className="w-full py-5 px-6 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded-3xl font-black text-elder-lg flex items-center justify-center gap-3 border-4 border-stone-400"
          >
            <X className="w-8 h-8" />
            <span>{isAlertDispatched ? "ĐÓNG CỬA SỔ NÀY" : "HỦY BÁO ĐỘNG NGAY (BẤM NHẦM)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
