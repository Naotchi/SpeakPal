# SpeakPal

話したいことを英語で表現するトレーニングアプリ。

## なぜ作っているか

英語学習者の多くは、文法や単語の知識があっても「自分の言いたいことを英語で表現する」段階でつまずく。SpeakPal はこのギャップ — **日本語で浮かんだことを英語化するプロセス** — を埋めるためのトレーニングツール。単なる英会話練習や文法学習ツールではなく、伝えたいことを英語で出す力を鍛えることをコアバリューに置いている。

## 何ができるか

- ブラウザのマイクで英語音声を録音
- Azure Speech-to-Text で文字起こし
- Azure OpenAI (Chat Completions) が英語で応答
- Azure Speech-to-Text (SDK) が応答を音声合成して再生

往復1ターンのみ。会話履歴はブラウザのメモリにだけ存在し、リロードで消える。

## 技術スタック概略

- **フロントエンド**: Next.js 15 (App Router) / React 19 / TypeScript / Tailwind CSS v4
- **バックエンド**: FastAPI / Python 3.12 / Uvicorn
- **外部サービス**: Azure Speech (STT/TTS) / Azure OpenAI
- **開発環境**: Docker Compose (backend + frontend の 2 サービス)

採用理由やバージョンの詳細は [docs/tech-stack.md](./docs/tech-stack.md) と [docs/adr/](./docs/adr/) を参照。

## クイックスタート

前提: Docker / Docker Compose、Azure Speech と Azure OpenAI のキー、マイクが使えるブラウザ (Chrome/Edge 推奨)。

```bash
cp backend/.env.example backend/.env
# backend/.env を編集し、Azure のキー類を入れる

cp frontend/.env.local.example frontend/.env.local
# 必要なら NEXT_PUBLIC_API_URL を書き換える

docker compose up --build
```

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:8000 (ヘルスチェック: `/health`)

セットアップの詳細・よく使うコマンド・シークレット取り扱いは [docs/development.md](./docs/development.md) を参照。

## ドキュメント

設計・実装に関するドキュメントは `docs/` 配下にある。種類別の役割と運用方針は [docs/README.md](./docs/README.md) を参照。

| ドキュメント | 内容 |
| --- | --- |
| [docs/README.md](./docs/README.md) | docs 全体のインデックスと種類別の運用方針 |
| [docs/architecture.md](./docs/architecture.md) | システム全体のアーキテクチャとコンポーネント責務 |
| [docs/tech-stack.md](./docs/tech-stack.md) | 採用している技術スタックとバージョン |
| [docs/directory-structure.md](./docs/directory-structure.md) | リポジトリのディレクトリ構成と配置ルール |
| [docs/data-flow.md](./docs/data-flow.md) | 音声入力から音声応答までのシーケンス |
| [docs/development.md](./docs/development.md) | 開発環境のセットアップと日々の作業手順 |
| [docs/rfcs/](./docs/rfcs/) | Request for Comments (新機能の提案と実装計画) |
| [docs/adr/](./docs/adr/) | Architecture Decision Records (設計判断の履歴) |

### ドキュメント運用方針

- **コードから読み取れることは書かない**: ファイル名、関数名、行数などのように `git` で追える情報は書かない。ドキュメントは「なぜそうなっているか」「どう変えるべきか」を書く場所。
- **設計判断は必ず ADR に残す**: ライブラリ選定、API 設計、インフラ選定などの一度決めたら影響範囲が大きい判断は、ADR に背景と代替案まで含めて記録する。
- **コードと一緒に更新する**: 技術スタックやアーキテクチャに変更が入った PR では、対応する docs の更新も同じ PR に含める。

## ステータス

ローカル/検証段階。以下は未実装 — 外部公開する前に ADR を起こして設計する:

- 認証
- レート制御・コスト監視 (Azure 課金に直結)
- 会話履歴の永続化 (現状はブラウザメモリのみ)
- 自動テスト (backend の pytest は導入済み、frontend / CI は未)
- 本番デプロイ先

CORS は `http://localhost:3000` のみ許可。
