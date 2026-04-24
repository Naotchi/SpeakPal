# 0005. 会話生成は Azure OpenAI Chat Completions

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

英会話の相手を務める LLM が必要。要件:

- 英語の自然な会話応答ができる
- レイテンシが対話用途に耐える
- Azure Speech と同じテナントに寄せたい (ADR 0004)

## Decision

Azure OpenAI の Chat Completions を `openai` Python SDK (`AzureOpenAI` クラス) 経由で呼ぶ。デプロイ名は `AZURE_OPENAI_DEPLOYMENT` 環境変数で切り替え可能にし、初期値は `gpt-4o` を想定。

System prompt は `services/conversation.py` にハードコードしているが、短く固定的なので当面これで十分。

## Consequences

- Pros
  - Azure 上で他サービス (Speech) と鍵管理・課金を統一できる
  - `openai` SDK は公式でメンテが継続しており、API 変更にも追随しやすい
  - デプロイ名を切り替えるだけでモデルを差し替えられる
- Cons / Trade-offs
  - SDK の呼び出しは同期 (`client.chat.completions.create`)。`asyncio.to_thread` で逃がす必要がある
  - 会話履歴は現在渡していない (単発応答)。複数ターン文脈を考慮するには呼び出し側の拡張が必要
  - system prompt を変えたくなった時にコード変更 + デプロイが要る (将来は設定化)
- 波及する仕事
  - 多ターン文脈対応
  - プロンプトの外出し (YAML/DB) を行う場合は ADR を起こす

## Alternatives Considered

### Option A: OpenAI 直接 API

- Azure ではなく openai.com の API
- Azure Speech と鍵管理が分かれるのと、個人開発の文脈で Azure クレジットを使いたい

### Option B: Anthropic Claude

- 英語品質は非常に高い
- Azure に寄せる方針と衝突する
- 将来的にマルチプロバイダにする場合は抽象化層を入れて再検討

### Option C: ローカル LLM (Llama 系)

- コストゼロだが、レイテンシ/品質/運用負荷で初期向きでない

## References

- `backend/app/services/conversation.py`
