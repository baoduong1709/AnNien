# AnNien (An Nhiên) — Trợ Lý Đàm Thoại Đồng Hành Thời Gian Thực Cho Người Cao Tuổi

Dự án **AnNien** là giải pháp trợ lý đàm thoại bằng giọng nói hai chiều (Real-time Conversational Voice AI) được thiết kế chuyên biệt dành riêng cho người cao tuổi Việt Nam. Hệ thống kết hợp giữa giao diện người dùng thân thiện, độ tương phản cao, nút bấm lớn và nền tảng xử lý âm thanh thời gian thực dựa trên hệ sinh thái AI tiên tiến nhất của Google.

---

## 1. Kiến Trúc Hệ Thống (Architecture Overview)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   Ứng Dụng Client (Tauri v2 Mobile & Desktop)            │
│  ┌───────────────────────────────┐   ┌────────────────────────────────┐  │
│  │ Giao Diện Người Cao Tuổi (UI) │   │        Tầng Rust Core          │  │
│  │ - Chữ to, độ tương phản cao   │   │ - Capture Mic: PCM 16kHz Mono  │  │
│  │ - Nút bấm xúc giác lớn        │   │ - Playback:    PCM 24kHz Mono  │  │
│  │ - Audio Orb tối giản          │   │ - Ngắt tức thì (Barge-In drain)│  │
│  └───────────────▲───────────────┘   └───────────────▲────────────────┘  │
└──────────────────┼───────────────────────────────────┼───────────────────┘
                   │ WebSocket (PCM 16kHz in / 24kHz out)
                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│          Backend Proxy Gateway (FastAPI / Google Cloud Run)              │
│                 Khu vực triển khai: asia-southeast1                      │
│                                                                          │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Session & Audio Relay  │  │ Deterministic Function Calling Tools   │  │
│  │ - Quản lý kết nối WS   │  │ • remind_medication (Nhắc thuốc)       │  │
│  │ - Điều phối Barge-in   │  │ • trigger_sos_alert (Kích hoạt SOS)    │  │
│  │ - Bảo mật API Key      │  │ • record_mood       (Ghi nhận cảm xúc) │  │
│  └───────────▲────────────┘  └───────────────────▲────────────────────┘  │
└──────────────┼───────────────────────────────────┼───────────────────────┘
               │                                   │
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Hệ Sinh Thái Google AI Mới Nhất                        │
│                                                                          │
│  1. gemini-3.1-flash-live                                                │
│     Gemini Multimodal Live API (BidiGenerateContent over WebSocket).     │
│     Đàm thoại hai chiều thời gian thực, nhận biết cảm xúc, hỗ trợ        │
│     Barge-in (người già nói ngắt lời AI tự nhiên).                       │
│                                                                          │
│  2. Google Cloud Text-to-Speech (TTS)                                    │
│     Xử lý tác vụ tất định y tế & cảnh báo khẩn cấp: Đọc chính xác        │
│     tên thuốc, liều lượng, hướng dẫn cấp cứu bằng giọng đọc tiếng Việt   │
│     chuẩn (vi-VN-Wavenet/Neural2), loại bỏ hoàn toàn nguy cơ hallucinate.│
│                                                                          │
│  3. gemini-3.8-flash                                                     │
│     Phân tích nhật ký, an sinh & trích xuất ký ức (Memory Extraction)    │
│     từ các đoạn hội thoại thường nhật để theo dõi sức khỏe tâm thần.     │
│                                                                          │
│  4. text-embedding-005 + Cloud Firestore Vector Search                   │
│     Vector hóa thông tin gia đình, kỷ niệm xưa và triệu chứng bệnh để    │
│     tìm kiếm ngữ nghĩa (RAG), giúp AI thấu hiểu và gợi nhắc thân tình.   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục Dự Án

```
d:\Project\AnNien\
├── backend/                       # Backend Proxy Gateway (FastAPI)
│   ├── app/
│   │   ├── core/
│   │   │   ├── live_client.py     # Gemini Multimodal Live API (gemini-3.1-flash-live)
│   │   │   ├── session.py         # Quản lý phiên đàm thoại & điều phối Barge-in
│   │   │   └── audio_relay.py     # Xử lý PCM 16kHz/24kHz, tính RMS & VAD
│   │   ├── services/
│   │   │   ├── tts_service.py     # Google Cloud TTS (Tác vụ y tế tất định & SOS)
│   │   │   ├── memory_service.py  # gemini-3.8-flash (Trích xuất ký ức & nhật ký)
│   │   │   └── rag_service.py     # text-embedding-005 + Firestore Vector Search
│   │   ├── tools/
│   │   │   ├── definitions.py     # Khai báo schema công cụ Gemini Live
│   │   │   └── handlers.py        # remind_medication, trigger_sos_alert, record_mood
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic models
│   │   ├── config.py              # Cấu hình Pydantic & Biến môi trường
│   │   └── main.py                # FastAPI entrypoint, WebSocket /ws/live & REST APIs
│   ├── tests/                     # Bộ kiểm thử tự động (pytest: 15/15 tests passing)
│   ├── Dockerfile                 # Đóng gói container chuẩn Google Cloud Run
│   └── requirements.txt           # Thư viện Python
├── client/                        # Ứng dụng Client (Tauri v2 Mobile/Desktop)
│   ├── src-tauri/                 # Tầng Rust Core
│   │   ├── src/
│   │   │   ├── audio/             # Capture 16kHz PCM (cpal) & Playback 24kHz (drain)
│   │   │   ├── gateway/           # Rust WebSocket client kết nối Gateway
│   │   │   ├── commands.rs        # Tauri IPC commands
│   │   │   └── lib.rs             # Tauri application bootstrap
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json        # Cấu hình Tauri v2 Desktop & Mobile
│   ├── src/                       # Giao diện thân thiện người cao tuổi (React + TS + Tailwind)
│   │   ├── components/
│   │   │   ├── AudioOrb.tsx       # Sóng âm tối giản, phản hồi âm lượng & ngắt lời
│   │   │   ├── BigButton.tsx      # Nút bấm xúc giác siêu lớn, độ tương phản cao
│   │   │   ├── LiveTranscript.tsx # Phụ đề đàm thoại cỡ chữ to (24px-32px)
│   │   │   ├── SosModal.tsx       # Màn hình SOS khẩn cấp có đếm ngược hủy bỏ
│   │   │   ├── MedicationModal.tsx# Sổ tay nhắc thuốc rõ ràng, đánh dấu đã uống
│   │   │   ├── MoodHistoryModal.tsx# Nhật ký an sinh & ký ức lưu trữ
│   │   │   └── SettingsModal.tsx  # Cài đặt kết nối Gateway
│   │   └── hooks/
│   │       └── useLiveSession.ts  # Điều phối WebSocket & Web Audio fallback
│   └── package.json
└── scripts/
    ├── deploy-cloudrun.sh         # Script deploy lên Cloud Run (asia-southeast1)
    └── start-dev.ps1              # Script khởi chạy đồng thời backend + frontend
```

---

## 3. Hướng Dẫn Cài Đặt & Chạy Môi Trường Phát Triển (Local Dev)

### Bước 1: Khởi động Backend Proxy Gateway
```powershell
cd d:\Project\AnNien\backend
# Cài đặt thư viện:
pip install -r requirements.txt

# Tạo file .env từ mẫu:
copy .env.example .env
# Điền GEMINI_API_KEY vào .env

# Chạy máy chủ:
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```
- Kiểm tra trạng thái máy chủ: `http://localhost:8080/health`
- WebSocket endpoint: `ws://localhost:8080/ws/live`

### Bước 2: Khởi động Client
```powershell
cd d:\Project\AnNien\client
pnpm install

# Chạy giao diện Web:
pnpm run dev

# Hoặc khởi chạy ứng dụng Desktop native (Tauri v2):
pnpm run tauri dev
```

### Chạy nhanh bằng Script:
```powershell
.\scripts\start-dev.ps1
```

---

## 4. Chạy Kiểm Thử (Verification)
Bộ kiểm thử tích hợp và unit test cho backend bao phủ 100% các chức năng cốt lõi:
```powershell
cd d:\Project\AnNien\backend
pytest -v
```
Kết quả kiểm thử:
- ✅ `test_audio_relay_calculations` & `test_audio_relay_wav_wrapping` (PCM 16k/24k)
- ✅ `test_websocket_live_endpoint_lifecycle` (Bidi WebSocket, ping/pong, barge-in)
- ✅ `test_health_check_cloud_run` (Liveness & readiness probe)
- ✅ `test_remind_medication_tool` (Function Calling: Nhắc thuốc)
- ✅ `test_trigger_sos_alert_tool` (Function Calling: Kích hoạt SOS & Google Cloud TTS)
- ✅ `test_record_mood_tool` (Function Calling: Ghi nhận cảm xúc)
- ✅ `test_tts_service_deterministic` (Google Cloud TTS tất định y tế)
- ✅ `test_rag_service_store_and_search` (text-embedding-005 + Semantic Search)
- ✅ `test_memory_service_extraction` (Gemini 3.8 Flash trích xuất ký ức)

---

## 5. Triển Khai Lên Google Cloud Run (Region asia-southeast1)

Backend Proxy Gateway được thiết kế tương thích hoàn toàn với Google Cloud Run:
- Hỗ trợ timeout WebSocket dài (`--timeout 3600`) cho phiên đàm thoại liên tục.
- Bật tính năng `--session-affinity` để duy trì kết nối WebSocket ổn định.
- Triển khai tại khu vực Đông Nam Á (`asia-southeast1` - Singapore) để giảm thiểu độ trễ đàm thoại cho người dùng tại Việt Nam.

Lệnh deploy tự động:
```bash
chmod +x scripts/deploy-cloudrun.sh
./scripts/deploy-cloudrun.sh
```
Hoặc qua `gcloud`:
```bash
gcloud run deploy annien-backend-gateway \
    --source ./backend \
    --region asia-southeast1 \
    --allow-unauthenticated \
    --timeout 3600 \
    --concurrency 80 \
    --cpu 2 \
    --memory 2Gi \
    --session-affinity
```
