import type { ResultCardKey, TopicId } from "../types";

export const RESULT_CARD_TITLES: Record<ResultCardKey, string> = {
  summary: "1. 핵심 진단",
  currentFlow: "2. 현재 흐름 해석",
  self: "3. 내 상태와 반응",
  other: "4. 상대/환경 해석",
  structure: "5. 문제 구조 정리",
  nearTerm: "6. 가까운 시기 전망",
  do: "7. 지금 해야 할 행동",
  dont: "8. 피해야 할 패턴",
  oneLine: "9. 핵심 문장",
  followUp: "10. 이어서 볼 포인트"
};

export interface TopicBaseTemplate {
  summary: string;
  currentFlow: string;
  self: string;
  other: string;
  structure: string;
  nearTerm: string;
  do: string;
  dont: string;
  oneLine: string;
  nextQuestions: string[];
}

export interface SignalTemplate {
  id: string;
  matches: string[];
  summary?: string;
  currentFlow?: string;
  self?: string;
  other?: string;
  structure?: string;
  nearTerm?: string;
  do?: string;
  dont?: string;
  oneLine?: string;
  nextQuestions?: string[];
}

export const TOPIC_BASE_TEMPLATES: Record<TopicId, TopicBaseTemplate> = {
  romance: {
    summary: "감정보다 관계의 속도 차이를 먼저 읽어야 하는 시기입니다.",
    currentFlow: "호감의 유무보다 템포와 거리 조절이 더 크게 작동하는 흐름입니다.",
    self: "내 쪽에서는 답을 빨리 확인하고 싶은 마음이 커지기 쉽습니다.",
    other: "상대는 감정보다 상황 정리와 페이스 조절을 더 의식할 수 있습니다.",
    structure: "핵심은 좋고 싫음보다 관계를 어디까지 열어 둘지에 대한 기준 차이입니다.",
    nearTerm: "가까운 시기에는 반응은 이어지되 결론은 천천히 드러날 가능성이 있습니다.",
    do: "반응의 크기보다 반복성을 보고 내 기준을 먼저 정리하는 편이 좋습니다.",
    dont: "한 번의 침묵이나 지연을 전체 결론으로 단정하지 않는 것이 좋습니다.",
    oneLine: "감정의 크기보다 흐름의 결을 읽을 때 판단이 선명해집니다.",
    nextQuestions: ["상대가 조심스러운 이유", "이 관계에서 내가 먼저 정할 기준"]
  },
  reunion: {
    summary: "재회 가능성보다 관계가 다시 흔들리는 방식을 먼저 보는 편이 정확합니다.",
    currentFlow: "완전히 닫힌 흐름이라기보다 아직 해석되지 않은 감정이 남아 있습니다.",
    self: "내 마음은 미련과 현실 판단이 번갈아 올라오기 쉽습니다.",
    other: "상대는 감정이 있어도 바로 책임 있는 선택으로 연결하진 않을 수 있습니다.",
    structure: "감정 잔존과 신뢰 회복의 속도가 다르게 움직이는 구조입니다.",
    nearTerm: "작은 재접점이 생겨도 방향을 확인하는 시간이 더 필요할 수 있습니다.",
    do: "다시 만남 자체보다 반복되던 패턴을 먼저 정리하는 것이 좋습니다.",
    dont: "상대의 반응 하나에 의미를 과도하게 부여하는 것은 피하는 편이 좋습니다.",
    oneLine: "다시 이어짐은 감정보다 구조를 정리할 때 현실성이 생깁니다.",
    nextQuestions: ["연락이 와도 바로 결정하지 않는 방법", "내가 아직 놓지 못하는 이유"]
  },
  marriage: {
    summary: "확신은 감정만이 아니라 현실 리듬이 맞을 때 또렷해집니다.",
    currentFlow: "결혼 자체의 운보다 지금 기준을 정비하는 흐름이 먼저 들어와 있습니다.",
    self: "마음속 기준은 높아졌지만 무엇이 핵심 조건인지 압축이 더 필요합니다.",
    other: "상대나 주변은 감정보다 일정과 생활 조건을 중요하게 볼 수 있습니다.",
    structure: "결혼 고민은 타이밍, 책임감, 생활 합이 동시에 움직이는 구조입니다.",
    nearTerm: "결정 압박보다 우선순위 정리가 더 큰 도움이 되는 시기입니다.",
    do: "생활 리듬, 가치관, 책임 분담 같은 현실 항목을 구체화하세요.",
    dont: "막연한 불안만으로 결정을 미루거나 반대로 서두르는 것은 피하세요.",
    oneLine: "확신은 마음이 아니라 기준이 정리될 때 따라옵니다.",
    nextQuestions: ["결혼 전 먼저 볼 현실 조건", "상대와 시기를 맞출 수 있는지"]
  },
  chemistry: {
    summary: "상대 마음은 단일한 답보다 반응의 일관성에서 읽히는 편입니다.",
    currentFlow: "호감의 기운은 있으나 표현의 밀도와 속도는 고르지 않을 수 있습니다.",
    self: "내 쪽에서는 작은 신호를 빠르게 해석하고 싶은 마음이 커지기 쉽습니다.",
    other: "상대는 관심이 있어도 상황과 템포를 조절하려는 경향이 있습니다.",
    structure: "핵심은 마음의 유무보다 표현 방식과 거리 조절의 차이입니다.",
    nearTerm: "반응은 이어질 수 있으나 선명한 확답은 조금 늦게 올 수 있습니다.",
    do: "연락의 양보다 반복되는 패턴과 만남의 의지를 같이 보세요.",
    dont: "반응 속도만으로 마음 전체를 해석하지 않는 편이 좋습니다.",
    oneLine: "마음은 말보다 반복되는 태도에서 먼저 드러납니다.",
    nextQuestions: ["상대가 망설이는 이유", "내가 먼저 기준을 세워야 할 시점"]
  },
  relationships: {
    summary: "관계의 긴장은 감정보다 역할과 기대치 차이에서 커지기 쉽습니다.",
    currentFlow: "누가 옳은가보다 서로 다르게 받아들이는 지점을 확인해야 하는 흐름입니다.",
    self: "내 쪽에서는 설명해도 전달되지 않는 답답함이 있을 수 있습니다.",
    other: "상대는 내 의도보다 자신의 기준과 피로를 먼저 보고 있을 수 있습니다.",
    structure: "오해는 사건 하나보다 누적된 해석 차이에서 커지는 구조입니다.",
    nearTerm: "정면 돌파보다 거리와 밀도를 조절하는 편이 더 안정적입니다.",
    do: "무엇을 바로잡을지보다 무엇을 선명하게 둘지부터 정리하는 편이 좋습니다.",
    dont: "억울함을 바로 해소하려는 마음으로 대화를 밀어붙이지 마세요.",
    oneLine: "설명보다 기준을 정리할 때 관계가 덜 흔들립니다.",
    nextQuestions: ["이 관계를 유지할 가치", "대화를 시도해도 되는 타이밍"]
  },
  family: {
    summary: "가족 문제는 애정의 유무보다 역할의 무게에서 먼저 흔들립니다.",
    currentFlow: "감정 표현보다 부담이 어디에 쏠려 있는지 점검해야 하는 시기입니다.",
    self: "내 쪽에서는 오래 안고 있던 책임 피로가 뒤늦게 드러날 수 있습니다.",
    other: "가족은 내 감정보다 익숙한 역할을 먼저 기대하고 있을 가능성이 큽니다.",
    structure: "가까운 관계일수록 말보다 역할 분담과 기대치의 균형이 중요합니다.",
    nearTerm: "큰 해결보다 선을 다시 긋는 대화가 더 중요해질 수 있습니다.",
    do: "도와줄 수 있는 범위와 어려운 범위를 나눠 말하는 것이 좋습니다.",
    dont: "미안함 때문에 감당 범위를 계속 넓히는 것은 피하세요.",
    oneLine: "가까운 관계일수록 애정보다 경계가 관계를 지킵니다.",
    nextQuestions: ["가족 안에서 내가 놓아야 할 역할", "지금 대화를 시작해도 되는지"]
  },
  career: {
    summary: "지금 일의 답은 버티기와 이동 사이에서 속도를 정하는 데 있습니다.",
    currentFlow: "환경 변화의 신호는 있으나 즉시 이동보다 준비도를 갖추는 흐름이 강합니다.",
    self: "내 쪽에서는 피로와 불안이 함께 쌓여 판단이 흐려질 수 있습니다.",
    other: "조직은 내 속도보다 현실 조건과 성과 기준을 먼저 요구할 가능성이 큽니다.",
    structure: "핵심은 지금 자리를 버티는 문제보다 지속 가능한 방식으로 일할 수 있는지입니다.",
    nearTerm: "준비된 정리와 정보 수집이 실제 변화보다 먼저 힘을 줄 수 있습니다.",
    do: "체력, 시장 정보, 조건 기준을 같이 정리한 뒤 움직임의 우선순위를 세우세요.",
    dont: "소진된 상태에서 인생 전체 결론을 한 번에 내리려 하지 않는 편이 좋습니다.",
    oneLine: "속도를 정하면 선택지가 보이고, 준비를 하면 불안이 줄어듭니다.",
    nextQuestions: ["지금 움직여도 되는 타이밍", "버티더라도 바꿔야 할 일 방식"]
  },
  money: {
    summary: "재물의 흐름은 금액보다 제어감이 흔들리는 지점에서 먼저 봐야 합니다.",
    currentFlow: "당장 큰 손실보다 작은 압박이 반복되며 판단을 흐릴 수 있는 흐름입니다.",
    self: "내 쪽에서는 불안을 줄이려다 오히려 급한 소비나 결정을 하기 쉽습니다.",
    other: "주변 조건이나 일정은 계획보다 예외 지출을 먼저 만들 수 있습니다.",
    structure: "핵심은 수입의 크기보다 지출 리듬과 우선순위의 정렬입니다.",
    nearTerm: "가까운 시기에는 공격적 확대보다 방어적 관리가 더 적합합니다.",
    do: "고정 지출과 감정 소비를 분리해 보는 것이 가장 먼저입니다.",
    dont: "불안을 한 번에 해소하려는 큰 결정을 서두르지 마세요.",
    oneLine: "돈은 늘리기 전에 흐름을 붙잡을 때 안정이 생깁니다.",
    nextQuestions: ["지금 줄여야 할 지출 패턴", "재정 불안을 덜 흔들리게 다루는 법"]
  },
  yearly: {
    summary: "올해는 전부를 넓히기보다 중심 축을 선명히 할수록 안정적입니다.",
    currentFlow: "확장보다 정리와 방향 설정이 먼저 들어오는 흐름입니다.",
    self: "내 쪽에서는 여러 가능성을 동시에 붙들고 싶어 피로가 누적될 수 있습니다.",
    other: "외부 환경은 내 속도보다 현실 조건을 먼저 확인하게 만들 수 있습니다.",
    structure: "올해의 핵심은 운세의 크기보다 리듬을 잘 고르는 데 있습니다.",
    nearTerm: "한두 축에 집중할수록 결과 체감이 빨라질 수 있습니다.",
    do: "올해 가장 키울 것 하나와 줄일 것 하나를 먼저 정하세요.",
    dont: "모든 가능성을 한 번에 챙기려는 방식은 피로를 키울 수 있습니다.",
    oneLine: "올해는 더 많이보다 더 분명하게가 맞는 흐름입니다.",
    nextQuestions: ["올해 가장 힘을 실어야 할 영역", "정리해야 할 관계나 습관"]
  },
  mind: {
    summary: "마음의 답은 빨리 정리하는 것보다 지금 붙잡고 있는 감정의 성격을 아는 데 있습니다.",
    currentFlow: "겉으로는 버티고 있어도 내면에서는 정리되지 않은 감정이 오래 머무를 수 있습니다.",
    self: "내 쪽에서는 이유를 찾는 시간보다 쉬지 못한 피로가 더 크게 작용할 수 있습니다.",
    other: "바깥 환경은 이미 지나간 일처럼 보여도 내 마음은 아직 같은 자리에 머물 수 있습니다.",
    structure: "감정 문제는 해결의 속도보다 회복의 리듬을 다시 잡는 구조로 봐야 합니다.",
    nearTerm: "큰 깨달음보다 작은 정돈이 먼저 도움 되는 시기입니다.",
    do: "지금 나를 가장 지치게 하는 생각 패턴 하나를 구체적으로 적어 보세요.",
    dont: "괜찮은 척 버티며 감정을 무시하는 방식은 오래 가기 어렵습니다.",
    oneLine: "마음은 밀어내기보다 이름을 붙일 때 조금씩 풀립니다.",
    nextQuestions: ["내가 지금 놓지 못하는 감정", "회복 속도를 늦추는 습관"]
  }
};

export const SIGNAL_TEMPLATES: SignalTemplate[] = [
  {
    id: "romance-flirt",
    matches: ["romance.flirt", "chemistry.signal-warm"],
    summary: "관계의 시작 기운은 있으나 속도를 맞추는 과정이 더 중요해 보입니다.",
    currentFlow: "호감은 이어지지만 말보다 반응의 간격에서 조심스러움이 읽히는 흐름입니다.",
    do: "조금 더 선명한 질문은 하되 답을 재촉하기보다 반복성을 확인해 보세요.",
    dont: "확답을 얻기 위해 과도한 표현을 한 번에 쏟는 것은 피하는 편이 좋습니다.",
    nextQuestions: ["상대가 조심스러운 이유", "지금 관계를 서두르면 생길 수 있는 흔들림"]
  },
  {
    id: "romance-undefined",
    matches: ["romance.undefined", "chemistry.mixed"],
    summary: "애매함 자체가 답을 주고 있는 시기일 수 있습니다.",
    structure: "감정이 없어서보다 관계를 정의했을 때 생길 책임을 서로 다르게 보고 있는 구조입니다.",
    nearTerm: "가까운 시기에도 분명한 언어보다 간접적인 반응이 먼저 반복될 가능성이 있습니다.",
    do: "내가 원하는 관계의 기준을 먼저 정한 뒤 애매함을 오래 끌지 않을 선을 세워 보세요."
  },
  {
    id: "reunion-open",
    matches: ["reunion.contact-open", "reunion.recent"],
    summary: "흐름은 아직 닫히지 않았지만 다시 시작보다 반복 구조 점검이 먼저입니다.",
    other: "상대도 마음이 완전히 정리되었다기보다 감정과 현실 사이에서 머뭇거릴 수 있습니다.",
    dont: "연락이 온다는 이유만으로 관계가 달라졌다고 단정하지 않는 것이 좋습니다."
  },
  {
    id: "reunion-closed",
    matches: ["reunion.contact-closed", "reunion.long-gap"],
    summary: "지금은 재회 그 자체보다 내 감정의 정리 방향을 먼저 보는 편이 맞습니다.",
    currentFlow: "상대 흐름은 느리거나 닫혀 있고 내 쪽에서 의미를 오래 붙잡기 쉬운 시기입니다.",
    do: "다시 이어질지보다 내가 이 관계에서 무엇을 놓지 못하는지부터 점검해 보세요."
  },
  {
    id: "career-transition",
    matches: ["career.change", "career.search"],
    summary: "움직임의 운은 있으나 준비된 이동일수록 결과가 안정적입니다.",
    nearTerm: "이력 정리, 정보 탐색, 조건 비교가 실제 전환보다 먼저 힘을 줄 수 있습니다."
  },
  {
    id: "career-burnout",
    matches: ["career.burnout", "career.low-energy"],
    summary: "문제의 중심은 능력 부족보다 소진 누적에 더 가깝습니다.",
    self: "지금은 의욕이 없는 것이 아니라 회복 여력이 많이 줄어 있는 상태일 수 있습니다.",
    do: "큰 결정을 미루기보다 체력을 회복할 최소 기준부터 세우는 것이 좋습니다."
  },
  {
    id: "money-control",
    matches: ["money.control", "money.plan"],
    summary: "재정은 급한 확장보다 통제 범위를 다시 잡을 때 안정이 붙습니다.",
    do: "예외 지출을 먼저 줄이고 작은 기준을 꾸준히 지키는 방식이 맞습니다."
  },
  {
    id: "money-expense",
    matches: ["money.big-expense", "money.pressure"],
    summary: "큰 지출 압박이 판단을 서두르게 만들 수 있어 속도 조절이 중요합니다.",
    dont: "불안을 줄이기 위해 큰 결정을 빠르게 확정하는 방식은 피하세요."
  },
  {
    id: "year-reset",
    matches: ["year.reset", "year.clean-up"],
    summary: "올해는 새로 넓히기보다 정리 후 재정렬이 더 잘 맞는 흐름입니다.",
    currentFlow: "비우고 다듬는 일이 먼저일수록 이후의 속도가 안정적으로 붙습니다."
  },
  {
    id: "mind-anxious",
    matches: ["mind.anxious", "mind.overthinking"],
    summary: "지금 마음은 답이 없어서보다 생각이 너무 많아져 지친 상태에 가깝습니다.",
    do: "생각을 정리하려 하기보다 반복되는 불안 장면을 한 문장으로 좁혀 보는 것이 좋습니다."
  },
  {
    id: "family-role",
    matches: ["family.role", "family.expectation"],
    summary: "가족 문제의 중심은 애정 부족보다 역할 과부하에 더 가깝습니다.",
    structure: "익숙하게 맡아 온 책임이 당연한 것으로 굳어져 있을 가능성이 큽니다."
  },
  {
    id: "relationships-competition",
    matches: ["relationships.tension", "relationships.competition"],
    summary: "관계의 불편함은 감정 충돌보다 위치 경쟁에서 커졌을 수 있습니다.",
    do: "상대의 평가보다 내 역할 경계와 우선순위를 정리하는 편이 더 효과적입니다."
  }
];
