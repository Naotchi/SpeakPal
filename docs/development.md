# 開発セットアップ

## 前提

- Docker / Docker Compose
- Azure のサブスクリプション
  - Azure Speech サービス (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`)
  - Azure OpenAI リソース (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`)
- マイクが使えるブラウザ (Chrome/Edge 推奨)

ローカルで `python` / `node` を直接使う開発フローもサポートできるが、現状の「正」は Docker Compose。

## 初回セットアップ

```bash
# 1. シークレット設定
cp backend/.env.example backend/.env
# backend/.env を編集し、Azure のキー類を入れる

cp frontend/.env.local.example frontend/.env.local
# 必要なら NEXT_PUBLIC_API_URL を書き換える (デフォルト: http://localhost:8000)

# 2. 起動
docker compose up --build
```

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:8000 (ヘルスチェック: `/health`)

バックエンドは `--reload` 付きで起動する設定なので、ホスト側で `backend/` を編集すると自動反映される。フロントエンドも `next dev` なので HMR が効く。

## よく使うコマンド

```bash
# 片側だけ再起動
docker compose restart backend
docker compose restart frontend

# ログを追う
docker compose logs -f backend

# バックエンドに入って python を叩く
docker compose exec backend bash

# フロントの依存を追加
docker compose exec frontend npm install <pkg>
```

## シークレット取り扱い

- `backend/.env` と `frontend/.env.local` は `.gitignore` 済み。**絶対にコミットしない**。
- 新しい環境変数を足したら、必ず `.env.example` / `.env.local.example` も更新する。
- 本番用の置き場所は未定。外部デプロイ時に ADR を起こして決める。

## 動作確認の目安

機能変更した PR は以下を手元で通してから出す:

1. `docker compose up` でエラーなく両サービスが起動する
2. ブラウザで http://localhost:3000 を開く
3. マイク許可を出して録音 → 文字起こし/応答/音声再生が一巡する
4. エラーパス (無音、マイク拒否など) が意図通り表示される

## テスト

backend には pytest を導入済み（[ADR 0008](./adr/0008-pytest-local-testing.md)）。frontend と CI は未整備。

```bash
# 初回のみ、または requirements-dev.txt を更新したとき
docker compose build backend

# テスト実行
docker compose exec backend pytest
```

### TDD サイクル

新規機能やバグ修正は **Red → Green → Refactor** で進める:

1. **Red** — 期待する挙動を `backend/tests/test_<module>.py` に失敗するテストとして書く
2. **Green** — テストが通る最小限の実装を入れる
3. **Refactor** — テストが緑のまま、重複排除・命名整理などを行う

Azure SDK や `ffmpeg` subprocess など外部依存が絡むユニットは `unittest.mock.patch`（または `pytest-mock`）でモックしてテストする。モック戦略の本格化は別 ADR で扱う予定。
