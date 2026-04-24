import asyncio
import base64
import json
import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.services.conversation import generate_response, stream_response
from app.services.speech_to_text import transcribe
from app.services.text_to_speech import synthesize
from app.services.translate import translate_to_english

router = APIRouter()

_SENT_RE = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')


def _split_sentences(buf: str) -> tuple[list[str], str]:
    sentences, last = [], 0
    for m in _SENT_RE.finditer(buf):
        candidate = buf[last:m.start() + 1].strip()
        if len(candidate) >= 10:
            sentences.append(candidate)
            last = m.end()
    return sentences, buf[last:]


def _sse(event: str, data: str) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/api/chat")
async def chat(
    audio: UploadFile = File(...),
    history: str = Form(""),
    persona: str = Form(""),
):
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="音声ファイルが空です")

    history_msgs = json.loads(history) if history else []

    # 1. Speech-to-Text
    try:
        user_text = await transcribe(audio_bytes, content_type=audio.content_type or "audio/webm; codecs=opus")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 2. Generate AI response (sync call, run in thread pool)
    ai_reply, ai_correction = await asyncio.to_thread(
        generate_response, user_text, history_msgs, persona or None
    )

    # 3. Text-to-Speech only for the conversational reply (sync call, run in thread pool)
    ai_audio = await asyncio.to_thread(synthesize, ai_reply)

    return {
        "user_text": user_text,
        "ai_text": ai_reply,
        "ai_feedback": ai_correction,
        "ai_audio_base64": base64.b64encode(ai_audio).decode(),
    }


@router.post("/api/chat/stream")
async def chat_stream(
    audio: UploadFile = File(...),
    history: str = Form(""),
    persona: str = Form(""),
):
    audio_bytes = await audio.read()
    content_type = audio.content_type or "audio/webm; codecs=opus"

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="音声ファイルが空です")

    history_msgs = json.loads(history) if history else []

    async def generate():
        try:
            try:
                user_text = await transcribe(audio_bytes, content_type=content_type)
            except ValueError as e:
                yield _sse("error", str(e))
                return

            yield _sse("user_text", user_text)

            tts_queue: asyncio.Queue = asyncio.Queue()
            sse_queue: asyncio.Queue = asyncio.Queue()

            async def llm_and_enqueue():
                sentence_buf = ""
                try:
                    async for event_type, value in stream_response(user_text, history_msgs, persona or None):
                        if event_type == "chunk":
                            await sse_queue.put(_sse("ai_chunk", value))
                            sentence_buf += value
                            sentences, sentence_buf = _split_sentences(sentence_buf)
                            for s in sentences:
                                task = asyncio.create_task(asyncio.to_thread(synthesize, s))
                                await tts_queue.put(task)
                        elif event_type == "feedback":
                            await sse_queue.put(_sse("ai_feedback", value or ""))
                    remainder = sentence_buf.strip()
                    if remainder:
                        task = asyncio.create_task(asyncio.to_thread(synthesize, remainder))
                        await tts_queue.put(task)
                finally:
                    await tts_queue.put(None)

            async def consume_tts():
                try:
                    while True:
                        item = await tts_queue.get()
                        if item is None:
                            break
                        audio_bytes_chunk = await item
                        await sse_queue.put(
                            _sse("ai_audio_chunk", base64.b64encode(audio_bytes_chunk).decode())
                        )
                finally:
                    await sse_queue.put(_sse("done", ""))
                    await sse_queue.put(None)

            producer_task = asyncio.create_task(llm_and_enqueue())
            consumer_task = asyncio.create_task(consume_tts())

            while True:
                item = await sse_queue.get()
                if item is None:
                    break
                yield item

            await producer_task
            await consumer_task

        except Exception as e:
            yield _sse("error", str(e))

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/api/translate")
async def translate(audio: UploadFile = File(...), history: str = Form("")):
    audio_bytes = await audio.read()

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="音声ファイルが空です")

    history_msgs = json.loads(history) if history else []

    try:
        japanese_text = await transcribe(
            audio_bytes,
            content_type=audio.content_type or "audio/webm; codecs=opus",
            language="ja-JP",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    english_text = await asyncio.to_thread(translate_to_english, japanese_text, history_msgs)
    english_audio = await asyncio.to_thread(synthesize, english_text)

    return {
        "japanese_text": japanese_text,
        "english_text": english_text,
        "english_audio_base64": base64.b64encode(english_audio).decode(),
    }
