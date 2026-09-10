import { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Pill,
  BookOpen,
  ShieldAlert,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { AudioOrb } from "./components/AudioOrb";
import { BigButton } from "./components/BigButton";
import { LiveTranscript } from "./components/LiveTranscript";
import { SosModal } from "./components/SosModal";
import { MedicationModal } from "./components/MedicationModal";
import { MoodHistoryModal } from "./components/MoodHistoryModal";
import { SettingsModal } from "./components/SettingsModal";
import { CaregiverDashboard } from "./components/CaregiverDashboard";
import { ElderPairingScreen } from "./components/ElderPairingScreen";
import { useLiveSession } from "./hooks/useLiveSession";

export function App() {
  const [gatewayUrl, setGatewayUrl] = useState<string>(() => {
    const saved = localStorage.getItem("annien_gateway_url");
    if (saved && saved !== "ws://192.168.1.3:8080/ws/live") {
      return saved;
    }
    return "wss://annien.baoduong.dev/ws/live";
  });
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [isMedOpen, setIsMedOpen] = useState<boolean>(false);
  const [isMoodOpen, setIsMoodOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sosAlertMessage, setSosAlertMessage] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  // Family Pairing & Identity State
  const [pairingCode, setPairingCode] = useState<string>(
    () => localStorage.getItem("annien_elder_pairing_code") || ""
  );
  const [familyId, setFamilyId] = useState<string>(
    () => localStorage.getItem("annien_family_id") || ""
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("annien_username") || ""
  );
  const [adminPhone, setAdminPhone] = useState<string>(
    () => localStorage.getItem("annien_admin_phone") || ""
  );
  const [elderName, setElderName] = useState<string>(
    () => localStorage.getItem("annien_elder_name") || "Bác An"
  );
  const [familyName, setFamilyName] = useState<string>(
    () => localStorage.getItem("annien_elder_family_name") || "Gia Đình Bác An"
  );
  const [customAiName, setCustomAiName] = useState<string>(
    () => localStorage.getItem("annien_elder_ai_name") || "Cháu Út"
  );

  const {
    status,
    transcripts,
    volumeLevel,
    medications,
    moods,
    memories,
    aiName: liveAiName,
    isStandby,
    standbyMessage,
    connect,
    disconnect,
    triggerBargeIn,
    triggerSos,
    setMedications,
    isTauri,
  } = useLiveSession({
    gatewayWsUrl: gatewayUrl,
    pairingCode: pairingCode || undefined,
    onSosAlert: (message) => {
      setSosAlertMessage(message);
      setIsSosOpen(true);
    },
    onMedicationUpdated: (medName) => {
      console.log("Medication updated via voice:", medName);
    },
    onStandbyMode: (msg) => {
      console.log("Assistant entered standby:", msg);
    },
  });

  const effectiveAiName = liveAiName || customAiName || "Cháu Út";

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[now.getDay()];
      const timeStr = `${dayName}, ngày ${now.getDate()} tháng ${now.getMonth() + 1} • ${now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
      setCurrentTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize latest elder profile and AI name from backend
  useEffect(() => {
    if (!pairingCode) return;
    const httpBase = gatewayUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/ws/live", "");
    fetch(`${httpBase}/api/v1/families/pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairing_code: pairingCode }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((fam) => {
        if (fam) {
          if (fam.id) {
            setFamilyId(fam.id);
            localStorage.setItem("annien_family_id", fam.id);
          }
          if (fam.username) {
            setUsername(fam.username);
            localStorage.setItem("annien_username", fam.username);
          }
          if (fam.admin_phone) {
            setAdminPhone(fam.admin_phone);
            localStorage.setItem("annien_admin_phone", fam.admin_phone);
          }
          if (fam.family_name) {
            setFamilyName(fam.family_name);
            localStorage.setItem("annien_elder_family_name", fam.family_name);
          }
          if (fam.elder) {
            if (fam.elder.ai_name) {
              setCustomAiName(fam.elder.ai_name);
              localStorage.setItem("annien_elder_ai_name", fam.elder.ai_name);
            }
            if (fam.elder.preferred_name) {
              setElderName(fam.elder.preferred_name);
              localStorage.setItem("annien_elder_name", fam.elder.preferred_name);
            }
          }
        }
      })
      .catch(() => {});
  }, [pairingCode, gatewayUrl]);

  const handleToggleSession = () => {
    if (status === "idle") {
      connect();
    } else {
      disconnect();
    }
  };

  const handleConfirmSos = async (reason: string) => {
    try {
      await triggerSos(reason);
    } catch (e) {
      console.warn("Failed to trigger SOS via session:", e);
    }

    try {
      const httpBase = gatewayUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/ws/live", "");
      await fetch(`${httpBase}/api/v1/sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: "CRITICAL",
          reason,
          location: "Nhà ở"
        })
      });
    } catch (e) {
      console.warn("Failed to dispatch SOS via REST fallback:", e);
    }
  };

  const handleToggleMedTaken = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_taken: !m.is_taken } : m))
    );
  };

  const handlePaired = (data: {
    pairingCode: string;
    familyName: string;
    elderName: string;
    aiName: string;
    familyId?: string;
    username?: string;
    adminPhone?: string;
  }) => {
    setPairingCode(data.pairingCode);
    setFamilyName(data.familyName);
    setElderName(data.elderName);
    setCustomAiName(data.aiName);
    if (data.familyId) setFamilyId(data.familyId);
    if (data.username) setUsername(data.username);
    if (data.adminPhone) setAdminPhone(data.adminPhone);

    localStorage.setItem("annien_elder_pairing_code", data.pairingCode);
    localStorage.setItem("annien_elder_family_name", data.familyName);
    localStorage.setItem("annien_elder_name", data.elderName);
    localStorage.setItem("annien_elder_ai_name", data.aiName);
    if (data.familyId) localStorage.setItem("annien_family_id", data.familyId);
    if (data.username) localStorage.setItem("annien_username", data.username);
    if (data.adminPhone) localStorage.setItem("annien_admin_phone", data.adminPhone);
  };

  const handleUnpair = () => {
    localStorage.removeItem("annien_elder_pairing_code");
    localStorage.removeItem("annien_elder_family_name");
    localStorage.removeItem("annien_elder_name");
    localStorage.removeItem("annien_elder_ai_name");
    localStorage.removeItem("annien_family_id");
    localStorage.removeItem("annien_username");
    localStorage.removeItem("annien_admin_phone");
    setPairingCode("");
    setFamilyId("");
    setUsername("");
    setAdminPhone("");
    disconnect();
  };

  const gatewayHttpUrl = gatewayUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://")
    .replace("/ws/live", "");

  // 1. Bản Web Browser (!isTauri): Dành riêng cho con cháu quản lý
  if (!isTauri) {
    return (
      <CaregiverDashboard
        gatewayHttpUrl={gatewayHttpUrl}
        apkDownloadUrl={`${gatewayHttpUrl}/api/v1/download/apk`}
      />
    );
  }

  // 2. Ứng dụng Android APK trên điện thoại của cụ (isTauri)
  // Nếu máy chưa kết nối, hiện màn hình nhập mã kết nối từ con cháu một lần duy nhất
  if (!pairingCode) {
    return (
      <ElderPairingScreen
        gatewayHttpUrl={gatewayHttpUrl}
        onUpdateGatewayUrl={(newWsUrl) => setGatewayUrl(newWsUrl)}
        onPaired={handlePaired}
      />
    );
  }

  // 3. Màn hình đàm thoại giọng nói cho cụ trên điện thoại Android (Hands-free Voice UX)
  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col justify-between bg-annien-bg px-3 pt-2 pb-5 sm:px-6 sm:py-4 max-w-4xl mx-auto selection:bg-teal-200 overflow-hidden pt-safe pb-safe">
      {/* Top Header: Clock, Status & Settings */}
      <header className="flex items-center justify-between p-3 sm:p-5 bg-gradient-to-r from-white/90 to-white/70 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-sm shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-elder-base sm:text-elder-lg font-black text-stone-800 tracking-tight truncate drop-shadow-sm">
            {currentTime || `Trợ lý ${effectiveAiName}`}
          </div>
          <div className="flex items-center gap-2 sm:gap-2.5 mt-1">
            <span className="relative flex h-3 w-3 sm:h-4 sm:w-4 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status !== "idle" ? "bg-emerald-400" : isStandby ? "bg-amber-400" : "bg-stone-300"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 sm:h-4 sm:w-4 ${
                  status !== "idle" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : isStandby ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-stone-400"
                }`}
              />
            </span>
            <span className="text-elder-sm sm:text-elder-base font-bold text-stone-600 truncate">
              {status !== "idle"
                ? `Đang trò chuyện cùng ${elderName}`
                : isStandby
                ? "Đang nghỉ ngơi (Gọi 'Cháu ơi')"
                : "Sẵn sàng lắng nghe"}
            </span>
          </div>
        </div>

        {/* Cài đặt cấu hình */}
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Cài đặt kết nối"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] bg-stone-50/80 border border-stone-200/60 shadow-sm flex items-center justify-center text-stone-600 hover:bg-white hover:text-stone-900 active:scale-95 transition-all backdrop-blur-sm"
          >
            <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
      </header>

      {/* Voice Control Wake-Word Banner */}
      <div className="my-2 sm:my-3 bg-gradient-to-r from-teal-700 to-emerald-600 text-white px-4 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-teal-700/20 flex items-center justify-between gap-2 text-elder-sm sm:text-elder-base font-black shrink-0 relative overflow-hidden">
        {/* Subtle inner glow / decorative shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5 truncate relative z-10">
          <Sparkles className="w-6 h-6 text-amber-300 shrink-0 animate-spin drop-shadow-sm" style={{ animationDuration: "6s" }} />
          <span className="truncate drop-shadow-md">
            Khẩu lệnh: Gọi <span className="text-amber-200 font-black">"Cháu ơi"</span> hoặc <span className="text-amber-200 font-black">"{effectiveAiName} ơi"</span>
          </span>
        </div>
      </div>

      {/* Standby Message Notice */}
      {isStandby && (
        <div className="mb-2 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/60 rounded-2xl sm:rounded-3xl text-amber-900 font-bold text-elder-sm sm:text-elder-base flex items-center justify-center gap-2 shadow-sm animate-fade-in text-center shrink-0">
          <span className="text-2xl drop-shadow-sm">💤</span>
          <span>{standbyMessage || `Cháu đang nghỉ ngơi. Cụ chỉ cần gọi "Cháu ơi" là cháu có mặt ngay ạ!`}</span>
        </div>
      )}

      {/* Center Stage: Minimalist Soundwave Orb & Subtitles */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center my-1 sm:my-2 space-y-3 sm:space-y-4 overflow-y-auto">
        <AudioOrb
          state={status}
          volumeLevel={volumeLevel}
          onToggleSession={handleToggleSession}
          onBargeIn={triggerBargeIn}
        />

        {/* Subtitles Area */}
        <div className="w-full max-w-xl px-2">
          <LiveTranscript items={transcripts} />
        </div>
      </main>

      {/* Bottom Bar: 4 Big Tactile Elder Buttons */}
      <footer className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 shrink-0 pt-2">
        {/* Button 1: Conversation Toggle */}
        <BigButton
          label={status === "idle" ? "Trò Chuyện" : "Nghỉ Ngơi"}
          subLabel={status === "idle" ? "Bật mic" : "Tạm dừng"}
          icon={status === "idle" ? <Mic className="w-6 h-6 sm:w-8 sm:h-8" /> : <MicOff className="w-6 h-6 sm:w-8 sm:h-8" />}
          variant={status === "idle" ? "primary" : "neutral"}
          onClick={handleToggleSession}
        />

        {/* Button 2: Medication Reminders */}
        <BigButton
          label="Nhắc Thuốc"
          subLabel={`${medications.length} đơn thuốc`}
          icon={<Pill className="w-6 h-6 sm:w-8 sm:h-8" />}
          variant="amber"
          onClick={() => setIsMedOpen(true)}
        />

        {/* Button 3: Memories & Diary */}
        <BigButton
          label="Kỷ Niệm"
          subLabel="Nhật ký an sinh"
          icon={<BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />}
          variant="neutral"
          onClick={() => setIsMoodOpen(true)}
        />

        {/* Button 4: Emergency SOS (High contrast Crimson) */}
        <BigButton
          label="SOS KHẨN CẤP"
          subLabel="Gọi cứu hộ ngay"
          icon={<ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8" />}
          variant="crimson"
          onClick={() => setIsSosOpen(true)}
        />
      </footer>

      {/* Interactive Modals */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onConfirmSos={handleConfirmSos}
        activeAlertMessage={sosAlertMessage}
      />

      <MedicationModal
        isOpen={isMedOpen}
        onClose={() => setIsMedOpen(false)}
        medications={medications}
        onToggleTaken={handleToggleMedTaken}
      />

      <MoodHistoryModal
        isOpen={isMoodOpen}
        onClose={() => setIsMoodOpen(false)}
        moods={moods}
        memories={memories}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gatewayWsUrl={gatewayUrl}
        onSave={(newUrl) => {
          setGatewayUrl(newUrl);
          localStorage.setItem("annien_gateway_url", newUrl);
        }}
        familyId={familyId}
        pairingCode={pairingCode}
        username={username}
        adminPhone={adminPhone}
        familyName={familyName}
        elderName={elderName}
        aiName={effectiveAiName}
        onLogout={handleUnpair}
        onUnpair={handleUnpair}
      />
    </div>
  );
}
