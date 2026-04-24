# Devcontainer 導入設計（spec）

- Date: 2026-04-25
- Status: Approved (brainstorming output)
- Scope: ローカル開発環境のみ。本番デプロイ用コンテナには手を入れない。

## 背景

SpeakPal は backend（FastAPI）と frontend（Next.js）の2サービス構成で、現状は `docker compose up --build` で起動する。dev と prod が同じ Dockerfile を共用しており、`backend/Dockerfile` は `requirements-dev.txt` を本番にも含むなど責務が曖昧。

開発者は Neovim + ターミナル中心で、VS Code は使っていない。superpowers ワークフロー（brainstorming → writing-plans → TDD）で Claude Code を多用する。

このため、ホスト OS 非依存で再現可能な開発環境として devcontainer を導入する。ただし本番コンテナの整理は本 spec のスコープ外。

## 目的（Goals）

- `.devcontainer/` を追加し、`@devcontainers/cli` 経由で単一のコンテナに backend と frontend の両ランタイムを載せる
- `justfile` をリポジトリルートに置き、日常コマンド（backend 起動 / frontend 起動 / test / lint）をエディタ非依存で叩けるようにする
- Claude Code、gh CLI、git をコンテナ内に持ち込み、`docker exec` で入ればすぐ作業が再開できる状態にする
- 既存の `docker-compose.yml` / `backend/Dockerfile` / `frontend/Dockerfile` は改変せず並立させる

## 非目標（Non-goals）

- 本番 Dockerfile の整理（dev-dep 除去、multi-stage、イメージサイズ削減）— 別 RFC
- CI への devcontainer 統合 — 別タスク
- IDE 固有設定（`customizations.vscode` など）— 使わないので入れない
- Windows / macOS での動作検証 — Linux 前提
- 複数人開発を想定した動的な uid 解決 — uid 1000 固定

## アーキテクチャ

単一の devcontainer に以下を同居させる：

- Python 3.12 ランタイム + `backend/requirements-dev.txt`
- Node.js 22 ランタイム + `frontend/` 配下の依存
- `ffmpeg`, `libssl-dev`, `libasound2-dev`, `build-essential`（Azure Speech SDK / webm→wav 変換のため）
- 作業ツール: `zsh`, `tmux`, `git`, `gh`, `just`, `curl`, `ca-certificates`, `locales`
- Claude Code CLI（`@anthropic-ai/claude-code` を npm install -g）

backend と frontend は**別プロセス**としてコンテナ内で動かす。プロセス間通信は `localhost`（同一コンテナ内なので `frontend → http://localhost:8000` でそのまま届く）。

既存の `docker-compose.yml` は本番イメージの動作確認用として残し、dev の主経路にはしない。

## ファイル構成

```
SpeakPal/
├── .devcontainer/
│   ├── devcontainer.json    # 新規
│   └── Dockerfile           # 新規（dev 専用、本番とは独立）
├── justfile                 # 新規
├── docker-compose.yml       # 既存、無変更
├── backend/Dockerfile       # 既存、無変更（本番用）
├── frontend/Dockerfile      # 既存、無変更（本番用）
└── docs/superpowers/specs/
    └── 2026-04-25-devcontainer-design.md    # 本ドキュメント
```

## コンテナの中身

### ベースイメージ

`python:3.12-bookworm`。Microsoft 公式 devcontainer イメージ（`mcr.microsoft.com/devcontainers/python`）は、VS Code を使わず `vscode` ユーザー名も使わない前提では追加価値がほぼ無いため採用しない。素の Python イメージに必要なものを足す方針。

### ユーザー

- ユーザー名: `dev`
- uid / gid: 1000
- sudo 付与（パスワード無し）
- デフォルトシェル: `/bin/zsh`

### apt で入れるパッケージ

| パッケージ | 用途 |
|---|---|
| `ffmpeg` | backend の webm→wav 変換 |
| `libssl-dev`, `libasound2-dev`, `build-essential` | Azure Speech SDK のネイティブ依存 |
| `git`, `curl`, `ca-certificates` | 基本ツール |
| `locales` | UTF-8 ロケール |
| `zsh`, `tmux` | シェル + ペイン管理 |
| `gh` | GitHub CLI（別途 apt リポジトリ追加） |
| `just` | タスクランナー（GitHub リリースの静的バイナリを `/usr/local/bin` に配置。apt に依存しない） |

### devcontainer features

- `ghcr.io/devcontainers/features/node:1`, `version: "22"` — `frontend/Dockerfile` の Node 22 と揃える

### ホストからのマウント

| ホスト側パス | コンテナ内パス | モード | 用途 |
|---|---|---|---|
| `~/.gitconfig` | `/home/dev/.gitconfig` | ro | git author / editor 等の設定引き継ぎ |
| `$SSH_AUTH_SOCK` | コンテナ内 SSH agent socket | ro | git push/pull の SSH 認証 |
| `~/.config/gh` | `/home/dev/.config/gh` | ro | `gh` CLI のトークン引き継ぎ |
| `~/.claude` | `/home/dev/.claude` | rw | Claude Code の履歴・memory 永続化 |
| リポジトリ | `/workspaces/SpeakPal` | rw | デフォルトのワークスペースマウント |

`gh` CLI はホストの `~/.config/gh/hosts.yml` に書かれたトークンをそのまま利用する。コンテナ内で `gh auth login` を再実行する必要は無い。

### postCreateCommand

初回起動時に1度だけ実行：
1. `pip install -r backend/requirements-dev.txt`
2. `npm --prefix frontend install`
3. `npm install -g @anthropic-ai/claude-code`

### 環境変数 / ポート

- `forwardPorts`: `[3000, 8000]`
- `containerEnv`: `SHELL=/bin/zsh`, `LANG=C.UTF-8`
- backend の Azure キー等は `backend/app/main.py` が `load_dotenv()` で `backend/.env` を読み込むため、devcontainer 側での env 注入は不要。`just backend` が `backend/` を CWD として起動することが前提。

## justfile タスク

最低限提供する task：

| task | 内容 |
|---|---|
| `just backend` | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` |
| `just frontend` | `npm --prefix frontend run dev` |
| `just test` | `cd backend && pytest` |
| `just test-file f=<path>` | `cd backend && pytest <path>` |
| `just lint` | `npm --prefix frontend run lint` |
| `just install` | backend / frontend の依存を再インストール |

tmux でペイン分割し、`just backend` と `just frontend` を別ペインで回しながら、残りのペインで Claude Code / neovim / git を使う想定。

## 運用フロー

### 初回セットアップ

```bash
npm install -g @devcontainers/cli
# backend/.env に Azure のキーを書く（既存手順と同じ）
devcontainer up --workspace-folder .
```

### 日常

```bash
devcontainer exec --workspace-folder . zsh
# 中で tmux を起動して pane を分割
#   pane 1: just backend
#   pane 2: just frontend
#   pane 3: claude code / neovim / git
```

### 破棄と再構築

```bash
devcontainer down --workspace-folder .
devcontainer up --workspace-folder .
```

`~/.claude` の履歴と memory はホストに残るため、破棄しても作業コンテキストは失われない。

## CLAUDE.md への追記

既存の「Commands」セクションは**削除せず**、末尾に「devcontainer で開発する場合」のサブセクションを追記する：

- `devcontainer up --workspace-folder .`
- `devcontainer exec --workspace-folder . zsh`
- `just backend` / `just frontend` / `just test` / `just lint`
- 既存の `docker compose ...` コマンドは「本番イメージの動作確認用」と位置付ける注記を添える

## 受け入れ基準

1. `devcontainer up --workspace-folder .` がエラーなく完了する
2. `devcontainer exec --workspace-folder . zsh` でコンテナ内 shell に入れる
3. コンテナ内で `just backend` を叩くと `http://localhost:8000/docs` がホストのブラウザで開ける
4. 別ペインで `just frontend` を叩くと `http://localhost:3000` がホストのブラウザで開ける
5. ブラウザで録音 → 転写 → AI 返信 → 音声再生の golden path が通る
6. `just test` で既存の backend テストが pass する
7. コンテナ内で `git commit` するとホストの `~/.gitconfig` に基づく Author（`Naotchi <n.shiba0101@gmail.com>`）で記録される
8. コンテナ内で `ssh -T git@github.com` が SSH agent 経由で成功し、`gh auth status` もホストのトークンで成功する
9. コンテナ内で `claude` コマンドが起動する
10. `devcontainer down` → `devcontainer up` 後も `~/.claude` の履歴が残っている

## 今後の派生タスク（本 spec の外）

- 本番 Dockerfile 整理 RFC（dev-dep 除去、multi-stage、イメージサイズ削減）
- CI 整備（GitHub Actions から `just test` 相当を起動）
- devcontainer の macOS / Windows 対応検証（必要になった段階で）
