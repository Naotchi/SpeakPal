# シナリオ再編成 実装計画

- Date: 2026-04-25
- Spec: [`docs/superpowers/specs/2026-04-25-scenario-reorganization.md`](../specs/2026-04-25-scenario-reorganization.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `frontend/src/lib/scenarios.ts` の `SCENARIOS` 配列を、Spec に定めた最終ラインナップ（5 件、受動形ラベル、道を尋ねられるの役割反転）に差し替える。

**Architecture:** 静的データ配列の書き換えのみ。型・関数・バックエンド・UI コンポーネントには一切手を入れない。コミット単位で 3 段に分け、各段でリントを通して安全に進める。

**Tech Stack:** TypeScript（Next.js フロントエンド）、Docker Compose（`docker compose exec frontend npm run lint` でリント実行）。

**TDD の扱い:** フロントのテスト実行基盤が未整備のため、各タスクで failing test → implementation のサイクルは踏まない。代わりに `npm run lint` を各コミット前の合格基準とし、最後に Phase 2 で Spec の「動作確認」節を手動実施する。将来フロントのテスト基盤を導入したら、このプランを参考に scenario データの静的検証テストを追加できる。

---

## Phase 1: シナリオデータの差し替え

### Task 1: `pto-negotiation` シナリオを削除

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

Spec 2026-04-25-scenario-reorganization に基づき、AI 先行前提と噛み合わない pto-negotiation を削除。"
```

---

### Task 2: 3 シナリオのラベル・説明を受動形へ

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

Spec 2026-04-25-scenario-reorganization の命名テンプレに合わせ、airport-checkin /
restaurant-order / self-intro の label と description を『AI から受動的に受ける』形へ統一。"
```

---

### Task 3: `asking-directions` を `giving-directions` に役割反転

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

Spec 2026-04-25-scenario-reorganization に基づき、道を尋ねるシナリオを役割反転。
user=地元民、AI=道に迷った観光客。id を giving-directions に変更し、
promptSnippet / starter / speakerName / label / description を全書き換え。"
```

---

## Phase 2: 手動動作確認

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

> 実装上の注意: 現行 `frontend/src/app/page.tsx` の `handleScenarioSelect`（185 行目付近）は `scenario.starter` をそのまま `messages` に push する。音声は付かない。これは本 Spec の変更範囲外。もし音声も自動再生したい場合は別 spec で扱う。

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

---

## 動作確認（完了判断基準）

- Task 1〜3 すべてのコミットがマージ可能な状態にある
- `docker compose exec frontend npm run lint` がクリーン
- 上記 Phase 2 の全ステップが pass する
