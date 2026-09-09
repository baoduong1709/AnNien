import base64
import math
import struct
from typing import Tuple, Optional


class AudioRelay:
    """
    Audio processing and conversion utility for AnNien real-time pipeline.
    Handles PCM 16kHz 16-bit Mono (Client In) and PCM 24kHz 16-bit Mono (Gemini Out).
    """

    @staticmethod
    def decode_base64_pcm(b64_str: str) -> bytes:
        """Decodes base64 string to raw PCM bytes."""
        return base64.b64decode(b64_str)

    @staticmethod
    def encode_pcm_base64(pcm_bytes: bytes) -> str:
        """Encodes raw PCM bytes to base64 string."""
        return base64.b64encode(pcm_bytes).decode("utf-8")

    @staticmethod
    def calculate_rms(pcm_bytes: bytes) -> float:
        """
        Calculates Root Mean Square (RMS) volume level of 16-bit linear PCM audio.
        Normalized between 0.0 and 1.0.
        """
        count = len(pcm_bytes) // 2
        if count == 0:
            return 0.0

        sum_squares = 0.0
        # Unpack 16-bit signed integers (little-endian)
        for i in range(0, len(pcm_bytes) - 1, 2):
            sample = struct.unpack_from("<h", pcm_bytes, i)[0]
            sum_squares += sample * sample

        rms = math.sqrt(sum_squares / count)
        # Normalize: max 16-bit amplitude is 32768
        return min(1.0, rms / 32768.0)

    @staticmethod
    def is_speech_active(pcm_bytes: bytes, threshold_rms: float = 0.02) -> bool:
        """
        Quick Voice Activity Detection (VAD) check based on RMS threshold.
        Used to detect user barge-in speech while AI is speaking.
        """
        rms = AudioRelay.calculate_rms(pcm_bytes)
        return rms >= threshold_rms

    @staticmethod
    def pcm_to_wav(pcm_bytes: bytes, sample_rate: int = 24000, channels: int = 1) -> bytes:
        """Wraps raw 16-bit PCM bytes with a standard RIFF WAV header."""
        header = bytearray()
        header.extend(b'RIFF')
        header.extend(struct.pack('<I', 36 + len(pcm_bytes)))
        header.extend(b'WAVEfmt ')
        header.extend(struct.pack('<I', 16))
        header.extend(struct.pack('<H', 1))  # PCM
        header.extend(struct.pack('<H', channels))
        header.extend(struct.pack('<I', sample_rate))
        header.extend(struct.pack('<I', sample_rate * channels * 2))
        header.extend(struct.pack('<H', channels * 2))
        header.extend(struct.pack('<H', 16))
        header.extend(b'data')
        header.extend(struct.pack('<I', len(pcm_bytes)))
        return bytes(header + pcm_bytes)

    @staticmethod
    def strip_wav_header(wav_bytes: bytes) -> bytes:
        """
        Strips RIFF WAV header if present and returns raw linear PCM audio bytes.
        If not a WAV file, returns input bytes unchanged.
        """
        if len(wav_bytes) >= 44 and wav_bytes[:4] == b"RIFF" and wav_bytes[8:12] == b"WAVE":
            idx = wav_bytes.find(b"data")
            if idx != -1 and idx + 8 <= len(wav_bytes):
                data_size = struct.unpack("<I", wav_bytes[idx+4:idx+8])[0]
                pcm_data = wav_bytes[idx+8:idx+8+data_size]
                return pcm_data
            return wav_bytes[44:]
        return wav_bytes

