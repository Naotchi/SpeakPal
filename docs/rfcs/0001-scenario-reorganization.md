# 0001. シナリオを「AI から話しかけられる」前提で整理する

- Status: Draft
- Date: 2026-04-25
- Author: Naotchi
- Related: —

## Summary

「自由に話す」はユーザーから話し始め、それ以外のシナリオは AI 側から話し始める、という暗黙ルールを前提として、既存シナリオのラベルと役割を整理する。ラベルは「AI から動作を受ける」受動形のテンプレに統一し、矛盾していたシナリオ（道を尋ねる）は役割を反転、前提に合わないシナリオ（上司に有給を交渉）は削除する。データモデルや UI の構造は変更しない。

## Motivation

現在の `SCENARIOS`（`frontend/src/lib/scenarios.ts`）は、AI が先に話しかける `starter` を持つ一方で、ラベルはユーザー能動の表現になっており、両者が噛み合っていない。

- 「道を尋ねる」では、現行の starter は通行人（AI）が "Oh, hi! You look a bit lost — do you need some help finding something?" と声をかけるが、ラベル上はユーザーが尋ねる建前になっており、AI から話しかけるのは不自然（お節介な通行人に見える）。
- 「上司に有給を交渉」も、ユーザーが交渉するはずが starter は上司（AI）が "Hey, you wanted to chat? ..." と迎える形で、議題の主導権がどちらにあるか曖昧。

結果として、シナリオを選んだユーザーが「AI がしゃべり始めたが、何を返せばいいか」で迷いやすい。ラベル・starter・プロンプト・ユーザー役の整合を取り、「AI から話しかけられる → ユーザーはその場面の当事者として英語で応じる」という学習体験を明確にする。

## Spec (What)

### 前提ルール

- `free` シナリオのみユーザーから話し始める（starter なし）
- それ以外のシナリオは AI 側から `starter` で口火を切る
- このルールは暗黙の不変条件として扱い、型や UI では明示しない（最小限の変更に留める）

### ラベル命名テンプレ

非 free シナリオのラベルは **「[AI の役]に[AIからの動作]される」形の受動文** に統一する。ユーザーが何を受け身で経験するかが一目で分かる形。

### 最終ラインナップ（5 件）

| # | emoji | label | speakerName | 役割 |
| --- | --- | --- | --- | --- |
| 1 | 💬 | 自由に話す | (free-talk partner) | ユーザー先行 |
| 2 | 🛫 | 空港の係員に案内される | Check-in Agent | AI=係員、ユーザー=旅行者 |
| 3 | 🍽️ | レストランで店員に声をかけられる | Server | AI=店員、ユーザー=客 |
| 4 | 👋 | パーティで話しかけられる | Alex | AI=初対面の Alex、ユーザー=対等な参加者 |
| 5 | 🗺️ | 観光客に道を尋ねられる | Tourist | **AI=道に迷った観光客、ユーザー=地元民（役割反転）** |

現行からの差分:

- `pto-negotiation`（📅 上司に有給を交渉）を **削除**。AI 先行前提と噛み合わず、議題の主導権が曖昧になるため。
- `asking-directions`（🗺️ 道を尋ねる）を **役割反転し、id を `giving-directions` に変更**。ラベルは「観光客に道を尋ねられる」、ユーザーは地元民として英語で道案内する。
- 残り 3 件（airport-checkin / restaurant-order / self-intro）は、ラベルと description を受動形に書き換えるが、promptSnippet・starter・speakerName・emoji は現状維持。

### 各シナリオの具体定義

すべて `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列に反映する。

#### 1. 💬 自由に話す（変更なし）

```ts
{
  id: FREE_TALK_ID,
  label: "自由に話す",
  emoji: "💬",
  description: "場面を決めずに気軽におしゃべり",
  promptSnippet: "",
  starter: "",
  speakerName: "",
}
```

#### 2. 🛫 空港の係員に案内される

```ts
{
  id: "airport-checkin",
  label: "空港の係員に案内される",
  emoji: "🛫",
  description: "海外空港のカウンターで係員に搭乗手続きを進めてもらう",
  // promptSnippet は現行を維持
  starter:
    "Good afternoon! Welcome to the check-in counter. May I see your passport and ticket, please?",
  speakerName: "Check-in Agent",
}
```

#### 3. 🍽️ レストランで店員に声をかけられる

```ts
{
  id: "restaurant-order",
  label: "レストランで店員に声をかけられる",
  emoji: "🍽️",
  description: "海外のレストランで店員に注文をとってもらう",
  // promptSnippet は現行を維持
  starter: "Hi there, welcome in! Can I start you off with something to drink?",
  speakerName: "Server",
}
```

#### 4. 👋 パーティで話しかけられる

```ts
{
  id: "self-intro",
  label: "パーティで話しかけられる",
  emoji: "👋",
  description: "初対面の相手から声をかけられ、自己紹介を交わす",
  // promptSnippet は現行を維持
  starter: "Hi! I don't think we've met before. I'm Alex — nice to meet you!",
  speakerName: "Alex",
}
```

#### 5. 🗺️ 観光客に道を尋ねられる（役割反転・全面書き直し）

```ts
{
  id: "giving-directions",
  label: "観光客に道を尋ねられる",
  emoji: "🗺️",
  description: "街中で観光客に呼び止められ、目的地までの行き方を英語で案内する",
  promptSnippet:
    "You are a foreign tourist visiting an English-speaking city where the user lives. " +
    "You are a bit lost and just stopped the user on the street to ask for directions " +
    "to a specific landmark (pick one naturally — train station, a famous museum, a well-known park, etc.). " +
    "The user is a local resident helping you in English. " +
    "Listen to their directions, ask natural follow-up questions if something is unclear " +
    "(distance, which side of the street, whether you can walk or should take transit), " +
    "and thank them naturally when you understand. Stay in role as the tourist.",
  starter:
    "Excuse me, sorry to bother you — do you happen to know how to get to the train station from here?",
  speakerName: "Tourist",
}
```

### 変更範囲・非変更範囲

**変更するもの**:

- `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列のみ

**変更しないもの**:

- `Scenario` 型（`initiator` / `userRoleHint` などのフィールドは追加しない）
- `FREE_TALK_ID` / `loadScenarioId` / `saveScenarioId` / `getScenario`
- バックエンド（`promptSnippet` は従来どおり `persona` として `POST /api/chat/stream` に送られる）
- UI コンポーネント（`ScenarioPicker` / `ScenarioChip` / `ChatMessage` など）
- `PartnerSettings` / free-talk 側の設定

### 既存ユーザーへの影響

`loadScenarioId()` は localStorage の値が `SCENARIOS` に無ければ `FREE_TALK_ID` にフォールバックする:

```ts
return SCENARIOS.some((s) => s.id === raw) ? raw : FREE_TALK_ID;
```

よって:

- `speakpal.scenarioId = "pto-negotiation"` を保存していたユーザー → 次回起動時に「自由に話す」へフォールバック（エラーなし）
- `speakpal.scenarioId = "asking-directions"` を保存していたユーザー → 同様にフォールバック
- チャット履歴は localStorage に保存していないため、進行中の会話への影響なし
- SRS（`speakpal.srsItems`）はシナリオ id に依存しないため無影響

バックエンドや外部システムに保存されている状態はないため、マイグレーションは不要。

### 動作確認

フロントのユニットテストは未整備のため、手動確認でカバーする:

1. シナリオピッカーで 5 件表示され、「📅 上司に有給を交渉」が消えている
2. 各シナリオのラベル・説明が新しい文言になっている
3. 🗺️「観光客に道を尋ねられる」を選ぶと、AI の starter メッセージ "Excuse me, sorry to bother you..." がチャットに追加される（現行実装では starter はテキストのみで自動音声再生はしない。本 RFC の範囲外）
4. 🗺️ で英語で道案内を話すと、AI（Tourist）が追質問を返し、地元民として応答する文脈が成立する
5. 他 3 件（airport / restaurant / self-intro）は従来通りの会話が成立する
6. ブラウザの localStorage に `speakpal.scenarioId = "pto-negotiation"` や `"asking-directions"` を仕込んだ状態でリロードし、「自由に話す」状態で起動する

### 非機能要件

- パフォーマンス: 影響なし（静的配列の中身を差し替えるのみ）
- コスト: 影響なし
- 互換性: 上記の通り、古い `scenarioId` は自動的に `free` にフォールバックされる

## Plan (How)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列を、Spec に定めた最終ラインナップ（5 件、受動形ラベル、道を尋ねられるの役割反転）に差し替える。

**Architecture:** 静的データ配列の書き換えのみ。型・関数・バックエンド・UI コンポーネントには一切手を入れない。コミット単位で 3 段に分け、各段でリントを通して安全に進める。

**Tech Stack:** TypeScript（Next.js フロントエンド）、Docker Compose（`docker compose exec frontend npm run lint` でリント実行）。

**TDD の扱い:** フロントのテスト実行基盤が未整備のため、各タスクで failing test → implementation のサイクルは踏まない。代わりに `npm run lint` を各コミット前の合格基準とし、最後に Phase 2 で Spec の「動作確認」節を手動実施する。将来フロントのテスト基盤を導入したら、このプランを参考に scenario データの静的検証テストを追加できる。

---

### Phase 1: シナリオデータの差し替え

#### Task 1: `pto-negotiation` シナリオを削除

**Files:**
- Modify: `frontend/src/lib/scenarios.ts`（削除対象は現行の `SCENARIOS` 配列内の `pto-negotiation` オブジェクト、行数は 66–80 付近。編集前に `grep -n 'pto-negotiation' frontend/src/lib/scenarios.ts` で位置を確認する）

- [ ] **Step 1: 現在のファイル全体を読む**

Run: `cat frontend/src/lib/scenarios.ts`（または Read ツール）
目的: 編集前のコンテキスト把握。以下の Task すべての基準点になる。

- [ ] **Step 2: `pto-negotiation` エントリを `SCENARIOS` 配列から削除**

削除するブロック（カンマ含めて 1 要素分を丸ごと除去）:

```ts
  {
    id: "pto-negotiation",
    label: "上司に有給を交渉",
    emoji: "📅",
    description: "休暇を取りたいと上司に相談する",
    promptSnippet:
      "You are the user's manager at an English-speaking workplace. " +
      "The user wants to request paid time off. " +
      "Hear them out, ask about dates, workload coverage, and any deadlines, " +
      "and negotiate naturally — be reasonable but realistic about business constraints. " +
      "Stay in role as the manager.",
    starter:
      "Hey, you wanted to chat? Come on in — what's on your mind?",
    speakerName: "Manager",
  },
```

削除後、配列末尾のカンマ/括弧が壊れていないことを確認する。

- [ ] **Step 3: リント実行**

Run: `docker compose exec frontend npm run lint`
Expected: 0 error / 0 warning（既存の lint 状況が clean である前提。既存 warning が残っている場合は「本コミットで新規 warning を増やしていない」ことを確認）

- [ ] **Step 4: 配列要素数の確認**

Run: `grep -c '^  {' frontend/src/lib/scenarios.ts`
Expected: `5`（free + 4 件）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/lib/scenarios.ts
git commit -m "feat(scenarios): remove 上司に有給を交渉 scenario

RFC 0001 に基づき、AI 先行前提と噛み合わない pto-negotiation を削除。"
```

---

#### Task 2: 3 シナリオのラベル・説明を受動形へ

対象: `airport-checkin`、`restaurant-order`、`self-intro`
変更対象フィールド: `label` と `description` のみ（`promptSnippet` / `starter` / `speakerName` / `emoji` / `id` は据え置き）

**Files:**
- Modify: `frontend/src/lib/scenarios.ts`

- [ ] **Step 1: `airport-checkin` の `label` と `description` を差し替え**

変更前:

```ts
    label: "空港チェックイン",
    emoji: "🛫",
    description: "海外空港のカウンターで搭乗手続き",
```

変更後:

```ts
    label: "空港の係員に案内される",
    emoji: "🛫",
    description: "海外空港のカウンターで係員に搭乗手続きを進めてもらう",
```

他のフィールドには触れない。

- [ ] **Step 2: `restaurant-order` の `label` と `description` を差し替え**

変更前:

```ts
    label: "レストランで注文",
    emoji: "🍽️",
    description: "海外のレストランで料理を注文する",
```

変更後:

```ts
    label: "レストランで店員に声をかけられる",
    emoji: "🍽️",
    description: "海外のレストランで店員に注文をとってもらう",
```

- [ ] **Step 3: `self-intro` の `label` と `description` を差し替え**

変更前:

```ts
    label: "初対面の自己紹介",
    emoji: "👋",
    description: "初めて会った相手と自己紹介を交わす",
```

変更後:

```ts
    label: "パーティで話しかけられる",
    emoji: "👋",
    description: "初対面の相手から声をかけられ、自己紹介を交わす",
```

- [ ] **Step 4: リント実行**

Run: `docker compose exec frontend npm run lint`
Expected: 0 new error / 0 new warning

- [ ] **Step 5: 差分が label と description のみに留まっていることを確認**

Run: `git diff frontend/src/lib/scenarios.ts`
Expected: 3 シナリオそれぞれで `label:` と `description:` の行のみ変更されている（`promptSnippet` / `starter` / `speakerName` / `id` / `emoji` に変更なし）

- [ ] **Step 6: コミット**

```bash
git add frontend/src/lib/scenarios.ts
git commit -m "feat(scenarios): rewrite labels of 3 scenarios to passive form

RFC 0001 の命名テンプレに合わせ、airport-checkin / restaurant-order /
self-intro の label と description を『AI から受動的に受ける』形へ統一。"
```

---

#### Task 3: `asking-directions` を `giving-directions` に役割反転

**Files:**
- Modify: `frontend/src/lib/scenarios.ts`（対象は既存の `asking-directions` オブジェクト）

- [ ] **Step 1: 既存の `asking-directions` オブジェクトを全体差し替え**

変更前（現状の定義そのまま）:

```ts
  {
    id: "asking-directions",
    label: "道を尋ねる",
    emoji: "🗺️",
    description: "街中で目的地までの行き方を聞く",
    promptSnippet:
      "You are a local passerby in an English-speaking city. " +
      "The user is a Japanese tourist who stops you to ask for directions. " +
      "Listen to where they want to go, then give directions naturally " +
      "(turns, landmarks, approximate distance). " +
      "Feel free to suggest public transit if it's easier. Stay friendly and in role.",
    starter:
      "Oh, hi! You look a bit lost — do you need some help finding something?",
    speakerName: "Local",
  },
```

変更後（id / label / description / promptSnippet / starter / speakerName をすべて差し替え、`emoji` のみ据え置き）:

```ts
  {
    id: "giving-directions",
    label: "観光客に道を尋ねられる",
    emoji: "🗺️",
    description: "街中で観光客に呼び止められ、目的地までの行き方を英語で案内する",
    promptSnippet:
      "You are a foreign tourist visiting an English-speaking city where the user lives. " +
      "You are a bit lost and just stopped the user on the street to ask for directions " +
      "to a specific landmark (pick one naturally — train station, a famous museum, a well-known park, etc.). " +
      "The user is a local resident helping you in English. " +
      "Listen to their directions, ask natural follow-up questions if something is unclear " +
      "(distance, which side of the street, whether you can walk or should take transit), " +
      "and thank them naturally when you understand. Stay in role as the tourist.",
    starter:
      "Excuse me, sorry to bother you — do you happen to know how to get to the train station from here?",
    speakerName: "Tourist",
  },
```

- [ ] **Step 2: リント実行**

Run: `docker compose exec frontend npm run lint`
Expected: 0 new error / 0 new warning

- [ ] **Step 3: 配列要素数と id の再確認**

Run: `grep -nE "id: \"(free|airport-checkin|restaurant-order|self-intro|giving-directions)\"" frontend/src/lib/scenarios.ts`
Expected: 5 行が返る（`pto-negotiation` / `asking-directions` は一致しない）

Run: `grep -nE "id: \"(pto-negotiation|asking-directions)\"" frontend/src/lib/scenarios.ts`
Expected: 何も返らない（exit status 1）

- [ ] **Step 4: コミット**

```bash
git add frontend/src/lib/scenarios.ts
git commit -m "feat(scenarios): flip role — 観光客に道を尋ねられる

RFC 0001 に基づき、道を尋ねるシナリオを役割反転。
user=地元民、AI=道に迷った観光客。id を giving-directions に変更し、
promptSnippet / starter / speakerName / label / description を全書き換え。"
```

---

### Phase 2: 手動動作確認

**Goal:** Spec「動作確認」節のチェック項目 6 つすべてを通す。通らなければ該当タスクに戻る。

- [ ] **Step 1: 開発スタック起動**

Run: `docker compose up --build`
Expected: backend と frontend の両方が立ち上がり、`http://localhost:3000` が開ける。

- [ ] **Step 2: シナリオピッカーに 5 件表示されることを確認**

ブラウザで `http://localhost:3000` を開く。会話履歴が空の状態（初回訪問もしくは既存会話をクリア）でシナリオピッカーが表示されることを確認。
Expected: 💬 自由に話す / 🛫 空港の係員に案内される / 🍽️ レストランで店員に声をかけられる / 👋 パーティで話しかけられる / 🗺️ 観光客に道を尋ねられる の 5 件。「📅 上司に有給を交渉」が存在しないこと。

- [ ] **Step 3: 各ラベル・説明文の表示確認**

5 件それぞれについて、ピッカー上の label と description が Spec の文言と一致していることを目視確認。

- [ ] **Step 4: 🗺️「観光客に道を尋ねられる」の AI starter を確認**

🗺️ をタップ → 新しい AI メッセージとして "Excuse me, sorry to bother you — do you happen to know how to get to the train station from here?" がチャットに追加されることを確認。
Expected: メッセージの話者名が「Tourist」。starter 文言は自動音声再生はされない（現状の実装では starter はテキストのみチャットに追加される。streaming で返信するのは次のユーザー発話以降）。

> 実装上の注意: 現行 `frontend/src/app/page.tsx` の `handleScenarioSelect`（185 行目付近）は `scenario.starter` をそのまま `messages` に push する。音声は付かない。これは本 RFC の変更範囲外。もし音声も自動再生したい場合は別 RFC で扱う。

- [ ] **Step 5: 🗺️ でユーザーが英語で道案内を話すと、Tourist が追質問を返すことを確認**

🗺️ を選んだ状態で、マイクボタンから英語で道案内を話す（例: "Go straight for two blocks, then turn left at the traffic light."）。
Expected: AI（Tourist）からの応答が、地元民から案内を受けた観光客の文脈で返ってくる。追質問（距離、徒歩か交通機関かなど）が自然に出ることがある。ユーザー役が地元民として成立している。

- [ ] **Step 6: 他 3 シナリオ（airport / restaurant / self-intro）でも会話が成立することを確認**

それぞれ選択して 1 往復ずつ会話し、AI が従来通りのロール（Check-in Agent / Server / Alex）で応答することを確認。会話が破綻しない。

- [ ] **Step 7: 古い localStorage 値でのフォールバック確認**

ブラウザの DevTools Console で以下を実行し、ページをリロード:

```js
localStorage.setItem("speakpal.scenarioId", "pto-negotiation");
location.reload();
```

Expected: 画面が「自由に話す」の初期状態（シナリオピッカー表示）で立ち上がる。エラー表示なし。

同様に `asking-directions` でもテスト:

```js
localStorage.setItem("speakpal.scenarioId", "asking-directions");
location.reload();
```

Expected: 同じくフォールバックされてシナリオピッカーが表示される。

- [ ] **Step 8: RFC のステータスを `Implemented` に更新してコミット**

`docs/rfcs/0001-scenario-reorganization.md` の Status を `Draft` から `Implemented` に変更。

```bash
git add docs/rfcs/0001-scenario-reorganization.md
git commit -m "docs(rfc): mark RFC 0001 as Implemented"
```

---

### 動作確認（完了判断基準）

- Task 1〜3 すべてのコミットがマージ可能な状態にある
- `docker compose exec frontend npm run lint` がクリーン
- 上記 Phase 2 の全ステップが pass する
- RFC 0001 Status が `Implemented` になっている

## Drawbacks / Trade-offs

- **学習機会の減少**: 「上司に有給を交渉」シナリオは、ユーザーが能動的に議題を切り出す練習として価値があったが、今回削除する。該当のニーズが残っていれば、別 RFC で「AI 先行だが議題をユーザーが持ち出す」設計を検討する。
- **ラベルの抽象度の上下**: 受動形統一で「レストランで店員に声をかけられる」はやや説明的になる。チップ表示での情報密度が増える点は許容する。
- **id 変更による localStorage リセット**: `asking-directions` を使っていたユーザーは次回「自由に話す」状態で起動する。頻度が低く影響も軽微と判断。

## Alternatives Considered

### Option A: `initiator: "user" | "ai"` フィールドをスキーマに追加し、UI バッジで明示する

- 型で不変条件を固定でき、将来「AI 先行だがユーザー主導議題」のような新パターンを入れる余地が残る
- 今回の範囲では型変更に見合う UI 要件がなく、過剰設計になるため不採用

### Option B: ブリーフィング画面を挟む（シナリオ選択 → 役割説明 → 開始）

- 🗺️ のような役割反転シナリオの理解度は上がる
- 1 タップ増えるコストと、現時点で反転シナリオが 1 件しかないことから不採用。ラベルと AI の starter だけで役割は推測可能と判断。

### Option C: 新規シナリオ追加（ホテル・タクシー・面接・医者など）を同時に行う

- ラインナップ拡充は将来やりたいが、今回の焦点は「既存ラインナップの整合性を取る」ことに絞る
- バックログの「シナリオ拡張」として別 RFC で扱う

### Option D: 「上司」シナリオを評価面談や 1on1 に差し替えて残す

- AI 先行が自然になり、受動形テンプレにも収まる
- 現状の有給交渉プロンプトを失うコストに対して、新トピックの学習価値が未検証のため、今回は削除に留める。必要が出たら別 RFC で追加。

## Unresolved Questions

- なし（スキーマ変更も UI 変更もないため、実装上の論点は `/writing-plans` フェーズで詰める）

## References

- `frontend/src/lib/scenarios.ts` — 現行シナリオ定義
- `frontend/src/app/page.tsx` — シナリオ ID のロード・保存・AI starter 表示ロジック
- `backend/app/routers/chat.py` — `persona` フォームフィールドを受け取って LLM へ渡す箇所
