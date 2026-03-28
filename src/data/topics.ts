import type { AppBanner, TopicDefinition } from "../types";

export const TOPICS: TopicDefinition[] = [
  {
    id: "romance",
    label: "연애",
    description: "지금 관계의 흐름과 감정의 온도를 본다.",
    shortBlurb: "썸, 연애 중, 애매한 관계까지 흐름 중심으로 정리",
    featuredPrompt: "지금 관계가 어디쯤 와 있는지 보고 싶어요.",
    accent: "#1b66f8",
    estimatedMinutes: 3
  },
  {
    id: "reunion",
    label: "재회",
    description: "끊어진 흐름이 다시 이어질 여지가 있는지 본다.",
    shortBlurb: "연락 상태와 감정 잔존을 함께 살피는 재회 상담",
    featuredPrompt: "다시 이어질 가능성보다, 지금 무엇을 봐야 하는지 알고 싶어요.",
    accent: "#3565ff",
    estimatedMinutes: 4
  },
  {
    id: "marriage",
    label: "결혼",
    description: "확신, 현실 조건, 시기 리듬을 함께 본다.",
    shortBlurb: "상대가 있든 없든 결혼 고민의 위치를 정리",
    featuredPrompt: "결혼 생각은 있는데 지금 판단의 기준이 흔들려요.",
    accent: "#127c7a",
    estimatedMinutes: 4
  },
  {
    id: "chemistry",
    label: "썸/상대 마음",
    description: "상대 반응의 결을 살펴 관계의 선명도를 읽는다.",
    shortBlurb: "연락 빈도, 반응 속도, 거리감을 가볍게 점검",
    featuredPrompt: "상대가 마음이 있는지, 속도 차이만 있는지 궁금해요.",
    accent: "#0e8f6f",
    estimatedMinutes: 3
  },
  {
    id: "relationships",
    label: "인간관계",
    description: "오해, 거리감, 경쟁 구조를 차분히 정리한다.",
    shortBlurb: "친구, 동료, 윗사람 관계의 긴장을 해석",
    featuredPrompt: "말을 많이 하지 않아도 관계 흐름을 파악하고 싶어요.",
    accent: "#6074ff",
    estimatedMinutes: 3
  },
  {
    id: "family",
    label: "가족",
    description: "가까운 관계 안의 역할 부담과 감정 거리를 본다.",
    shortBlurb: "부모 기대, 형제 거리감, 역할 부담을 점검",
    featuredPrompt: "가족 안에서 왜 유독 마음이 무거운지 알고 싶어요.",
    accent: "#11698a",
    estimatedMinutes: 3
  },
  {
    id: "career",
    label: "직장/이직",
    description: "지금 조직에 남을지, 이동할지 리듬을 살핀다.",
    shortBlurb: "이직 고민, 갈등, 번아웃, 성장 정체를 해석",
    featuredPrompt: "버티는 게 맞는지, 움직일 때인지 판단이 필요해요.",
    accent: "#0f766e",
    estimatedMinutes: 4
  },
  {
    id: "money",
    label: "재물/소비",
    description: "수입과 지출의 균형이 흔들리는 지점을 본다.",
    shortBlurb: "소비 흐름, 압박 요인, 우선순위 정리",
    featuredPrompt: "돈 문제를 숫자보다 흐름으로 보고 싶어요.",
    accent: "#2364aa",
    estimatedMinutes: 3
  },
  {
    id: "yearly",
    label: "올해 흐름",
    description: "올해의 중심 축과 속도 조절 포인트를 본다.",
    shortBlurb: "일, 관계, 회복, 재출발 중 어디에 힘이 실리는지",
    featuredPrompt: "올해를 어떻게 보내야 덜 흔들릴지 알고 싶어요.",
    accent: "#2f6fed",
    estimatedMinutes: 3
  },
  {
    id: "mind",
    label: "마음의 방향",
    description: "감정의 중심이 어디에 머무는지 정리한다.",
    shortBlurb: "불안, 무기력, 미련, 답답함을 흐름으로 읽기",
    featuredPrompt: "지금 내 마음이 어디에서 막히는지 보고 싶어요.",
    accent: "#3b82f6",
    estimatedMinutes: 3
  }
];

export const DEFAULT_BANNER: AppBanner = {
  id: "launch-notice",
  title: "참고용 해석 안내",
  body: "결과는 흐름과 경향을 읽는 참고용 문장으로 제공됩니다. 중요한 결정은 현실 정보와 함께 판단해 주세요.",
  tone: "notice",
  actionLabel: "유의사항 보기",
  actionPath: "/notice"
};

export const TOPIC_LABEL_MAP = TOPICS.reduce<Record<string, string>>((acc, topic) => {
  acc[topic.id] = topic.label;
  return acc;
}, {});
