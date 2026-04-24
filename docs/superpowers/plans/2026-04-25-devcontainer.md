# Devcontainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SpeakPal に `.devcontainer/`（`Dockerfile` + `devcontainer.json`）と `justfile` を追加し、`@devcontainers/cli` で起動できる全部入り dev 環境を作る。既存の `docker-compose.yml` と本番用 `Dockerfile` は一切改変しない。

**Architecture:** `python:3.12-bookworm` をベースに、apt で ffmpeg / 開発ツールを追加、devcontainer feature で Node 22 を追加、`postCreateCommand` で backend / frontend の依存と Claude Code をインストール。ホストの `~/.gitconfig` / SSH agent / `~/.config/gh` / `~/.claude` をマウントして認証を引き継ぐ。

**Tech Stack:** Docker, devcontainer spec, `@devcontainers/cli`, just, zsh, Python 3.12, Node 22, Azure Speech SDK のネイティブ依存（ffmpeg / libssl / libasound2）

**Spec:** `docs/superpowers/specs/2026-04-25-devcontainer-design.md`

---

## 前提（実行者がホスト側で済ませておくこと）

- `@devcontainers/cli` がホストに入っていること。未導入なら `npm install -g @devcontainers/cli` を先に実行
- ホストに `~/.gitconfig`、`~/.config/gh/hosts.yml`、`~/.claude/` が存在すること
- ホストで `SSH_AUTH_SOCK` が設定されていること（`ssh-add -l` で確認可能）
- `backend/.env` が存在し、Azure のキー等が設定済みであること（既存手順と同じ）

これらが無い場合はその場で用意してから先に進む。

---

## File Structure

**Create:**
- `.devcontainer/Dockerfile` — Python + システムツール + dev ユーザー + zsh/tmux/gh/just
- `.devcontainer/devcontainer.json` — features / mounts / postCreateCommand / forwardPorts
- `justfile` — backend / frontend / test / lint / install タスク

**Modify:**
- `CLAUDE.md` — 末尾に「Devcontainer での開発」セクションを追記（既存の Commands セクションは残す）

**Do NOT touch:**
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

---

## Task 1: 最小の Dockerfile と devcontainer.json を作成し、ビルドが通ることを確認

**Files:**
- Create: `.devcontainer/Dockerfile`
- Create: `.devcontainer/devcontainer.json`

このタスクのゴール：`devcontainer build` が成功し、コンテナに `dev` ユーザーで入って `zsh` が起動する最小状態を作る。Node / backend deps / 認証マウントは後続タスクで追加する。

- [ ] **Step 1.1: Dockerfile を作成**

`.devcontainer/Dockerfile`:
```dockerfile
FROM python:3.12-bookworm

ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000

# System packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        libssl-dev \
        libasound2-dev \
        build-essential \
        git \
        curl \
        ca-certificates \
        locales \
        zsh \
        tmux \
        sudo \
        openssh-client \
        gnupg && \
    rm -rf /var/lib/apt/lists/*

# Locale
RUN sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen && \
    locale-gen

# GitHub CLI (official apt repo)
RUN mkdir -p -m 755 /etc/apt/keyrings && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
        | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*

# just (static binary)
RUN curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh \
    | bash -s -- --to /usr/local/bin

# Create dev user
RUN groupadd --gid ${USER_GID} ${USERNAME} && \
    useradd --uid ${USER_UID} --gid ${USER_GID} --shell /bin/zsh --create-home ${USERNAME} && \
    echo "${USERNAME} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USERNAME} && \
    chmod 0440 /etc/sudoers.d/${USERNAME}

USER ${USERNAME}
WORKDIR /workspaces/SpeakPal

ENV SHELL=/bin/zsh
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
```

- [ ] **Step 1.2: 最小の devcontainer.json を作成**

`.devcontainer/devcontainer.json`:
```json
{
    "name": "SpeakPal dev",
    "build": {
        "dockerfile": "Dockerfile"
    },
    "remoteUser": "dev",
    "workspaceFolder": "/workspaces/SpeakPal"
}
```

- [ ] **Step 1.3: ビルドが失敗することを確認（before 状態）**

Run: `devcontainer up --workspace-folder . 2>&1 | tail -5`
Expected: 現時点ではまだ書いただけなので、このステップは Step 1.1/1.2 の**前**に実行して存在しないことを確かめるものとしても良い。スキップして 1.4 に進んでよい。

- [ ] **Step 1.4: `devcontainer up` を実行して成功を確認**

Run: `devcontainer up --workspace-folder .`
Expected: 最後に `"outcome": "success"` を含む JSON が出力される。初回は image ビルドに数分かかる。

- [ ] **Step 1.5: 中に入って基本ツールを検証**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'whoami && id && which zsh tmux git gh just ffmpeg python'
```
Expected:
```
dev
uid=1000(dev) gid=1000(dev) groups=1000(dev)
/usr/bin/zsh
/usr/bin/tmux
/usr/bin/git
/usr/bin/gh
/usr/local/bin/just
/usr/bin/ffmpeg
/usr/local/bin/python
```
`which` で全ツールがヒットすれば OK。どれかが `not found` を返したら該当 apt パッケージ or インストールステップを Dockerfile に戻って修正。

- [ ] **Step 1.6: コミット**

```bash
git add .devcontainer/Dockerfile .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): add minimal Dockerfile and devcontainer.json"
```

---

## Task 2: Node feature とポート転送を追加し、frontend ランタイムが動くことを確認

**Files:**
- Modify: `.devcontainer/devcontainer.json`

- [ ] **Step 2.1: devcontainer.json に features と forwardPorts を追加**

`.devcontainer/devcontainer.json`:
```json
{
    "name": "SpeakPal dev",
    "build": {
        "dockerfile": "Dockerfile"
    },
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "22"
        }
    },
    "remoteUser": "dev",
    "workspaceFolder": "/workspaces/SpeakPal",
    "forwardPorts": [3000, 8000],
    "containerEnv": {
        "SHELL": "/bin/zsh"
    }
}
```

- [ ] **Step 2.2: コンテナを再ビルドして起動**

Run: `devcontainer up --workspace-folder . --remove-existing-container`
Expected: Node 22 feature のインストールログが出て、最後に `"outcome": "success"`。

- [ ] **Step 2.3: Node / npm が dev ユーザーで使えることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'node --version && npm --version'
```
Expected:
```
v22.x.x
10.x.x
```
バージョンが 22 系でなければ Step 2.1 の `version` 指定を見直す。

- [ ] **Step 2.4: コミット**

```bash
git add .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): add Node 22 feature and port forwarding"
```

---

## Task 3: postCreateCommand で backend / frontend / Claude Code の依存を入れる

**Files:**
- Modify: `.devcontainer/devcontainer.json`

- [ ] **Step 3.1: postCreateCommand を追加**

`.devcontainer/devcontainer.json` に以下を追加（既存のキーの後ろに）:
```json
    "postCreateCommand": "sudo pip install -r backend/requirements-dev.txt && npm --prefix frontend install && sudo npm install -g @anthropic-ai/claude-code"
```
全体は以下になる:
```json
{
    "name": "SpeakPal dev",
    "build": {
        "dockerfile": "Dockerfile"
    },
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "22"
        }
    },
    "remoteUser": "dev",
    "workspaceFolder": "/workspaces/SpeakPal",
    "forwardPorts": [3000, 8000],
    "containerEnv": {
        "SHELL": "/bin/zsh"
    },
    "postCreateCommand": "sudo pip install -r backend/requirements-dev.txt && npm --prefix frontend install && sudo npm install -g @anthropic-ai/claude-code"
}
```

- [ ] **Step 3.2: コンテナを作り直して postCreate を走らせる**

Run: `devcontainer up --workspace-folder . --remove-existing-container`
Expected: postCreateCommand のログで `pip install` → `npm install` → `npm install -g @anthropic-ai/claude-code` が順に走り、最後に `"outcome": "success"`。

- [ ] **Step 3.3: 依存が入っていることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'pytest --version && test -d frontend/node_modules/next && echo "next installed" && claude --version'
```
Expected:
```
pytest 8.x.x
next installed
<claude code バージョン番号>
```
どれかが失敗したら該当ステップに戻って原因を確認（pip / npm / npm -g のどこで失敗したかは postCreate のログを再度読むのが早い）。

- [ ] **Step 3.4: コミット**

```bash
git add .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): install backend/frontend deps and Claude Code via postCreateCommand"
```

---

## Task 4: 認証情報のマウントを追加し、git / gh / ssh / Claude Code が引き継げることを確認

**Files:**
- Modify: `.devcontainer/devcontainer.json`

- [ ] **Step 4.1: mounts と SSH_AUTH_SOCK を追加**

`.devcontainer/devcontainer.json`:
```json
{
    "name": "SpeakPal dev",
    "build": {
        "dockerfile": "Dockerfile"
    },
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "22"
        }
    },
    "remoteUser": "dev",
    "workspaceFolder": "/workspaces/SpeakPal",
    "forwardPorts": [3000, 8000],
    "mounts": [
        "source=${localEnv:HOME}/.gitconfig,target=/home/dev/.gitconfig,type=bind,readonly",
        "source=${localEnv:SSH_AUTH_SOCK},target=/ssh-agent,type=bind",
        "source=${localEnv:HOME}/.config/gh,target=/home/dev/.config/gh,type=bind,readonly",
        "source=${localEnv:HOME}/.claude,target=/home/dev/.claude,type=bind"
    ],
    "containerEnv": {
        "SHELL": "/bin/zsh",
        "SSH_AUTH_SOCK": "/ssh-agent"
    },
    "postCreateCommand": "sudo pip install -r backend/requirements-dev.txt && npm --prefix frontend install && sudo npm install -g @anthropic-ai/claude-code"
}
```

- [ ] **Step 4.2: コンテナを作り直して再起動**

Run: `devcontainer up --workspace-folder . --remove-existing-container`
Expected: マウントエラーなく成功。ホスト側に `~/.config/gh` が存在しないとここで失敗する — 無ければ事前に `gh auth login` で作っておく。

- [ ] **Step 4.3: git 設定がホストから引き継がれていることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'git config user.name && git config user.email'
```
Expected:
```
Naotchi
n.shiba0101@gmail.com
```
ホストの `~/.gitconfig` の内容がそのまま出力される。

- [ ] **Step 4.4: SSH agent 経由で GitHub に接続できることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'ssh -o StrictHostKeyChecking=accept-new -T git@github.com; echo "exit=$?"'
```
Expected:
```
Hi <username>! You've successfully authenticated, but GitHub does not provide shell access.
exit=1
```
（GitHub の SSH は shell 接続を常に exit 1 で閉じるので exit=1 で正常）

- [ ] **Step 4.5: gh CLI がホストのトークンで動くことを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'gh auth status'
```
Expected: `✓ Logged in to github.com as <username>` のような成功メッセージ。

- [ ] **Step 4.6: Claude Code の履歴がホストと共有されていることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'ls -la /home/dev/.claude/projects/ | head -5'
```
Expected: ホストの `~/.claude/projects/` 配下と同じディレクトリ一覧が見える。

- [ ] **Step 4.7: コミット**

```bash
git add .devcontainer/devcontainer.json
git commit -m "feat(devcontainer): mount host gitconfig/ssh-agent/gh-config/claude for auth passthrough"
```

---

## Task 5: justfile を作成し、backend / frontend / test タスクを定義

**Files:**
- Create: `justfile`

- [ ] **Step 5.1: リポジトリルートに justfile を作成**

`justfile`:
```makefile
# SpeakPal dev tasks. Run `just` to list.

default:
    @just --list

# Install backend + frontend deps (run after dep changes)
install:
    sudo pip install -r backend/requirements-dev.txt
    npm --prefix frontend install

# Run backend dev server with hot reload
backend:
    cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run frontend dev server (Next.js)
frontend:
    npm --prefix frontend run dev

# Run all backend tests
test:
    cd backend && pytest

# Run a single backend test file or pattern: `just test-file f=tests/test_chat_router.py`
test-file f:
    cd backend && pytest {{f}}

# Run frontend lint
lint:
    npm --prefix frontend run lint
```

- [ ] **Step 5.2: `just --list` が想定通り出ることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'just --list'
```
Expected:
```
Available recipes:
    backend     # Run backend dev server with hot reload
    default
    frontend    # Run frontend dev server (Next.js)
    install     # Install backend + frontend deps (run after dep changes)
    lint        # Run frontend lint
    test        # Run all backend tests
    test-file f # Run a single backend test file or pattern: `just test-file f=tests/test_chat_router.py`
```

- [ ] **Step 5.3: `just test` で既存のテストが通ることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'just test'
```
Expected: 既存の backend テストがすべて pass（赤が出たら既存テストの破損 — このタスクでは触らず、別途調査のメモを残して先へ進むか、止めて相談）。

- [ ] **Step 5.4: `just lint` が通ることを確認**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'just lint'
```
Expected: ESLint がエラーなく完了。既存 warning はそのまま残っても良い。

- [ ] **Step 5.5: コミット**

```bash
git add justfile
git commit -m "feat: add justfile with backend/frontend/test/lint tasks for devcontainer"
```

---

## Task 6: backend と frontend の dev サーバを実際に起動し、golden path を手動検証

このタスクは**手動検証ステップ**。人間（もしくはブラウザアクセスが可能な状況）が必要。自動化できない部分。

- [ ] **Step 6.1: バックエンドを起動（別ターミナル）**

ホスト側のターミナル1:
```bash
devcontainer exec --workspace-folder . zsh
```
中に入ったら:
```bash
just backend
```
Expected: `Uvicorn running on http://0.0.0.0:8000` と表示されて待機状態になる。

- [ ] **Step 6.2: `http://localhost:8000/docs` がホストブラウザで開けることを確認**

ホストのブラウザで `http://localhost:8000/docs` を開く。
Expected: FastAPI の Swagger UI が表示される。

- [ ] **Step 6.3: フロントエンドを起動（別ターミナル）**

ホスト側のターミナル2:
```bash
devcontainer exec --workspace-folder . zsh
```
中に入ったら:
```bash
just frontend
```
Expected: `Ready in ...` と表示されて待機状態になる。

- [ ] **Step 6.4: `http://localhost:3000` がホストブラウザで開けることを確認**

ホストのブラウザで `http://localhost:3000` を開く。
Expected: SpeakPal のトップページが表示される。

- [ ] **Step 6.5: 録音 → 転写 → AI 返信 → 音声再生の golden path を通す**

ブラウザ上でマイク許可を与えて録音ボタンを押し、英語で何か話して止める。
Expected: 録音が終わると転写されたテキストと AI の返信、音声再生が順に動く。Azure のキーが正しく読み込まれていることの確認になる（CLAUDE.md の「Testing approach」の手動検証項目と同じ）。

- [ ] **Step 6.6: 両サーバを Ctrl-C で止める**

特にコミットなし（このタスクは検証のみ）。

---

## Task 7: CLAUDE.md を更新し、devcontainer の使い方を追記

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 7.1: CLAUDE.md の `## Commands` セクションの末尾に devcontainer ブロックを追加**

現行の `## Commands` セクションは保持する。そのセクションの**末尾**（`docker compose exec` の説明の後）に以下を追記する：

```markdown
### Devcontainer での開発（推奨）

ローカル開発は `.devcontainer/` と `justfile` を使う構成に移行した。ホストに `@devcontainers/cli` が必要（`npm install -g @devcontainers/cli`）。

**起動:**
```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . zsh
```

**中で使うコマンド:**
```bash
just backend      # uvicorn 起動（ポート8000）
just frontend     # next dev 起動（ポート3000）
just test         # backend 全テスト
just test-file f=tests/test_chat_router.py  # 単一テスト
just lint         # frontend lint
just install      # deps 再インストール
```

上記の `docker compose` コマンド群は、本番イメージの動作確認用として残している。通常の開発では devcontainer + just を使う。
```

- [ ] **Step 7.2: 追記した内容を目視確認**

Run: `grep -A 20 "Devcontainer での開発" /home/naoki/SpeakPal/CLAUDE.md`
Expected: 追加したブロックが表示される。

- [ ] **Step 7.3: コミット**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document devcontainer workflow in CLAUDE.md"
```

---

## Task 8: 永続化と再ビルドの動作確認

このタスクは spec の受け入れ基準 #10（`~/.claude` の履歴がコンテナ破棄 / 再起動を跨いで残る）を確認する。

- [ ] **Step 8.1: コンテナ内に一度ファイルを書いてみる**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'echo "marker=$(date +%s)" > /home/dev/.claude/devcontainer-test.txt && cat /home/dev/.claude/devcontainer-test.txt'
```
Expected: `marker=...` が出力される。このファイルがホストの `~/.claude/devcontainer-test.txt` にも同時に存在していることを別途 `ls ~/.claude/devcontainer-test.txt` で確認。

- [ ] **Step 8.2: コンテナを破棄**

`@devcontainers/cli` に `down` サブコマンドは無いので、docker で直接止める。

Run:
```bash
docker ps --filter "label=devcontainer.local_folder=$(pwd)" --format '{{.ID}}' | xargs -r docker rm -f
```
Expected: コンテナ ID が出力されて削除される。`docker ps` で該当コンテナが消えたことを確認。

- [ ] **Step 8.3: 再起動してマーカーファイルが残っていることを確認**

Run:
```bash
devcontainer up --workspace-folder . >/dev/null
devcontainer exec --workspace-folder . zsh -c 'cat /home/dev/.claude/devcontainer-test.txt'
```
Expected: Step 8.1 で書いた `marker=...` が同じ値で出力される。ホストマウントが機能している証拠。

- [ ] **Step 8.4: マーカーファイルを片付ける**

Run:
```bash
devcontainer exec --workspace-folder . zsh -c 'rm /home/dev/.claude/devcontainer-test.txt'
```

特にコミットなし（このタスクは検証のみ）。

---

## 受け入れ基準の対応表（spec と plan の突き合わせ）

| spec の受け入れ基準 | 対応タスク |
|---|---|
| 1. `devcontainer up` が成功 | Task 1 Step 1.4 |
| 2. `devcontainer exec` で shell に入れる | Task 1 Step 1.5 |
| 3. `just backend` → `:8000/docs` が開く | Task 6 Step 6.1, 6.2 |
| 4. `just frontend` → `:3000` が開く | Task 6 Step 6.3, 6.4 |
| 5. 録音 → 転写 → AI → 音声の golden path | Task 6 Step 6.5 |
| 6. `just test` が通る | Task 5 Step 5.3 |
| 7. `git commit` の Author がホストと一致 | Task 4 Step 4.3（設定の確認）／Task 1 の commit で実地検証 |
| 8. `ssh -T git@github.com` と `gh auth status` が成功 | Task 4 Step 4.4, 4.5 |
| 9. `claude` コマンドが動く | Task 3 Step 3.3 |
| 10. `down` / `up` 後に `~/.claude` が残る | Task 8 |

---

## Out of Scope

- 本番 `Dockerfile` の整理（`requirements-dev.txt` 除去、multi-stage 化）
- CI への devcontainer 統合
- macOS / Windows での動作検証
- frontend のテスト整備
- `@devcontainers/cli` のホスト側インストール自動化
