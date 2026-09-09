import { useState, useEffect } from "react";
import {
  HeartPulse,
  LogIn,
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Users,
  AlertCircle,
  Server,
} from "lucide-react";

interface ElderPairingScreenProps {
  gatewayHttpUrl: string;
  onUpdateGatewayUrl?: (newWsUrl: string) => void;
  onPaired: (data: {
    pairingCode: string;
    familyName: string;
    elderName: string;
    aiName: string;
    familyId?: string;
    username?: string;
    adminPhone?: string;
  }) => void;
}

export function ElderPairingScreen({ gatewayHttpUrl, onUpdateGatewayUrl, onPaired }: ElderPairingScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [families, setFamilies] = useState<any[]>([]);
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempHost, setTempHost] = useState(() => {
    return gatewayHttpUrl.replace("http://", "").replace("https://", "");
  });

  const handleSaveServerHost = () => {
    let clean = tempHost.trim().replace("http://", "").replace("https://", "").replace("ws://", "").replace("wss://", "").replace(/\/$/, "");
    if (!clean) clean = "192.168.1.3:8080";
    const newWsUrl = `ws://${clean}/ws/live`;
    localStorage.setItem("annien_gateway_url", newWsUrl);
    if (onUpdateGatewayUrl) {
      onUpdateGatewayUrl(newWsUrl);
    }
    setShowServerModal(false);
  };

  // Registration form fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState("");
  const [regElderFullName, setRegElderFullName] = useState("");
  const [regElderPrefName, setRegElderPrefName] = useState("");
  const [regAiName, setRegAiName] = useState("Cháu Út");
  const [regHonorific, setRegHonorific] = useState("Bác");
  const [regBirthYear, setRegBirthYear] = useState(1948);

  // Fetch available families for 1-click quick selection
  useEffect(() => {
    fetch(`${gatewayHttpUrl}/api/v1/families`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setFamilies(data);
      })
      .catch(() => {});
  }, [gatewayHttpUrl]);

  const handleSuccessLogin = (fam: any) => {
    const elderName = fam.elder?.preferred_name || fam.elder?.full_name || "Cụ";
    const aiName = fam.elder?.ai_name || "An Nhiên";
    onPaired({
      familyId: fam.id,
      pairingCode: fam.pairing_code,
      familyName: fam.family_name,
      elderName,
      aiName,
      username: fam.username,
      adminPhone: fam.admin_phone,
    });
  };

  // Handle Login via Username + Password
  const handleLogin = async (customUser?: string, customPass?: string) => {
    const targetUser = (customUser ?? username).trim();
    const targetPass = (customPass ?? password).trim();

    if (!targetUser) {
      setError("Vui lòng nhập tên đăng nhập (hoặc số điện thoại).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUser,
          password: targetPass || undefined,
        }),
      });

      if (res.ok) {
        const fam = await res.json();
        handleSuccessLogin(fam);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.detail || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      }
    } catch (err) {
      // Offline demo fallback for default family
      if (
        targetUser.toLowerCase() === "giadinh_bacan" ||
        targetUser === "0912345678" ||
        targetUser.toUpperCase() === "ANN-8866"
      ) {
        onPaired({
          familyId: "fam_default",
          pairingCode: "ANN-8866",
          familyName: "Gia Đình Bác Nguyễn Văn An",
          elderName: "Bác An",
          aiName: "Cháu Út",
          username: "giadinh_bacan",
          adminPhone: "0912345678",
        });
      } else {
        setError("Lỗi kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng wifi.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Register New Family with Username and Password
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || !regElderFullName.trim()) {
      setError("Vui lòng điền tên đăng nhập, mật khẩu và họ tên của cụ.");
      return;
    }

    setLoading(true);
    setError("");

    const payload = {
      username: regUsername.trim(),
      password: regPassword.trim(),
      family_name: `Gia Đình ${regElderPrefName.trim() || regElderFullName.trim()}`,
      admin_phone: regPhone.trim() || "0900000000",
      elder_full_name: regElderFullName.trim(),
      elder_preferred_name: regElderPrefName.trim() || regElderFullName.trim(),
      honorific: regHonorific,
      birth_year: Number(regBirthYear) || 1948,
      ai_name: regAiName.trim() || "An Nhiên",
    };

    try {
      const res = await fetch(`${gatewayHttpUrl}/api/v1/families/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const fam = await res.json();
        handleSuccessLogin(fam);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.detail || "Không thể tạo tài khoản. Vui lòng thử lại tên đăng nhập khác.");
      }
    } catch (err) {
      setError("Lỗi kết nối tới máy chủ khi đăng ký tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-annien-bg flex flex-col items-center justify-center p-3 sm:p-6 selection:bg-teal-200 pt-safe pb-safe overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl sm:rounded-[2.5rem] border-2 sm:border-4 border-stone-200 shadow-2xl p-5 sm:p-8 space-y-4 sm:space-y-6 text-center my-auto animate-fade-in">
        {/* Animated App Icon */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute inset-0 rounded-3xl bg-teal-500/20 animate-ping opacity-75" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg mx-auto">
            <HeartPulse className="w-9 h-9 sm:w-12 sm:h-12" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-xl sm:text-elder-2xl font-black text-stone-900 tracking-tight leading-tight">
            Trợ Lý An Nhiên
          </h1>
          <p className="text-sm sm:text-elder-base font-bold text-stone-600">
            {mode === "login"
              ? "Đăng nhập tài khoản gia đình để cụ trò chuyện"
              : "Tạo tài khoản gia đình mới cho cụ"}
          </p>
        </div>
        {/* Server Connection Banner */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              Máy chủ: <strong className="text-teal-900 font-mono text-xs">{gatewayHttpUrl}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className="ml-2 px-2 py-0.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 font-black text-xs shrink-0 active:scale-95 transition-all"
          >
            Đổi IP
          </button>
        </div>

        {/* Server Host Change Modal */}
        {showServerModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 pt-safe pb-safe">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 border-2 border-stone-200 shadow-2xl text-left max-h-[90dvh] overflow-y-auto">
              <h3 className="text-base sm:text-elder-base font-black text-stone-900 flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-700" />
                <span>Cài Đặt IP Máy Chủ</span>
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Nhập địa chỉ IP máy tính đang chạy Backend trên cùng mạng Wi-Fi:
              </p>
              <input
                type="text"
                value={tempHost}
                onChange={(e) => setTempHost(e.target.value)}
                placeholder="192.168.1.3:8080"
                className="w-full px-4 py-3 rounded-2xl border-2 border-stone-300 font-mono text-sm focus:outline-none focus:border-teal-600 font-bold"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServerModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-bold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveServerHost}
                  className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black active:scale-95 shadow-md"
                >
                  Lưu & Kết Nối
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode Toggle Tabs */}
        <div className="flex bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 py-3 rounded-xl font-black text-elder-sm flex items-center justify-center gap-2 transition-all ${
              mode === "login"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <LogIn className="w-5 h-5" />
            <span>Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 py-3 rounded-xl font-black text-elder-sm flex items-center justify-center gap-2 transition-all ${
              mode === "register"
                ? "bg-white text-teal-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <UserPlus className="w-5 h-5" />
            <span>Đăng Ký Mới</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-red-50 border-2 border-red-200 text-red-700 font-bold rounded-2xl text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* LOGIN FORM                                           */}
        {/* ==================================================== */}
        {mode === "login" ? (
          <div className="space-y-4 text-left">
            {/* Username Input */}
            <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-4 space-y-2">
              <label className="block text-elder-sm font-extrabold text-stone-800 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-700 shrink-0" />
                <span>Tên Đăng Nhập:</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: giadinh_bacan hoặc 0912345678"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 rounded-2xl border-2 border-stone-300 text-elder-base font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-teal-600 bg-white"
              />
            </div>

            {/* Password Input */}
            <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-4 space-y-2">
              <label className="block text-elder-sm font-extrabold text-stone-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-teal-700 shrink-0" />
                <span>Mật Khẩu:</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Nhập mật khẩu (ví dụ: 123456)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  className="w-full pl-4 pr-12 py-3 rounded-2xl border-2 border-stone-300 text-elder-base font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-teal-600 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={() => handleLogin()}
              disabled={loading}
              className="w-full py-4 sm:py-5 px-6 rounded-3xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-elder-base sm:text-elder-lg font-black shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span>{loading ? "Đang đăng nhập..." : "Đăng Nhập Vào App"}</span>
              <ArrowRight className="w-6 h-6" />
            </button>

            {/* Quick 1-Click Login / Sample Account */}
            <div className="pt-2 border-t-2 border-stone-100 space-y-2">
              <div className="text-xs font-extrabold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Tài khoản mẫu / Đăng nhập 1-chạm:</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsername("giadinh_bacan");
                  setPassword("123456");
                  handleLogin("giadinh_bacan", "123456");
                }}
                className="w-full p-3 rounded-2xl border-2 border-teal-200 bg-teal-50/70 hover:bg-teal-100/80 flex items-center justify-between text-left transition-all active:scale-98"
              >
                <div>
                  <div className="text-xs font-black text-teal-950">Gia Đình Bác Nguyễn Văn An</div>
                  <div className="text-[11px] text-teal-700">
                    Tên đăng nhập: <strong>giadinh_bacan</strong> • Mật khẩu: <strong>123456</strong>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-teal-900 bg-teal-200 px-2.5 py-1 rounded-lg shrink-0">
                  Vào ngay
                </span>
              </button>

              {/* Dynamic families from backend */}
              {families
                .filter((f) => f.username !== "giadinh_bacan")
                .map((fam) => (
                  <button
                    key={fam.id}
                    type="button"
                    onClick={() => {
                      const u = fam.username || fam.admin_phone;
                      const p = fam.password || "123456";
                      setUsername(u);
                      setPassword(p);
                      handleLogin(u, p);
                    }}
                    className="w-full p-2.5 rounded-2xl border border-stone-200 hover:border-teal-500 hover:bg-stone-50 flex items-center justify-between text-left transition-all"
                  >
                    <div>
                      <div className="text-xs font-black text-stone-900">{fam.family_name}</div>
                      <div className="text-[11px] text-stone-600">
                        TK: <strong>{fam.username || fam.admin_phone}</strong>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                      Chọn
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* REGISTRATION FORM                                    */
          /* ==================================================== */
          <form onSubmit={handleRegister} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tên đăng nhập *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: bac_an"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-teal-700" />
                  <span>Mật khẩu *</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    placeholder="Mật khẩu"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-stone-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-teal-700" />
                <span>Số điện thoại người thân (bảo hộ)</span>
              </label>
              <input
                type="tel"
                placeholder="Ví dụ: 0912345678"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">Họ tên của cụ *</label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn An"
                  value={regElderFullName}
                  onChange={(e) => setRegElderFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">Tên thường gọi *</label>
                <input
                  type="text"
                  required
                  placeholder="Bác An"
                  value={regElderPrefName}
                  onChange={(e) => setRegElderPrefName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <div className="p-3 bg-teal-50 border-2 border-teal-200 rounded-2xl space-y-1">
              <label className="block text-xs font-black text-teal-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Tên con cháu đặt cho AI (cụ gọi để đánh thức) *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Cháu Út, Bé Bảy, An Nhiên"
                value={regAiName}
                onChange={(e) => setRegAiName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-teal-300 text-sm font-black text-teal-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[10px] text-teal-700 font-medium">
                Cụ có thể gọi <strong>"Cháu ơi"</strong> hoặc <strong>"{regAiName || "An Nhiên"} ơi"</strong> để trò chuyện.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">Danh xưng AI gọi cụ</label>
                <select
                  value={regHonorific}
                  onChange={(e) => setRegHonorific(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                >
                  <option value="Bác">Bác</option>
                  <option value="Ông">Ông</option>
                  <option value="Bà">Bà</option>
                  <option value="Cụ">Cụ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">Năm sinh</label>
                <input
                  type="number"
                  min={1910}
                  max={1970}
                  value={regBirthYear}
                  onChange={(e) => setRegBirthYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-2xl border-2 border-stone-300 text-sm font-bold focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-3xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-elder-base font-black shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Đang tạo tài khoản..." : "Tạo Tài Khoản & Vào App"}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </form>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-stone-400">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Đăng nhập 1 lần duy nhất • Điều khiển 100% bằng giọng nói</span>
        </div>
      </div>
    </div>
  );
}
