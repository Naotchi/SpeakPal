# 0006. 録音は webm/opus、サーバで WAV 変換

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

ブラウザ側で音声を録音してバックエンドに送る必要がある。選択肢:

- コーデック: webm/opus, ogg/opus, mp4/aac, WAV …
- 変換: クライアントで変換するか、サーバで変換するか

制約:

- Azure Speech-to-Text REST API は WAV (PCM) 入力を想定しており、opus を直接は受け付けない
- `MediaRecorder` が安定して対応しているコーデックは Chrome/Edge で webm/opus、Safari で mp4/aac (記事執筆時点)

## Decision

- クライアントは `MediaRecorder` で `audio/webm;codecs=opus` を使って録音する (未対応なら `audio/webm` にフォールバック)
- バックエンドが `ffmpeg` で 16kHz mono PCM WAV に変換してから Azure STT に送る

## Consequences

- Pros
  - webm/opus は圧縮効率が高く、ネットワーク転送量を抑えられる
  - 変換ロジックをサーバに集約できるのでクライアントが単純になる
  - ffmpeg はデファクト標準で、入力形式が変わっても対応しやすい
- Cons / Trade-offs
  - バックエンドコンテナに `ffmpeg` を入れる必要がある (Dockerfile で対応済み)
  - 変換分だけレイテンシが増える (数十〜百 ms オーダー)
  - Safari 対応時は MediaRecorder のコーデック分岐を見直す必要がある
- 波及する仕事
  - Safari 対応時のテストと (必要なら) 録音コーデックの分岐追加
  - ffmpeg 依存の脆弱性アップデート追従

## Alternatives Considered

### Option A: クライアントで WAV 変換 (Web Audio API)

- サーバに ffmpeg を持たなくて済む
- クライアント側の実装コストと CPU 負荷が大きい
- ブラウザごとの差異を吸収するのが手間

### Option B: Azure Speech-to-Text SDK (クライアント)

- コーデック変換の問題はそもそも起きない
- Speech キーをクライアントに露出するのは避けたい
- サーバ経由で鍵を守る設計と衝突する

### Option C: 別の STT サービスで opus を直接受け付けるものを使う

- ADR 0004 の Azure Speech 採用方針と衝突

## References

- `backend/app/services/speech_to_text.py` (`_convert_to_wav`)
- `frontend/src/hooks/useAudioRecorder.ts`
