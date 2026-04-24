# 0004. 音声認識/合成に Azure Speech を採用

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

英会話練習アプリとして、音声認識 (STT) と音声合成 (TTS) が必須。要件は:

- 英語が高精度で認識できること
- 自然な英語音声を返せること (フィードバック体験の質に直結)
- Azure OpenAI を LLM に使う前提なので、できれば同じ Azure テナントに寄せたい (課金・キー管理の統一)

## Decision

Azure Cognitive Services Speech (STT / TTS) を採用する。

- **STT**: REST API を `httpx` 経由で直接呼ぶ
- **TTS**: `azure-cognitiveservices-speech` SDK (Python) を使う
- 音声は `en-US-JennyNeural` 固定 (最初は 1 声で十分、後で切り替え機構を足す)

## Consequences

- Pros
  - Azure OpenAI と認証基盤/課金を統一できる
  - Neural Voice の品質が十分高い
  - 言語指定 (`en-US`) でロケールを固定できる
- Cons / Trade-offs
  - STT SDK (Python) はストリーミング前提で REST よりコード量が増えるため、今回は REST を直接叩いている。将来ストリーミング対応するときは SDK へ寄せる可能性あり
  - TTS SDK は同期 API。`asyncio.to_thread` で逃がす必要がある
  - Azure 依存が強まり、他クラウドへの移行時は書き換えが発生する
- 波及する仕事
  - コスト監視を入れる (本番公開前)
  - 多言語対応するときは voice / language を設定化

## Alternatives Considered

### Option A: OpenAI Whisper (STT) + OpenAI TTS

- Azure OpenAI に TTS が増えれば統一できる
- 現時点で Azure Speech の方が Neural Voice の選択肢が豊富
- 将来的に切り替える可能性は残す

### Option B: Google Cloud Speech-to-Text / Text-to-Speech

- 品質は同等レベル
- Azure OpenAI と別テナントになり、鍵管理が二重化する

### Option C: ローカル推論 (whisper.cpp / Coqui TTS)

- ランニングコストゼロだが、レイテンシと品質、運用負荷で個人開発の最初期には不向き

## References

- `backend/app/services/speech_to_text.py`
- `backend/app/services/text_to_speech.py`
