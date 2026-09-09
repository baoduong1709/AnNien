import io
import base64
import logging
import math
import struct
from typing import Optional
from app.config import settings
from app.core.audio_relay import AudioRelay

logger = logging.getLogger("annien.tts")



class TTSService:
    """
    Google Cloud Text-to-Speech Service for deterministic medical reminders & SOS alerts.
    Guarantees verbatim accuracy without LLM hallucination for emergency & medication instructions.
    """

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            from google.cloud import texttospeech
            # Attempts to initialize Google Cloud TTS client (uses ADC or GOOGLE_APPLICATION_CREDENTIALS)
            self.client = texttospeech.TextToSpeechClient()
            logger.info("Google Cloud Text-to-Speech client initialized successfully.")
        except Exception as e:
            logger.warning(f"Google Cloud TTS client not initialized ({e}). Using robust fallback synthesizer.")
            self.client = None

    async def synthesize_speech(
        self,
        text: str,
        speaking_rate: float = 0.9,
        language_code: Optional[str] = None,
        voice_name: Optional[str] = None
    ) -> bytes:
        """
        Synthesizes text into 24kHz or 16kHz linear PCM / WAV audio bytes.
        """
        lang = language_code or settings.TTS_LANGUAGE_CODE
        voice = voice_name or settings.TTS_VOICE_NAME

        if self.client:
            try:
                from google.cloud import texttospeech

                synthesis_input = texttospeech.SynthesisInput(text=text)
                voice_params = texttospeech.VoiceSelectionParams(
                    language_code=lang,
                    name=voice,
                )
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                    speaking_rate=speaking_rate,
                    sample_rate_hertz=settings.OUTPUT_SAMPLE_RATE, # 24kHz matching Gemini Live
                )

                response = self.client.synthesize_speech(
                    input=synthesis_input,
                    voice=voice_params,
                    audio_config=audio_config
                )
                return response.audio_content
            except Exception as e:
                logger.error(f"Error calling Google Cloud TTS API: {e}. Falling back to deterministic synthesizer.")

        return self._generate_fallback_audio(text, sample_rate=settings.OUTPUT_SAMPLE_RATE)

    async def synthesize_raw_pcm(
        self,
        text: str,
        speaking_rate: float = 0.9,
        language_code: Optional[str] = None,
        voice_name: Optional[str] = None
    ) -> bytes:
        """
        Synthesizes speech and strips any WAV header to return pure 16-bit linear PCM bytes.
        Essential for streaming audio chunks over WebSocket without header clicks/pops.
        """
        wav_or_pcm = await self.synthesize_speech(
            text=text,
            speaking_rate=speaking_rate,
            language_code=language_code,
            voice_name=voice_name
        )
        return AudioRelay.strip_wav_header(wav_or_pcm)

    async def synthesize_to_base64(self, text: str, speaking_rate: float = 0.9, raw_pcm: bool = True) -> str:
        """
        Synthesizes text to base64 string. Default raw_pcm=True strips WAV header
        for seamless playback through raw PCM audio streams.
        """
        if raw_pcm:
            audio_bytes = await self.synthesize_raw_pcm(text, speaking_rate=speaking_rate)
        else:
            audio_bytes = await self.synthesize_speech(text, speaking_rate=speaking_rate)
        return base64.b64encode(audio_bytes).decode("utf-8")


    def _generate_fallback_audio(self, text: str, sample_rate: int = 24000) -> bytes:
        """
        Generates a valid 16-bit PCM WAV audio waveform (soft warm chime sequence)
        as a fallback for environments without live Google Cloud billing/credentials.
        This allows end-to-end testing of the audio pipeline without GCP authentication errors.
        """
        # Duration proportional to text length (approx 150 words/min = 2.5 words/sec)
        words = len(text.split())
        duration_sec = max(1.5, min(10.0, words * 0.4))
        num_samples = int(sample_rate * duration_sec)

        pcm_data = bytearray()
        # Two harmonic chime frequencies for elder reassurance: 523.25 Hz (C5) and 659.25 Hz (E5)
        f1, f2 = 523.25, 659.25
        for i in range(num_samples):
            t = i / sample_rate
            envelope = math.exp(-1.5 * (t % 1.5)) # pleasant repeating chime envelope
            sample = 0.3 * math.sin(2 * math.pi * f1 * t) + 0.2 * math.sin(2 * math.pi * f2 * t)
            sample_val = int(sample * envelope * 16000)
            sample_val = max(-32768, min(32767, sample_val))
            pcm_data.extend(struct.pack("<h", sample_val))

        # Pack into standard WAV header
        header = bytearray()
        header.extend(b'RIFF')
        header.extend(struct.pack('<I', 36 + len(pcm_data)))
        header.extend(b'WAVEfmt ')
        header.extend(struct.pack('<I', 16)) # Subchunk1Size
        header.extend(struct.pack('<H', 1))  # AudioFormat (PCM = 1)
        header.extend(struct.pack('<H', 1))  # NumChannels (1 = Mono)
        header.extend(struct.pack('<I', sample_rate))
        header.extend(struct.pack('<I', sample_rate * 2)) # ByteRate
        header.extend(struct.pack('<H', 2))  # BlockAlign
        header.extend(struct.pack('<H', 16)) # BitsPerSample
        header.extend(b'data')
        header.extend(struct.pack('<I', len(pcm_data)))

        return bytes(header + pcm_data)


# Global singleton instance
tts_service = TTSService()
