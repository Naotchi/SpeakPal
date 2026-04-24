import logging
import os
import subprocess

import httpx

logger = logging.getLogger(__name__)


def _convert_to_wav(audio_bytes: bytes) -> bytes:
    """Convert audio bytes to 16kHz mono WAV using ffmpeg."""
    result = subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", "pipe:0",
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            "pipe:1",
        ],
        input=audio_bytes,
        capture_output=True,
    )
    if result.returncode != 0:
        raise ValueError(f"音声の変換に失敗しました: {result.stderr.decode()}")
    return result.stdout


async def transcribe(
    audio_bytes: bytes,
    content_type: str = "audio/webm; codecs=opus",
    language: str = "en-US",
) -> str:
    """Transcribe audio bytes to text using Azure Speech-to-Text REST API."""
    speech_key = os.environ["AZURE_SPEECH_KEY"]
    speech_region = os.environ["AZURE_SPEECH_REGION"]

    url = (
        f"https://{speech_region}.stt.speech.microsoft.com"
        "/speech/recognition/conversation/cognitiveservices/v1"
        f"?language={language}"
    )

    logger.info(f"STT request: audio_size={len(audio_bytes)} bytes, content_type={content_type!r}")

    wav_bytes = _convert_to_wav(audio_bytes)
    logger.info(f"Converted to WAV: {len(wav_bytes)} bytes")

    headers = {
        "Ocp-Apim-Subscription-Key": speech_key,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            content=wav_bytes,
            timeout=30.0,
        )
        response.raise_for_status()

    result = response.json()
    logger.info(f"STT response: {result}")

    status = result.get("RecognitionStatus", "Unknown")
    if status != "Success":
        raise ValueError(f"音声認識に失敗しました: {status}")

    display_text = result.get("DisplayText", "")
    if not display_text:
        raise ValueError("音声を認識できませんでした。はっきりと話してからもう一度お試しください。")

    return display_text
