import os

from openai import AzureOpenAI

SYSTEM_PROMPT = (
    "You translate Japanese into natural, conversational English suitable for "
    "a language learner to say out loud in a real conversation. "
    "Output ONLY the English translation — no quotes, no explanations, no alternatives, "
    "no romaji, no prefixes like 'English:'. "
    "Keep it concise and match the register (casual/polite) of the Japanese input. "
    "If conversation history is provided, make the translation flow naturally as a next turn."
)

_client: AzureOpenAI | None = None


def _get_client() -> AzureOpenAI:
    global _client
    if _client is None:
        _client = AzureOpenAI(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        )
    return _client


def translate_to_english(
    japanese_text: str,
    history: list[dict[str, str]] | None = None,
) -> str:
    """Translate Japanese text to natural conversational English."""
    client = _get_client()
    deployment = os.environ["AZURE_OPENAI_DEPLOYMENT"]

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        context = "\n".join(
            f"{m.get('role', '')}: {m.get('content', '')}" for m in history[-6:]
        )
        messages.append({
            "role": "system",
            "content": f"Recent conversation for context:\n{context}",
        })
    messages.append({
        "role": "user",
        "content": f"Translate this Japanese into natural English:\n{japanese_text}",
    })

    completion = client.chat.completions.create(
        model=deployment,
        messages=messages,
        max_completion_tokens=200,
        temperature=0.4,
    )

    return (completion.choices[0].message.content or "").strip()
