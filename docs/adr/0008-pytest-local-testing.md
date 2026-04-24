# 0008. 自動テストは pytest で backend から段階導入する

- Status: Accepted
- Date: 2026-04-20
- Deciders: naoki

## Context

プロジェクト開始以来、自動テストは一切整備されていない。`README.md` の未実装リストと `docs/development.md` で明示され、後者には「追加するときは `backend/tests/` と `frontend/src/**/*.test.ts` を作る方向で ADR を起こす」とルールが置かれている。

動機は 2 つ:

- 機能追加・リファクタ時の回帰を検出する**安全網**が欲しい
- バックログ案 2「リトライ機能」など今後の機能を **Red → Green → Refactor** の TDD サイクルで進めたい

一方で、テスト基盤を一度に全領域（backend + frontend + CI + E2E）で整えようとすると、選定とセットアップで初速が鈍り、肝心の「テストを書く習慣」が後回しになりやすい。

## Decision

以下のスコープで最小構成を導入する:

- **対象**: backend（FastAPI）のみ
- **ランナー**: `pytest` + `pytest-asyncio`
- **初期テスト**: Azure 依存を持たない既存の純粋ロジック（`_split_sentences`, `_parse_response`）の characterization tests
- **実行方法**: `docker compose exec backend pytest`（ローカル実行のみ）
- **dev 依存**: `backend/requirements-dev.txt` に分離。現時点では prod イメージの区別が無い（0001）ため Dockerfile では dev 依存も同じイメージに同居させる

frontend のテスト基盤、CI 連携、services 層の integration test は **本 ADR のスコープ外**。必要になった時点で別 ADR を起こす。

## Consequences

- Pros
  - 最小のセットアップで「テストを書く・走らせる」ループが回り始める
  - 既存コードは無変更で着手できる（`_split_sentences` と `_parse_response` は既に純粋関数として切り出し済み）
  - `pytest-asyncio` を先に入れておくことで、`stream_response` など async ロジックへ拡張する際に追加選定が不要
  - dev 依存を別ファイルに分離しているので、将来 prod イメージを切り出す時に移行コストが小さい
- Cons / Trade-offs
  - frontend / CI が未整備なので、frontend のリグレッションは依然として手動確認頼み
  - Azure SDK・ffmpeg subprocess が絡む services 層は今回テスト対象外。モック戦略が確立するまでは integration test が書けない
  - dev 依存（pytest 等）が実行用イメージに同梱されるため、イメージサイズがわずかに増える
- 波及する仕事
  - frontend のテスト基盤導入（Vitest/Jest 選定、MediaRecorder モック戦略）→ 別 ADR
  - GitHub Actions 等の CI 連携 → 別 ADR
  - services 層（Azure SDK / ffmpeg subprocess）の integration test 戦略 → 別 ADR
  - prod / dev イメージを分離する必要が出たタイミングで Dockerfile のマルチステージ化を別 ADR で検討

## Alternatives Considered

### Option A: 最初から frontend + CI まで一括整備

- プロジェクト全体で一貫した体制になるメリット
- 初期セットアップの工数が大きく、「とりあえず書き始める」までの距離が遠い
- frontend 側は MediaRecorder / fetch / localStorage のモック設計が必要で、選定だけでも時間を取る

### Option B: Python 標準 `unittest` を使う

- 外部依存ゼロで導入できる
- async テストやフィクスチャ周りで pytest の方がエコシステムが厚く、学習コストも総合的には低い
- プロジェクトに他の特別な制約は無いので、素直に pytest を選ぶ

### Option C: 自動テストを入れず手動確認を続ける

- 小規模なうちは回せる
- バックログ（リトライ機能等）を進めるほど回帰コストが膨らむ。TDD サイクルを習慣化するには「テストがあること」が前提

## References

- `backend/app/routers/chat.py`（`_split_sentences`）
- `backend/app/services/conversation.py`（`_parse_response`）
- `backend/tests/`（本 ADR で新設）
- `docs/development.md`（テスト実行手順と TDD サイクルを追記）
- [0001](./0001-monorepo-docker-compose.md)（dev / prod 区別の非分離）
