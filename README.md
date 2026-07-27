# AIまとめムービー作成ツール

塾の受験合宿・激励会・卒業式などの写真や動画素材から、テロップ付きのまとめムービーを作成するNext.jsアプリです。

## 重要: 初期状態は完全ローカル処理

このアプリは生徒の顔や名前が映る素材を扱うため、初期状態では画像・動画を外部AI APIへ送信しません。動画生成はローカルのNext.jsサーバーとサーバー側FFmpegで処理します。

AI分析機能は将来追加できるように `lib/analysis/organizeAssets.ts` に `analyzeMediaFiles()` を用意していますが、MVPでは素材をそのまま返す空実装です。OpenAI APIやGemini APIを追加する場合も、`ENABLE_AI_ANALYSIS=false` をデフォルトにして、明示的にONにしたときだけ外部送信する設計にしてください。

## MVPでできること

- jpg / jpeg / png / webp 画像の複数アップロード
- mp4 / mov / webm 動画の複数アップロード
- アップロード順のサムネイル確認
- ファイル数と素材種別に応じた作成完了予想時間の表示
- アップロード前または素材ごとの場面メモ指定
- 素材の上下移動・削除
- よく使う場面指定、構成指示、BGM指示のワンクリック入力
- 4種類の動画テンプレート選択
- テンプレートに応じた章立てとテロップ生成
- 先生側でストーリー構成の方向性を指示
- 画像は4秒、動画は先頭約7秒にして結合
- 16:9、1920x1080、mp4で出力
- 任意のBGMアップロード、小さめ音量での合成、開始秒・終了秒の指定
- ブラウザ上でのプレビューとダウンロード
- 生成後の再編集指示による再生成

## 作成時間を短くするための工夫

画質を落とさずに作成時間を短くするため、FFmpegのH.264設定を `veryfast` プリセット + CRF 20 にしています。1920x1080の解像度は維持し、素材の秒数も落としません。

また、素材の削除・上下移動、よく使う指示のワンクリック入力を追加しています。並び替えや指示修正のための再アップロードを減らせるため、実際の作業時間も短くできます。

## 使い方

1. テンプレートを選びます。
2. 必要なら「これから追加する素材の場面指定」に「集中している場面」「先生の激励」などを入力します。
3. 写真・動画をまとめてアップロードします。
4. 素材一覧で順番、種類、場面メモを確認します。
5. 必要ならストーリー構成の指示を入力します。
6. BGMを入れる場合はファイル、開始秒、終了秒、使い方メモを指定します。
7. 作成完了予想時間を確認して「ムービーを作成する」を押します。
8. プレビューで確認し、必要なら再編集指示を入力して再生成します。
9. 問題なければmp4をダウンロードします。

## セットアップ

```bash
npm install
npm run dev
```

PowerShellで `npm` が実行できない場合は、以下のように `npm.cmd` を使ってください。

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

ブラウザで `http://localhost:3000` または `http://127.0.0.1:3000` を開きます。

## FFmpegについて

このMVPはサーバー側でFFmpegを実行します。優先順位は以下です。

1. `.env.local` の `FFMPEG_PATH` / `FFPROBE_PATH`
2. `ffmpeg-static` / `ffprobe-static`
3. PATH上の `ffmpeg` / `ffprobe`

例:

```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
ENABLE_AI_ANALYSIS=false
RETURN_VIDEO_DATA_URL=false
```

## Vercel公開時の注意

VercelはUI確認用のデモ公開先として使えます。ただし、サーバー側FFmpegの実行ファイルをServerless Functionへ含めるとサイズ上限に当たりやすいため、Vercel単体での動画生成は推奨しません。

先生方が日常的に使う本運用では、Renderなどの常駐サーバー、またはVercelのUI + 専用FFmpegバックエンド + 適切なストレージ構成を推奨します。どの構成でも、初期状態では外部AI APIへ素材を送信しません。

## Renderで動かす場合

`render.yaml` を用意しています。GitHubへpushしたあと、Render DashboardでBlueprintとして読み込むとWeb Serviceを作れます。Renderでは `RETURN_VIDEO_DATA_URL=true` を設定しているため、生成mp4をAPIレスポンスとしてブラウザに返します。

Render Dashboardでの手順:

1. GitHubリポジトリをRenderに接続します。
2. Blueprintからこのリポジトリの `render.yaml` を読み込みます。
3. `APP_ACCESS_PASSWORD` に先生用の共通パスワードを設定します。
4. `FILE_RETENTION_HOURS` は初期値24時間です。必要に応じて短くできます。
5. デプロイ後、`/api/health` がOKになることを確認します。

## 本番向けの保護機能

- `APP_ACCESS_PASSWORD` を設定すると、動画生成時に先生用パスワードが必要になります。
- `FILE_RETENTION_HOURS` を過ぎたアップロード素材と完成動画は、次回生成時に自動削除されます。
- デフォルトでは外部AI APIへ画像・動画を送信しません。

## ディレクトリ構成

```text
/app
  /api/movie/render
/components
/lib
  /analysis
  /templates
  /video
/public
  /uploads
  /output
/uploads
/output
```

## 今後追加しやすい機能

- ブレ写真・暗い写真の自動除外
- 類似写真の自動整理
- 笑顔・集中している場面の自動選別
- 動画から良いシーンだけ抽出
- AIによるナレーション台本生成
- テロップの手動編集
- 校舎名・イベント名・日付の入力
- ロゴ画像の挿入
- 縦動画を横動画に自然に配置
- 完成尺を1分、3分、5分から選択
- Canva風のテンプレート追加

## 保存ファイルの扱い

アップロードした素材は `public/uploads`、完成動画は `public/output` に保存されます。現時点では自動削除処理は未起動ですが、`jobId` 単位で保存しているため、一定時間後に削除するバッチやCronを追加しやすい構成です。
