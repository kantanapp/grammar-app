# Subject & Predicate Practice

主語（subject）と述語（predicate）の文法練習アプリです。スマホで1問ずつタップして答え、その場で正解と解説が出ます。

- 素の HTML / CSS / JavaScript だけで動きます（フレームワーク・ビルドツールなし）
- サーバー不要。ファイルを置くだけ
- PWA 対応。ホーム画面に追加すれば、電波がなくても使えます
- 記録（ベストスコア・間違えた問題）は端末の `localStorage` に保存されます

## ファイル構成

```
/
├── index.html          アプリ本体（1ページ構成、画面はJSで切り替え）
├── style.css
├── app.js
├── questions.json      問題データ（全58問）
├── manifest.json       PWA設定
├── sw.js               Service Worker（オフライン用キャッシュ）
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## GitHub Pages で公開する手順

1. GitHub で新しいリポジトリを作る（例：`grammar-app`、Public）。
2. 上の全ファイルをリポジトリにアップロード（push）する。
3. リポジトリの **Settings → Pages** を開く。
4. **Source** を「Deploy from a branch」、ブランチを `main`、フォルダを `/ (root)` にして保存する。
5. 1〜2分後に `https://（ユーザー名）.github.io/grammar-app/` で開けるようになる。
6. スマホで開き、ホーム画面に追加する。
   - iPhone（Safari）：共有ボタン →「ホーム画面に追加」
   - Android（Chrome）：メニュー →「ホーム画面に追加」

※ 無料プランの GitHub Pages は Public リポジトリが必要です。URLを知っている人は誰でも見られますが、個人情報は入れていません。

## 手元で動かす（確認用）

`index.html` をダブルクリックして開くと、ブラウザの制限（file:// では `fetch` が使えない）で問題データを読み込めません。かならず簡易サーバー経由で開いてください。

```bash
python3 -m http.server 8000
```

そのあとブラウザで `http://localhost:8000/` を開きます。

## 問題を追加・修正するとき

1. `questions.json` の該当セットの `questions` 配列に1問足す。

   ```json
   {
     "id": "set1-11",
     "type": "label",
     "prompt": "The [[bus]] stopped at the corner.",
     "choices": ["A", "B", "C", "D", "E", "F"],
     "answer": "A",
     "explanation": "Only the one key noun bus is underlined."
   }
   ```

   - `id` は他と重複しない文字列にする
   - `type` は `definition`（定義から用語を選ぶ） / `label`（下線部の用語を選ぶ） / `fragment`（S か F か）
   - `prompt` の `[[ ]]` で囲んだ部分が下線付きで表示される
   - `choices` は `definition` / `label` なら `["A","B","C","D","E","F"]`、`fragment` なら `["S","F"]`

2. **`sw.js` の `CACHE_NAME` のバージョンを上げる**（`grammar-v1` → `grammar-v2`）。

   Service Worker はキャッシュを優先して表示するので、ここを上げないと、一度開いた端末では古い問題データのままになります。バージョンを上げると古いキャッシュは自動で削除されます。

3. push する。スマホ側はアプリを一度閉じて開き直すと新しい問題が出ます。

## 動作のメモ

- セットを選ぶと出題順はシャッフルされます。選択肢（A〜F）の並びは紙のテストと同じ順のままです。
- 「Mix all」は全58問から重複なしで10問を出します。
- 「Review mistakes」は過去に間違えた問題だけを出します。Review 中に正解すると、その問題は一覧から外れます。
- 記録を消したいときは、ホーム画面の「Reset progress」を押します。
