# 0001. backend と frontend を 1 リポジトリ + docker-compose で扱う

- Status: Accepted
- Date: 2026-04-19
- Deciders: naoki

## Context

SpeakPal は 1 つのプロダクトとして「フロント + API」をセットで開発する。個人開発フェーズで、デプロイ先も未定。API 契約 (`/api/chat` のレスポンス形式) はフロントとバックで同時に変わることが多い。

## Decision

`backend/` と `frontend/` を同一リポジトリに置き、ローカル開発は `docker-compose.yml` で両サービスをまとめて立ち上げる構成にする。

## Consequences

- Pros
  - API 契約の変更をフロント/バック同一 PR でレビューできる
  - 初期セットアップが `docker compose up` 1 コマンドで済む
  - ドキュメント (ADR 含む) を 1 箇所に集約できる
- Cons / Trade-offs
  - CI の最適化 (片方だけ変更時に片方だけビルド) はやや手間
  - リポジトリが大きくなるほど、将来の分割コストが増える
- 波及する仕事
  - デプロイ時に「片方だけ本番へ」のようなニーズが出たら再検討

## Alternatives Considered

### Option A: リポジトリを分ける (speakpal-backend / speakpal-frontend)

- チーム開発・独立デプロイには向く
- 今はそのニーズがない。契約変更時の同期コストの方が高い。

### Option B: Nx / Turborepo などのモノレポツール導入

- 規模が小さく、依存関係もない (Python と Node で言語も違う) のでオーバースペック
- 必要になったら ADR を起こして導入

## References

- `docker-compose.yml`
