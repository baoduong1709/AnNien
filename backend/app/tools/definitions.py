from typing import List, Dict, Any

# Gemini Function Declarations for Gemini Multimodal Live API
GEMINI_TOOL_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "name": "remind_medication",
        "description": "Đặt lịch nhắc người cao tuổi uống thuốc đúng giờ, đúng liều lượng theo chỉ định y tế.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "medicine_name": {
                    "type": "STRING",
                    "description": "Tên loại thuốc hoặc đơn thuốc cụ nhắc đến (ví dụ: Amlodipin, thuốc huyết áp, vitamin...)"
                },
                "time_str": {
                    "type": "STRING",
                    "description": "Thời điểm cần uống thuốc (ví dụ: '08:00', '19:30', 'sau bữa trưa', 'trước khi đi ngủ')"
                },
                "dosage": {
                    "type": "STRING",
                    "description": "Liều lượng uống cụ thể (ví dụ: 1 viên, 2 viên, nửa viên...)"
                },
                "note": {
                    "type": "STRING",
                    "description": "Lưu ý y tế quan trọng (ví dụ: uống với nước ấm, uống sau ăn no 30 phút)"
                }
            },
            "required": ["medicine_name", "time_str"]
        }
    },
    {
        "name": "trigger_sos_alert",
        "description": "KÍCH HOẠT KHẨN CẤP SOS ngay lập tức khi phát hiện người già té ngã, đau ngực, khó thở, tai biến, hoặc có tín hiệu kêu cứu.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "severity": {
                    "type": "STRING",
                    "enum": ["CRITICAL", "HIGH", "MEDIUM"],
                    "description": "Mức độ nghiêm trọng: CRITICAL (đe dọa tính mạng/té ngã), HIGH (đau mệt nhiều), MEDIUM (cần người nhà qua hỗ trợ)"
                },
                "reason": {
                    "type": "STRING",
                    "description": "Mô tả cụ thể triệu chứng hoặc tình trạng khẩn cấp của cụ"
                },
                "location": {
                    "type": "STRING",
                    "description": "Vị trí của cụ trong nhà nếu xác định được (ví dụ: phòng khách, phòng tắm, cầu thang...)"
                }
            },
            "required": ["severity", "reason"]
        }
    },
    {
        "name": "record_mood",
        "description": "Ghi nhận trạng thái tâm lý, cảm xúc và tâm sự của cụ vào nhật ký an sinh để theo dõi sức khỏe tinh thần.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "sentiment": {
                    "type": "STRING",
                    "enum": ["POSITIVE", "NEUTRAL", "NEGATIVE", "ANXIOUS", "TIRED"],
                    "description": "Tâm trạng bao quát của cụ"
                },
                "emotion": {
                    "type": "STRING",
                    "description": "Cảm xúc chi tiết (ví dụ: vui vẻ khi cháu gọi điện, nhớ quê, lo lắng bệnh tim, mệt mỏi khó ngủ...)"
                },
                "notes": {
                    "type": "STRING",
                    "description": "Tóm tắt lời chia sẻ hoặc bối cảnh cảm xúc của cụ"
                }
            },
            "required": ["sentiment", "emotion", "notes"]
        }
    }
]
