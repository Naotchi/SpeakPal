import json
import os
import re
from collections.abc import AsyncIterator

from openai import AsyncAzureOpenAI, AzureOpenAI

DEFAULT_PERSONA = (
    "You are Emma, a friendly American woman in your late 20s. "
    "You speak casually and warmly, like chatting with a close friend. "
    "Keep replies short (1-3 sentences) and natural."
)

JSON_FORMAT_INSTRUCTIONS = (
    "You also act as a language tutor. "
    "You MUST respond with a JSON object only — no prose, no markdown, no code fences. "
    'The JSON must have exactly two keys:\n'
    '  "reply": A purely conversational response. '
    'NEVER include grammar corrections, alternative phrasings, or phrases like '
    '"you could say", "a better way", "you might want to say" in this field. '
    'Just continue the conversation naturally.\n'
    '  "correction": Provide a brief full-sentence rewrite when EITHER '
    '(a) the user made a grammar or vocabulary mistake, OR '
    '(b) their sentence is grammatically correct but sounds unnatural or translation-like '
    '(e.g., direct Japanese-to-English phrasing a native speaker would not use). '
    'Rewrite into the most natural form a native speaker would say, '
    'addressing the primary structural issue rather than patching individual words. '
    'Example: \'"Stood out means." → "What does \\"stood out\\" mean?"\'. '
    'If the user\'s English is already natural, set this to null.'
)

STREAM_FORMAT_INSTRUCTIONS = (
    "You also act as a language tutor. "
    "First, write a purely conversational response. "
    "NEVER include grammar corrections, alternative phrasings, or phrases like "
    "'you could say', 'a better way', 'you might want to say' in this part. "
    "Just continue the conversation naturally.\n"
    "Then output the exact line: ---END---\n"
    "Then on the next line, provide a brief full-sentence rewrite when EITHER "
    "(a) the user made a grammar or vocabulary mistake, OR "
    "(b) their sentence is grammatically correct but sounds unnatural or translation-like "
    "(e.g., direct Japanese-to-English phrasing a native speaker would not use). "
    "Rewrite into the most natural form a native speaker would say, "
    "addressing the primary structural issue rather than patching individual words. "
    "Example: '\"Stood out means.\" → \"What does \\\"stood out\\\" mean?\"'. "
    "If the user's English is already natural, output the word: null"
)

_SEPARATOR = "---END---"
_LOOKAHEAD = len(_SEPARATOR) - 1

_client: AzureOpenAI | None = None
_async_client: AsyncAzureOpenAI | None = None


def _build_system_prompt(persona: str | None, format_block: str) -> str:
    text = (persona or "").strip() or DEFAULT_PERSONA
    return f"{text}\n\n{format_block}"


def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        )
    return _client


def _get_async_client() -> AsyncAzureOpenAI:
    global _async_client
    if _async_client is None:
        _async_client = AsyncAzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        )
    return _async_client


def _parse_response(raw: str) -> tuple[str, str | None]:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.MULTILINE).strip()
    try:
        data = json.loads(text)
        reply = str(data.get("reply") or "").strip()
        correction_raw = data.get("correction")
        correction = str(correction_raw).strip() if correction_raw else None
        return reply or raw, correction
    except (json.JSONDecodeError, AttributeError):
        return raw, None


async def stream_response(
    user_text: str,
    history: list[dict[str, str]] | None = None,
    persona: str | None = None,
) -> AsyncIterator[tuple[str, str | None]]:
    """Stream reply tokens and yield a final feedback event."""
    client = _get_async_client()
    deployment = os.environ["AZURE_OPENAI_DEPLOYMENT"]

    system_prompt = _build_system_prompt(persona, STREAM_FORMAT_INSTRUCTIONS)
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-20:])
    messages.append({"role": "user", "content": user_text})

    stream = await client.chat.completions.create(
        model=deployment,
        messages=messages,
        max_completion_tokens=300,
        temperature=0.8,
        stream=True,
    )

    accumulated = ""
    separator_found = False

    async for chunk in stream:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta is None:
            continue

        accumulated += delta

        if not separator_found:
            sep_idx = accumulated.find(_SEPARATOR)
            if sep_idx != -1:
                separator_found = True
                safe = accumulated[:sep_idx]
                if safe:
                    yield ("chunk", safe)
                accumulated = accumulated[sep_idx + len(_SEPARATOR):]
            else:
                safe_end = max(0, len(accumulated) - _LOOKAHEAD)
                if safe_end > 0:
                    yield ("chunk", accumulated[:safe_end])
                    accumulated = accumulated[safe_end:]

    if not separator_found:
        if accumulated:
            yield ("chunk", accumulated)
        yield ("feedback", None)
    else:
        correction = accumulated.strip()
        yield ("feedback", correction if correction and correction.lower() != "null" else None)


def generate_response(
    user_text: str,
    history: list[dict[str, str]] | None = None,
    persona: str | None = None,
) -> tuple[str, str | None]:
    """Generate a conversational response and optional grammar correction."""
    client = _get_client()
    deployment = os.environ["AZURE_OPENAI_DEPLOYMENT"]

    system_prompt = _build_system_prompt(persona, JSON_FORMAT_INSTRUCTIONS)
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history[-20:])
    messages.append({"role": "user", "content": user_text})

    completion = client.chat.completions.create(
        model=deployment,
        messages=messages,
        max_completion_tokens=300,
        temperature=0.8,
    )

    return _parse_response(completion.choices[0].message.content or "")
