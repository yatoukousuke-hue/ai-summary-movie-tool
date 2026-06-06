export type MovieTemplateId =
  | "exam-camp-emotional"
  | "pep-rally-hot"
  | "graduation-thanks"
  | "summer-course-digest";

export type MovieChapter = {
  id: string;
  label: string;
  title: string;
  caption: string;
};

export type MovieTemplate = {
  id: MovieTemplateId;
  name: string;
  tone: string;
  title: string;
  ending: string;
  chapters: MovieChapter[];
};

export const movieTemplates: MovieTemplate[] = [
  {
    id: "exam-camp-emotional",
    name: "受験合宿 感動系",
    tone: "努力と成長を静かに伝える構成",
    title: "受験合宿",
    ending: "努力は、未来を変える",
    chapters: [
      {
        id: "opening",
        label: "Opening",
        title: "受験合宿タイトル",
        caption: "ここから、受験生としての本当の挑戦が始まる。"
      },
      {
        id: "chapter-1",
        label: "Chapter 1",
        title: "挑戦の始まり",
        caption: "不安も期待も胸に、最初の一歩を踏み出した。"
      },
      {
        id: "chapter-2",
        label: "Chapter 2",
        title: "集中する姿",
        caption: "眠くても、疲れていても、机に向かい続けた。"
      },
      {
        id: "chapter-3",
        label: "Chapter 3",
        title: "仲間と乗り越える時間",
        caption: "一人ではなく、仲間とともに乗り越えた時間。"
      },
      {
        id: "chapter-4",
        label: "Chapter 4",
        title: "最後までやり切る",
        caption: "この努力は、必ず未来の自分を支える。"
      },
      {
        id: "ending",
        label: "Ending",
        title: "努力は、未来を変える",
        caption: "最後までやり切った日々は、未来への力になる。"
      }
    ]
  },
  {
    id: "pep-rally-hot",
    name: "激励会 熱血系",
    tone: "背中を押す力強い構成",
    title: "激励会",
    ending: "いざ、勝負の舞台へ",
    chapters: [
      {
        id: "opening",
        label: "Opening",
        title: "激励会タイトル",
        caption: "今日の言葉が、明日の力になる。"
      },
      {
        id: "chapter-1",
        label: "Chapter 1",
        title: "決意を固める",
        caption: "積み重ねた時間を信じて、前を向く。"
      },
      {
        id: "chapter-2",
        label: "Chapter 2",
        title: "先生からのエール",
        caption: "一人ひとりの努力を、先生たちは見てきた。"
      },
      {
        id: "chapter-3",
        label: "Chapter 3",
        title: "仲間と高め合う",
        caption: "ともに頑張る仲間がいるから、強くなれる。"
      },
      {
        id: "ending",
        label: "Ending",
        title: "いざ、勝負の舞台へ",
        caption: "全力で挑め。君ならできる。"
      }
    ]
  },
  {
    id: "graduation-thanks",
    name: "卒業式 感謝系",
    tone: "感謝と思い出を丁寧に残す構成",
    title: "卒業式",
    ending: "出会えた日々に、ありがとう",
    chapters: [
      {
        id: "opening",
        label: "Opening",
        title: "卒業式タイトル",
        caption: "この教室で過ごした日々が、今日ひとつの節目を迎える。"
      },
      {
        id: "chapter-1",
        label: "Chapter 1",
        title: "出会いの日",
        caption: "はじめは小さかった背中も、少しずつ頼もしくなった。"
      },
      {
        id: "chapter-2",
        label: "Chapter 2",
        title: "積み重ねた時間",
        caption: "笑った日も悩んだ日も、すべてが大切な思い出。"
      },
      {
        id: "chapter-3",
        label: "Chapter 3",
        title: "感謝をこめて",
        caption: "支えてくれた人たちへ、心からありがとう。"
      },
      {
        id: "ending",
        label: "Ending",
        title: "出会えた日々に、ありがとう",
        caption: "それぞれの未来へ、胸を張って歩いていこう。"
      }
    ]
  },
  {
    id: "summer-course-digest",
    name: "夏期講習 ダイジェスト系",
    tone: "テンポよく頑張りを見せる構成",
    title: "夏期講習",
    ending: "夏の努力が、秋からの力になる",
    chapters: [
      {
        id: "opening",
        label: "Opening",
        title: "夏期講習タイトル",
        caption: "暑い夏、学びに向き合う時間が始まった。"
      },
      {
        id: "chapter-1",
        label: "Chapter 1",
        title: "朝から集中",
        caption: "一日の始まりから、真剣な表情が並ぶ。"
      },
      {
        id: "chapter-2",
        label: "Chapter 2",
        title: "演習と確認",
        caption: "できることを増やすために、何度も解き直した。"
      },
      {
        id: "chapter-3",
        label: "Chapter 3",
        title: "成長の手応え",
        caption: "小さな積み重ねが、大きな自信に変わっていく。"
      },
      {
        id: "ending",
        label: "Ending",
        title: "夏の努力が、秋からの力になる",
        caption: "この夏の頑張りを、次の一歩につなげよう。"
      }
    ]
  }
];

export function getMovieTemplate(id: string): MovieTemplate {
  return movieTemplates.find((template) => template.id === id) ?? movieTemplates[0];
}
