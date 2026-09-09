import { useState } from "react";
import { Settings as SettingsIcon, Save, X, Server, HeartPulse, Unlink, Sparkles } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayWsUrl: string;
  onSave: (url: string) => void;
  familyId?: string;
  pairingCode?: string;
  username?: string;
  adminPhone?: string;
  elderName?: string;
  aiName?: string;
  familyName?: string;
  onLogout?: () => void;
  onUnpair?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  gatewayWsUrl,
  onSave,
  pairingCode,
  username,
  adminPhone,
  elderName,
  aiName,
  familyName,
  onLogout,
  onUnpair,
}) => {
  const [url, setUrl] = useState(gatewayWsUrl);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(url);
    onClose();
  };

  const handleSignOut = () => {
    if (onLogout) onLogout();
    else if (onUnpair) onUnpair();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in pt-safe pb-safe">
      <div className="w-full max-w-lg bg-white border-2 sm:border-4 border-stone-300 rounded-3xl sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-stone-200 shrink-0 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-700 shrink-0">
              <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h2 className="text-base sm:text-elder-lg font-black text-stone-900 leading-tight">Cài Đặt Ứng Dụng</h2>
              <p className="text-xs text-stone-500">Dành cho người nhà / kỹ thuật viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-300 active:scale-95 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Account Information */}
          {(pairingCode || username || adminPhone || familyName) && (
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 text-teal-900 font-extrabold text-xs sm:text-sm">
                  <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700 shrink-0" />
                  <span>Tài Khoản Đang Dùng</span>
                </div>
                {(username || adminPhone) && (
                  <span className="px-2 py-0.5 bg-teal-200 text-teal-950 font-bold text-[11px] rounded-lg shrink-0">
                    TK: {username || adminPhone}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-stone-500 block">Gia đình:</span>
                  <span className="font-bold text-stone-800 leading-tight block">{familyName || "Gia đình"}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100">
                  <span className="text-[10px] text-stone-500 block">Người cao tuổi:</span>
                  <span className="font-bold text-stone-800 leading-tight block">{elderName || "Cụ"}</span>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-teal-200">
                <span className="text-[11px] text-stone-500 block">Tên AI nhận diện giọng nói:</span>
                <span className="font-extrabold text-teal-800 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{aiName || "An Nhiên"} (Cụ gọi: "Cháu ơi" hoặc "{aiName || "An Nhiên"} ơi")</span>
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Unlink className="w-4 h-4 text-red-600 shrink-0" />
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            </div>
          )}

          {/* WebSocket Server Configuration */}
          <div className="space-y-2">
            <label className="block text-sm sm:text-base font-bold text-stone-800 flex items-center gap-2">
              <Server className="w-5 h-5 text-teal-700 shrink-0" />
              <span>Địa chỉ Backend Gateway (WebSocket):</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://192.168.1.3:8080/ws/live"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 text-xs sm:text-sm font-mono text-stone-800 focus:outline-none focus:border-teal-600 break-all"
            />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Mặc định khi chạy local: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">ws://192.168.1.3:8080/ws/live</code>
              <br />
              Hoặc Cloud Run: <code className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">wss://annien-gateway-xxx-as.a.run.app/ws/live</code>
            </p>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 p-3.5 sm:p-5 border-t-2 border-stone-200 bg-stone-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border-2 border-stone-300 font-bold text-stone-700 text-xs sm:text-sm hover:bg-stone-100"
          >
            Đóng
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 hover:bg-teal-800 active:scale-95 transition-all shadow-md"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
