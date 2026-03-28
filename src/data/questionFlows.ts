import type { QuestionNode, QuestionOption, TopicFlow, TopicId } from "../types";

const FLOW_VERSION = "2026.03.r1";

function option(
  id: string,
  label: string,
  description: string,
  next: string | null,
  tags: string[]
): QuestionOption {
  return { id, label, description, next, tags };
}

function node(
  topicId: TopicId,
  id: string,
  prompt: string,
  helper: string,
  options: QuestionOption[],
  resultTags: string[] = []
): QuestionNode {
  return {
    id,
    topicId,
    version: FLOW_VERSION,
    prompt,
    helper,
    type: "single_select",
    options,
    resultTags
  };
}

export const TOPIC_FLOWS: TopicFlow[] = [
  {
    topicId: "romance",
    version: FLOW_VERSION,
    startNodeId: "romance.state",
    nodes: [
      node("romance", "romance.state", "지금 가장 가까운 상태를 골라 주세요.", "현재 위치에 따라 다음 질문이 달라집니다.", [
        option("flirt", "썸 단계예요", "가볍게 이어지지만 확답은 없는 상태", "romance.flirt-concern", ["romance.flirt", "chemistry.signal-warm"]),
        option("dating", "연애 중이에요", "관계는 시작됐지만 고민이 있어요", "romance.dating-concern", ["romance.dating"]),
        option("undefined", "애매한 관계예요", "가깝긴 한데 정의가 어렵습니다", "romance.undefined-concern", ["romance.undefined", "chemistry.mixed"]),
        option("none", "상대가 없어요", "누군가보다 내 흐름이 궁금해요", "romance.none-focus", ["romance.no-person"])
      ], ["topic.romance"]),
      node("romance", "romance.flirt-concern", "썸 단계에서 가장 걸리는 점은 무엇인가요?", "한 번의 반응보다 반복되는 패턴을 기준으로 봅니다.", [
        option("mixed-signal", "상대 반응이 들쑥날쑥해요", "좋을 때와 멀 때 차이가 큽니다", null, ["romance.signal-mixed"]),
        option("slow", "속도가 너무 느려요", "관계가 계속 제자리 같아요", null, ["romance.slow", "romance.flirt"]),
        option("unclear", "표현은 있는데 정의가 없어요", "좋아하는지 아닌지 애매합니다", null, ["romance.undefined"])
      ], ["stage.flirt"]),
      node("romance", "romance.dating-concern", "연애 중인 관계에서 지금 가장 큰 고민은 무엇인가요?", "감정의 크기보다 관계 운영 방식이 더 중요할 수 있습니다.", [
        option("future", "앞으로의 방향이 불안해요", "미래 이야기에서 온도 차이가 납니다", null, ["romance.future"]),
        option("distance", "최근 거리감이 느껴져요", "예전보다 반응이나 밀도가 줄었습니다", null, ["romance.distance"]),
        option("conflict", "대화하면 자꾸 부딪혀요", "말이 길어질수록 피곤해집니다", null, ["romance.conflict"])
      ], ["stage.dating"]),
      node("romance", "romance.undefined-concern", "애매한 관계에서 가장 답답한 지점은 무엇인가요?", "애매함의 원인이 감정 부족인지, 책임 회피인지 구분해 봅니다.", [
        option("repeat", "가까워졌다 멀어져요", "온오프가 반복됩니다", null, ["romance.undefined", "romance.on-off"]),
        option("label", "관계 정의를 피하는 느낌이에요", "명확한 언어를 피합니다", null, ["romance.undefined", "romance.label-avoid"]),
        option("timing", "지금은 아니라는 말만 들어요", "마음보다 상황을 내세웁니다", null, ["romance.timing-gap"])
      ], ["stage.undefined"]),
      node("romance", "romance.none-focus", "지금 연애와 관련해 더 알고 싶은 것은 무엇인가요?", "상대가 없어도 내 흐름과 준비도를 볼 수 있습니다.", [
        option("timing", "언제쯤 흐름이 열릴지 궁금해요", "시기감과 마음의 여유를 보고 싶어요", null, ["romance.timing-open"]),
        option("readiness", "내가 관계를 받을 준비가 됐는지 궁금해요", "마음의 방향부터 보고 싶어요", null, ["romance.readiness"]),
        option("pattern", "왜 늘 비슷한 패턴이 반복되는지 궁금해요", "만날 때마다 흔들리는 지점이 있어요", null, ["romance.pattern-repeat"])
      ], ["stage.none"])
    ]
  },
  {
    topicId: "reunion",
    version: FLOW_VERSION,
    startNodeId: "reunion.state",
    nodes: [
      node("reunion", "reunion.state", "현재 재회 고민의 상태는 어디에 가깝나요?", "연락의 유무와 시간 간격에 따라 흐름 해석이 달라집니다.", [
        option("recent", "헤어진 지 얼마 안 됐어요", "감정이 아직 선명합니다", "reunion.recent-contact", ["reunion.recent"]),
        option("long-gap", "시간이 꽤 지났어요", "오래 끊긴 흐름이 궁금합니다", "reunion.long-gap", ["reunion.long-gap"]),
        option("contact-open", "가끔 연락은 돼요", "완전히 끊기진 않았습니다", "reunion.contact-open", ["reunion.contact-open"]),
        option("contact-closed", "연락이 완전히 끊겼어요", "상대 반응을 알기 어렵습니다", "reunion.contact-closed", ["reunion.contact-closed"])
      ], ["topic.reunion"]),
      node("reunion", "reunion.recent-contact", "최근 이별이라면 지금 가장 힘든 부분은 무엇인가요?", "감정보다 반복 패턴을 먼저 봐야 재회 가능성을 덜 오해합니다.", [
        option("missing", "감정이 너무 남아 있어요", "놓았다고 생각해도 다시 흔들립니다", null, ["reunion.missing"]),
        option("regret", "내가 잘못한 부분이 자꾸 생각나요", "후회가 큽니다", null, ["reunion.regret"]),
        option("uncertain", "상대 마음이 남아 있는지 모르겠어요", "닫힌 건지 미완성인지 애매합니다", null, ["reunion.open-ended"])
      ], ["state.recent-breakup"]),
      node("reunion", "reunion.long-gap", "시간이 지난 재회 고민이라면 무엇이 남아 있나요?", "긴 공백 뒤에는 감정보다 내 해석이 더 커져 있을 수 있습니다.", [
        option("memory", "좋았던 기억이 자꾸 남아요", "실제보다 기억이 더 선명합니다", null, ["reunion.memory"]),
        option("unfinished", "끝난 이유가 정리되지 않았어요", "납득이 되지 않습니다", null, ["reunion.unfinished"]),
        option("curious", "상대가 지금 어떻게 생각하는지 궁금해요", "마음보다 현재 상태가 궁금합니다", null, ["reunion.curious"])
      ], ["state.long-gap"]),
      node("reunion", "reunion.contact-open", "연락이 이어지는 상황이라면 어떤 패턴인가요?", "연락이 있다는 사실과 관계가 회복된다는 뜻은 다를 수 있습니다.", [
        option("practical", "필요할 때만 연락해요", "용건 중심의 연락입니다", null, ["reunion.practical-contact"]),
        option("warm", "분위기는 나쁘지 않아요", "말은 이어지지만 확답은 없습니다", null, ["reunion.contact-open", "reunion.warm"]),
        option("on-off", "왔다가 끊기기를 반복해요", "기대와 실망이 번갈아 옵니다", null, ["reunion.on-off"])
      ], ["state.contact-open"]),
      node("reunion", "reunion.contact-closed", "연락이 끊긴 상황에서 가장 궁금한 것은 무엇인가요?", "지금은 재회 신호보다 내 정리 방향이 먼저일 수 있습니다.", [
        option("will-reach", "다시 연락이 올지 궁금해요", "가능성과 시기를 알고 싶어요", null, ["reunion.contact-closed", "reunion.waiting"]),
        option("move-on", "놓아야 하는지 알고 싶어요", "기다리는 게 맞는지 흔들립니다", null, ["reunion.release"]),
        option("self", "내가 왜 이 관계를 못 놓는지 궁금해요", "감정의 구조를 보고 싶어요", null, ["reunion.self-insight"])
      ], ["state.contact-closed"])
    ]
  },
  {
    topicId: "marriage",
    version: FLOW_VERSION,
    startNodeId: "marriage.state",
    nodes: [
      node("marriage", "marriage.state", "결혼 고민은 지금 어떤 상태에 가까운가요?", "상대 유무와 현실 조건의 압박 정도에 따라 질문이 갈립니다.", [
        option("with-partner", "상대와 결혼을 고민 중이에요", "관계는 있지만 판단이 어렵습니다", "marriage.with-partner", ["marriage.partnered"]),
        option("timeline", "상대는 있지만 시기만 흔들려요", "언제 결정을 내려야 할지 모르겠습니다", "marriage.timeline", ["marriage.timeline"]),
        option("single", "상대 없이 결혼운이 궁금해요", "언제쯤 결혼 흐름이 오는지 궁금합니다", "marriage.single", ["marriage.single"]),
        option("pressure", "주변 압박이 커요", "내 뜻보다 외부 기대가 큽니다", "marriage.pressure", ["marriage.pressure"])
      ], ["topic.marriage"]),
      node("marriage", "marriage.with-partner", "상대가 있는 상황이라면 무엇이 가장 걸리나요?", "감정만 좋다고 결혼이 선명해지는 흐름은 아닐 수 있습니다.", [
        option("values", "가치관 차이가 보여요", "생활 방식과 기준이 다릅니다", null, ["marriage.values"]),
        option("stability", "경제나 현실 조건이 불안해요", "마음보다 현실이 먼저 걸립니다", null, ["marriage.stability"]),
        option("certainty", "확신이 부족해요", "좋지만 결혼까지는 확답이 어렵습니다", null, ["marriage.certainty"])
      ], ["state.partnered"]),
      node("marriage", "marriage.timeline", "시기 고민이라면 무엇이 가장 흔들리나요?", "결정 압박과 준비도의 속도는 다를 수 있습니다.", [
        option("delay", "자꾸 미뤄져요", "말은 있었는데 계속 뒤로 갑니다", null, ["marriage.delay"]),
        option("compare", "주변과 비교돼요", "또래 흐름이 자꾸 신경 쓰입니다", null, ["marriage.compare"]),
        option("work", "일과 결혼 타이밍이 충돌해요", "한쪽을 택해야 할 것 같습니다", null, ["marriage.work-balance"])
      ], ["state.timeline"]),
      node("marriage", "marriage.single", "상대 없는 상태라면 무엇을 가장 보고 싶나요?", "결혼운은 만남 자체보다 기준과 준비도를 함께 봐야 합니다.", [
        option("meet", "언제쯤 인연 흐름이 오는지", "새 관계가 열리는 시기감이 궁금해요", null, ["marriage.meeting"]),
        option("pattern", "왜 결혼 얘기까지 안 이어지는지", "항상 중간에서 멈춥니다", null, ["marriage.pattern"]),
        option("standard", "내 기준이 너무 높은지", "기준을 다시 보고 싶어요", null, ["marriage.standard"])
      ], ["state.single"]),
      node("marriage", "marriage.pressure", "주변 압박이 큰 상황이라면 무엇이 가장 부담인가요?", "외부 기대와 내 준비도는 분리해서 보는 편이 정확합니다.", [
        option("family", "가족의 기대가 커요", "설명해야 한다는 압박이 있습니다", null, ["marriage.family-pressure"]),
        option("age", "나이에 대한 불안이 커요", "시간이 없다는 느낌이 듭니다", null, ["marriage.age-pressure"]),
        option("choice", "내 선택이 맞는지 자신이 없어요", "누구의 기준인지 헷갈립니다", null, ["marriage.choice-anxiety"])
      ], ["state.pressure"])
    ]
  },
  {
    topicId: "chemistry",
    version: FLOW_VERSION,
    startNodeId: "chemistry.context",
    nodes: [
      node("chemistry", "chemistry.context", "상대와의 관계는 어느 쪽에 가깝나요?", "만나는 접점에 따라 마음이 드러나는 방식이 달라집니다.", [
        option("coworker", "직장이나 같은 조직에서 봐요", "자주 보지만 조심스러운 관계", "chemistry.coworker", ["chemistry.context-work"]),
        option("friend", "친구처럼 알고 지내요", "편하지만 선이 애매합니다", "chemistry.friend", ["chemistry.context-friend"]),
        option("app", "소개팅/앱으로 만났어요", "초반 속도가 중요해 보여요", "chemistry.app", ["chemistry.context-match"]),
        option("ex", "예전에 알던 사이예요", "과거 맥락이 남아 있습니다", "chemistry.ex", ["chemistry.context-past"])
      ], ["topic.chemistry"]),
      node("chemistry", "chemistry.coworker", "같은 조직에서 보는 사이라면 어떤 점이 궁금한가요?", "표현보다 거리 조절이 더 큰 신호일 수 있습니다.", [
        option("eye", "눈치와 분위기가 느껴져요", "말보다 시선과 반응이 남습니다", null, ["chemistry.signal-warm"]),
        option("careful", "서로 조심스러워요", "마음은 있는데 티를 못 내는 듯합니다", null, ["chemistry.careful"]),
        option("cold", "업무 밖에서는 차가워 보여요", "관심이 없는 건지 헷갈립니다", null, ["chemistry.mixed"])
      ], ["context.work"]),
      node("chemistry", "chemistry.friend", "친구 같은 관계라면 지금 가장 헷갈리는 점은 무엇인가요?", "익숙함과 호감은 비슷해 보여도 다르게 움직일 수 있습니다.", [
        option("special", "나에게만 특별한 느낌이 있어요", "다른 사람과는 달라 보입니다", null, ["chemistry.special"]),
        option("late", "답장은 오는데 늘 늦어요", "속도를 알기 어렵습니다", null, ["chemistry.delay"]),
        option("friendly", "친절한 건지 호감인지 모르겠어요", "선명한 신호가 없습니다", null, ["chemistry.mixed"])
      ], ["context.friend"]),
      node("chemistry", "chemistry.app", "소개팅/앱으로 만난 흐름이라면 무엇이 궁금한가요?", "초반에는 말보다 다음 만남의 의지가 더 중요합니다.", [
        option("repeat", "연락은 이어지는데 약속이 안 잡혀요", "관심과 실행이 다릅니다", null, ["chemistry.follow-through-low"]),
        option("fast", "초반 반응은 뜨거웠어요", "지금도 그 흐름이 이어질지 궁금합니다", null, ["chemistry.signal-warm"]),
        option("fade", "갑자기 흐려졌어요", "처음보다 확실히 밀도가 낮아졌습니다", null, ["chemistry.fade"])
      ], ["context.match"]),
      node("chemistry", "chemistry.ex", "예전에 알던 사이라면 지금 가장 필요한 판단은 무엇인가요?", "과거 인상이 현재 마음처럼 보일 수 있어 구분이 필요합니다.", [
        option("old-feel", "예전 감정이 다시 살아난 것 같아요", "반가움 이상이 있는지 궁금합니다", null, ["chemistry.past-feeling"]),
        option("mixed", "다정한데 방향은 없어요", "호감인지 익숙함인지 어렵습니다", null, ["chemistry.mixed"]),
        option("care", "상대가 나를 챙기는 느낌이 있어요", "의미를 더 봐도 되는지 궁금합니다", null, ["chemistry.signal-warm"])
      ], ["context.past"])
    ]
  },
  {
    topicId: "relationships",
    version: FLOW_VERSION,
    startNodeId: "relationships.target",
    nodes: [
      node("relationships", "relationships.target", "지금 가장 신경 쓰이는 관계는 누구와의 관계인가요?", "상대의 위치에 따라 오해의 구조가 달라집니다.", [
        option("friend", "친구 관계", "가까웠는데 요즘 불편해요", "relationships.friend", ["relationships.friend"]),
        option("coworker", "동료 관계", "일하면서 자꾸 부딪힙니다", "relationships.coworker", ["relationships.coworker"]),
        option("leader", "윗사람과의 관계", "평가와 압박이 신경 쓰입니다", "relationships.leader", ["relationships.leader"]),
        option("group", "모임이나 집단 안의 관계", "소외감이나 긴장이 있습니다", "relationships.group", ["relationships.group"])
      ], ["topic.relationships"]),
      node("relationships", "relationships.friend", "친구 관계라면 어떤 감정이 가장 크나요?", "가까운 관계일수록 사건보다 기대치 차이가 큽니다.", [
        option("distance", "전보다 멀어진 느낌이에요", "예전처럼 편하지 않습니다", null, ["relationships.distance"]),
        option("competition", "은근한 경쟁이 느껴져요", "비교당하는 느낌이 있습니다", null, ["relationships.competition", "relationships.tension"]),
        option("misunderstood", "내 마음이 잘 전달되지 않아요", "설명해도 풀리지 않습니다", null, ["relationships.misunderstood"])
      ], ["target.friend"]),
      node("relationships", "relationships.coworker", "동료 관계라면 가장 피로한 지점은 어디인가요?", "업무 갈등과 감정 갈등은 분리해서 보는 편이 좋습니다.", [
        option("boundary", "업무 경계가 흐려져요", "내 역할이 자꾸 넓어집니다", null, ["relationships.boundary"]),
        option("tone", "말투나 태도가 거슬려요", "작은 마찰이 누적됩니다", null, ["relationships.tension"]),
        option("credit", "내 기여가 인정되지 않는 느낌이에요", "평가 문제가 걸립니다", null, ["relationships.competition"])
      ], ["target.coworker"]),
      node("relationships", "relationships.leader", "윗사람과의 관계라면 무엇이 가장 부담인가요?", "평가 관계에서는 감정 해석보다 패턴 파악이 우선입니다.", [
        option("pressure", "계속 압박받는 느낌이에요", "편하게 일하기 어렵습니다", null, ["relationships.pressure"]),
        option("favor", "유난히 나에게만 엄격해 보여요", "기준이 다르게 느껴집니다", null, ["relationships.bias"]),
        option("unclear", "무엇을 원하는지 잘 모르겠어요", "말은 있지만 기준이 흐립니다", null, ["relationships.unclear"])
      ], ["target.leader"]),
      node("relationships", "relationships.group", "집단 안의 관계라면 어떤 장면이 가장 신경 쓰이나요?", "단일 상대보다 분위기 구조를 읽어야 정확합니다.", [
        option("outsider", "묘하게 겉도는 느낌이 있어요", "내가 비켜나 있는 듯합니다", null, ["relationships.outsider"]),
        option("talk", "뒤에서 말이 도는 것 같아요", "확실치 않지만 마음이 쓰입니다", null, ["relationships.gossip"]),
        option("split", "편이 갈리는 분위기예요", "누구 편에도 서기 어렵습니다", null, ["relationships.split"])
      ], ["target.group"])
    ]
  },
  {
    topicId: "family",
    version: FLOW_VERSION,
    startNodeId: "family.target",
    nodes: [
      node("family", "family.target", "가족 안에서 가장 마음이 쓰이는 대상은 누구인가요?", "가까운 관계일수록 감정보다 역할 구조가 먼저 보일 수 있습니다.", [
        option("parent", "부모와의 관계", "기대와 부담이 큽니다", "family.parent", ["family.parent"]),
        option("sibling", "형제자매와의 관계", "거리감이나 비교가 있습니다", "family.sibling", ["family.sibling"]),
        option("partner", "배우자/동거 가족과의 관계", "생활 리듬이 걸립니다", "family.partner", ["family.partner"]),
        option("role", "가족 전체에서 내 역할이 버거워요", "돌봄이나 책임이 쏠립니다", "family.role", ["family.role", "family.expectation"])
      ], ["topic.family"]),
      node("family", "family.parent", "부모와의 관계라면 무엇이 가장 무겁나요?", "사랑과 기대가 한꺼번에 얽혀 있을 수 있습니다.", [
        option("expectation", "기대에 맞춰야 한다는 압박이 커요", "내 선택보다 반응이 먼저 신경 쓰입니다", null, ["family.expectation"]),
        option("distance", "정이 있지만 대화가 어렵습니다", "가까운데도 멀게 느껴집니다", null, ["family.distance"]),
        option("care", "실질적인 돌봄 부담이 커요", "체력과 마음이 같이 소진됩니다", null, ["family.care-load"])
      ], ["target.parent"]),
      node("family", "family.sibling", "형제자매 관계라면 어떤 점이 가장 신경 쓰이나요?", "비교와 역할 불균형이 감정보다 오래 남을 수 있습니다.", [
        option("compare", "비교받는 느낌이 있어요", "평가가 마음에 남습니다", null, ["family.compare"]),
        option("distance", "각자 멀어진 느낌이에요", "말을 안 하게 됐습니다", null, ["family.distance"]),
        option("burden", "내가 더 많이 떠안는 것 같아요", "책임이 고르지 않습니다", null, ["family.role"])
      ], ["target.sibling"]),
      node("family", "family.partner", "배우자/동거 가족과의 관계라면 무엇이 가장 흔들리나요?", "생활 리듬 문제는 감정보다 누적 피로에서 커질 수 있습니다.", [
        option("tone", "사소한 말로 자주 부딪혀요", "작은 피로가 쌓여 있습니다", null, ["family.tension"]),
        option("money", "생활비나 역할 분담이 걸려요", "현실 문제로 예민합니다", null, ["family.role", "family.money"]),
        option("distance", "같이 있어도 정서적 거리감이 커요", "대화가 적고 공기가 무겁습니다", null, ["family.distance"])
      ], ["target.partner"]),
      node("family", "family.role", "가족 전체에서의 역할 부담이라면 어느 쪽에 더 가깝나요?", "내가 감당하는 몫의 선을 다시 보는 것이 중요할 수 있습니다.", [
        option("care", "돌봄 책임이 쏠려 있어요", "늘 내가 챙겨야 하는 분위기입니다", null, ["family.role", "family.care-load"]),
        option("mediator", "중간에서 조율하는 역할이에요", "누구 편도 못 들고 지칩니다", null, ["family.mediator"]),
        option("financial", "경제적 책임이 부담돼요", "말 못 한 압박이 있습니다", null, ["family.money"])
      ], ["target.role"])
    ]
  },
  {
    topicId: "career",
    version: FLOW_VERSION,
    startNodeId: "career.state",
    nodes: [
      node("career", "career.state", "일과 관련해 지금 가장 가까운 고민은 무엇인가요?", "남을지, 옮길지, 쉬어야 할지에 따라 흐름이 달라집니다.", [
        option("stay", "지금 회사에 남을지 고민돼요", "버텨야 할지 모르겠습니다", "career.stay", ["career.stay"]),
        option("change", "이직을 진지하게 고민 중이에요", "옮길 타이밍이 궁금합니다", "career.change", ["career.change", "career.search"]),
        option("burnout", "너무 지쳐 있어요", "결정보다 회복이 먼저일 수 있습니다", "career.burnout", ["career.burnout", "career.low-energy"]),
        option("conflict", "사람 문제로 힘들어요", "상사나 팀 갈등이 큽니다", "career.conflict", ["career.conflict"])
      ], ["topic.career"]),
      node("career", "career.stay", "지금 회사에 남는 고민이라면 무엇이 가장 흔들리나요?", "환경 문제인지 성장 정체인지 구분하는 편이 좋습니다.", [
        option("growth", "성장이 멈춘 느낌이에요", "배우는 감각이 줄었습니다", null, ["career.stagnation"]),
        option("recognition", "인정받지 못하는 느낌이에요", "성과 대비 보상이 아쉽습니다", null, ["career.recognition"]),
        option("fear", "나가자니 불안해요", "떠날 준비가 안 된 것 같습니다", null, ["career.fear"])
      ], ["state.stay"]),
      node("career", "career.change", "이직 고민이라면 지금 어디까지 와 있나요?", "움직임의 운과 준비도의 속도는 다를 수 있습니다.", [
        option("search", "정보 탐색을 시작했어요", "시장 흐름과 조건을 보고 있습니다", null, ["career.search"]),
        option("apply", "지원 직전이거나 지원 중이에요", "실행 단계로 넘어가고 있습니다", null, ["career.apply"]),
        option("offer", "제안은 있지만 결정을 못 하겠어요", "비교 기준이 필요합니다", null, ["career.offer"])
      ], ["state.change"]),
      node("career", "career.burnout", "소진감이 크다면 어떤 모습으로 나타나나요?", "의욕 부족이 아니라 회복 여력 부족일 수 있습니다.", [
        option("body", "몸이 먼저 버거워요", "출근 자체가 피곤합니다", null, ["career.low-energy"]),
        option("emotion", "작은 일에도 예민해져요", "감정 소모가 큽니다", null, ["career.burnout"]),
        option("blank", "아무 판단도 하기 싫어요", "생각 자체가 멈춘 느낌입니다", null, ["career.freeze"])
      ], ["state.burnout"]),
      node("career", "career.conflict", "사람 문제라면 어떤 구조에 더 가깝나요?", "누가 맞는가보다 내 경계와 지속 가능성을 보는 편이 중요합니다.", [
        option("boss", "상사와의 긴장이 커요", "말 한마디가 계속 마음에 남습니다", null, ["career.boss-conflict"]),
        option("team", "팀 내 역할 충돌이 있어요", "일과 감정이 섞여 피곤합니다", null, ["career.team-conflict"]),
        option("politics", "정치적인 분위기가 버거워요", "실력보다 눈치가 중요해 보여요", null, ["career.politics"])
      ], ["state.conflict"])
    ]
  },
  {
    topicId: "money",
    version: FLOW_VERSION,
    startNodeId: "money.state",
    nodes: [
      node("money", "money.state", "돈과 관련해 지금 가장 신경 쓰이는 것은 무엇인가요?", "수입 문제인지 지출 리듬 문제인지에 따라 조언이 달라집니다.", [
        option("control", "자꾸 새는 느낌이에요", "소비가 통제가 안 됩니다", "money.control", ["money.control", "money.plan"]),
        option("expense", "큰 지출 압박이 있어요", "목돈 문제가 걸립니다", "money.expense", ["money.big-expense", "money.pressure"]),
        option("income", "수입이 불안정해요", "들쑥날쑥해서 계획이 어렵습니다", "money.income", ["money.income"]),
        option("debt", "빚이나 상환 부담이 커요", "마음이 계속 눌립니다", "money.debt", ["money.debt"])
      ], ["topic.money"]),
      node("money", "money.control", "소비 통제가 어려운 상황이라면 어느 쪽에 더 가깝나요?", "불안을 줄이기 위한 소비인지, 습관성 소비인지 구분해 봅니다.", [
        option("emotion", "감정적으로 쓰게 돼요", "스트레스가 쌓이면 지출이 늘어납니다", null, ["money.emotion-spend"]),
        option("small", "작은 지출이 쌓여요", "하나하나는 작지만 반복됩니다", null, ["money.small-leak"]),
        option("subscription", "고정 지출이 많아요", "줄이기 어려운 비용이 큽니다", null, ["money.fixed-cost"])
      ], ["state.control"]),
      node("money", "money.expense", "큰 지출 압박이라면 무엇이 가장 부담인가요?", "큰 결정일수록 속도 조절이 더 중요할 수 있습니다.", [
        option("home", "주거/이사 비용이 걸려요", "한 번에 나갈 돈이 큽니다", null, ["money.home-cost"]),
        option("family", "가족 관련 지출이 부담돼요", "내 선택이 아닌 비용도 있습니다", null, ["money.family-cost"]),
        option("purchase", "큰 구매를 앞두고 있어요", "지금 해도 되는지 고민됩니다", null, ["money.big-expense"])
      ], ["state.expense"]),
      node("money", "money.income", "수입 불안정이라면 어떤 모습이 가장 걱정되나요?", "숫자보다 예측 가능성이 낮은 상태가 피로를 키웁니다.", [
        option("freelance", "들어오는 시기가 들쑥날쑥해요", "계획이 자꾸 바뀝니다", null, ["money.variable-cycle"]),
        option("job", "일이 줄어들까 불안해요", "다음 달이 막연합니다", null, ["money.income-anxiety"]),
        option("side", "부수입을 늘려야 할지 고민돼요", "지금 구조를 넓힐지 고민합니다", null, ["money.side-income"])
      ], ["state.income"]),
      node("money", "money.debt", "상환 부담이라면 어떤 점이 가장 무겁나요?", "빚 문제는 수치보다 통제감 회복이 먼저일 수 있습니다.", [
        option("monthly", "매달 갚는 압박이 커요", "고정 부담이 스트레스입니다", null, ["money.monthly-pressure"]),
        option("shame", "스스로를 자꾸 탓하게 돼요", "감정적인 무게가 큽니다", null, ["money.self-blame"]),
        option("plan", "어떻게 정리해야 할지 모르겠어요", "우선순위가 흐립니다", null, ["money.restructure"])
      ], ["state.debt"])
    ]
  },
  {
    topicId: "yearly",
    version: FLOW_VERSION,
    startNodeId: "yearly.focus",
    nodes: [
      node("yearly", "yearly.focus", "올해 흐름에서 가장 궁금한 축은 무엇인가요?", "올해는 전부를 넓히기보다 어떤 축에 힘이 실리는지 보는 방식입니다.", [
        option("reset", "정리와 재정비", "무언가를 비우고 싶습니다", "yearly.reset", ["year.reset", "year.clean-up"]),
        option("work", "일과 방향 설정", "커리어 흐름이 궁금합니다", "yearly.work", ["year.work"]),
        option("relationship", "관계 흐름", "사람 문제에서 흔들리지 않고 싶어요", "yearly.relationship", ["year.relationship"]),
        option("recovery", "회복과 마음", "무리하지 않고 버티고 싶어요", "yearly.recovery", ["year.recovery"])
      ], ["topic.yearly"]),
      node("yearly", "yearly.reset", "정리와 재정비가 궁금하다면 어떤 부분이 가장 크게 느껴지나요?", "비우는 흐름은 손해보다 재배치의 의미가 더 클 수 있습니다.", [
        option("space", "생활 환경을 바꾸고 싶어요", "집, 자리, 생활 습관이 걸립니다", null, ["year.space-reset"]),
        option("habit", "낡은 습관을 끊고 싶어요", "반복 패턴을 정리하고 싶습니다", null, ["year.habit-reset"]),
        option("people", "관계를 정리해야 할 것 같아요", "거리 조절이 필요합니다", null, ["year.clean-up"])
      ], ["focus.reset"]),
      node("yearly", "yearly.work", "일과 방향이 궁금하다면 어떤 판단이 필요하신가요?", "확장보다 중심 축을 선명히 하는 흐름일 수 있습니다.", [
        option("choose", "무엇에 힘을 실어야 할지 모르겠어요", "여러 선택지 사이에서 흔들립니다", null, ["year.choose-focus"]),
        option("move", "움직여도 되는지 궁금해요", "변화 시기감을 보고 싶습니다", null, ["year.work-move"]),
        option("pace", "계속 달려도 되는지 모르겠어요", "속도 조절이 필요해 보입니다", null, ["year.pace"])
      ], ["focus.work"]),
      node("yearly", "yearly.relationship", "관계 흐름이라면 어떤 부분이 가장 궁금한가요?", "사람운은 만남의 수보다 유지 방식에서 더 드러날 수 있습니다.", [
        option("new", "새 인연이 들어오는지", "새로운 만남의 기운이 궁금해요", null, ["year.new-people"]),
        option("old", "기존 관계를 정리해야 하는지", "지속 가치가 헷갈립니다", null, ["year.clean-up"]),
        option("balance", "사람에게 너무 흔들리지 않고 싶어요", "경계 설정이 필요합니다", null, ["year.boundary"])
      ], ["focus.relationship"]),
      node("yearly", "yearly.recovery", "회복과 마음이 궁금하다면 어떤 상태에 가깝나요?", "올해의 회복은 크게 바꾸기보다 리듬을 되찾는 방향일 수 있습니다.", [
        option("anxious", "계속 불안해요", "마음이 쉬지를 못합니다", null, ["year.recovery", "mind.anxious"]),
        option("tired", "계속 지쳐 있어요", "몸과 마음이 같이 무겁습니다", null, ["year.recovery", "mind.exhausted"]),
        option("blank", "의욕이 잘 안 올라와요", "속도를 잃은 느낌입니다", null, ["year.recovery", "mind.numb"])
      ], ["focus.recovery"])
    ]
  },
  {
    topicId: "mind",
    version: FLOW_VERSION,
    startNodeId: "mind.state",
    nodes: [
      node("mind", "mind.state", "지금 마음을 가장 잘 설명하는 상태를 골라 주세요.", "감정의 이름이 선명해질수록 다음 질문도 달라집니다.", [
        option("anxious", "불안이 커요", "생각이 멈추지 않습니다", "mind.anxious", ["mind.anxious", "mind.overthinking"]),
        option("exhausted", "지쳐 있어요", "감정도 체력도 떨어져 있습니다", "mind.exhausted", ["mind.exhausted"]),
        option("lingering", "미련이나 미해결 감정이 남아요", "지나간 일이 계속 남습니다", "mind.lingering", ["mind.lingering"]),
        option("numb", "무기력하고 멍해요", "뭘 느껴야 할지도 모르겠습니다", "mind.numb", ["mind.numb"])
      ], ["topic.mind"]),
      node("mind", "mind.anxious", "불안이 크다면 언제 가장 심해지나요?", "불안의 시간대와 장면을 알면 다루는 방식도 달라집니다.", [
        option("night", "밤이 되면 더 커져요", "생각이 길어지고 잠들기 어렵습니다", null, ["mind.night"]),
        option("decision", "결정해야 할 때 심해져요", "선택 앞에서 얼어붙습니다", null, ["mind.decision-anxiety"]),
        option("relationship", "사람 문제에서 더 심해져요", "반응과 거리감에 예민합니다", null, ["mind.relationship-anxiety"])
      ], ["state.anxious"]),
      node("mind", "mind.exhausted", "지친 상태라면 어떤 느낌이 가장 큰가요?", "회복은 이유 찾기보다 소진 지점을 좁히는 것부터 시작할 수 있습니다.", [
        option("body", "몸이 먼저 무거워요", "아무것도 하기 싫습니다", null, ["mind.body-heavy"]),
        option("emotion", "사소한 일에도 쉽게 무너져요", "감정 완충이 줄었습니다", null, ["mind.fragile"]),
        option("alone", "혼자 있을 때 더 가라앉아요", "쉬는 시간도 편하지 않습니다", null, ["mind.lonely"])
      ], ["state.exhausted"]),
      node("mind", "mind.lingering", "남아 있는 감정이라면 무엇이 가장 가까운가요?", "놓지 못하는 이유가 사랑, 후회, 억울함 중 어디에 가까운지 봅니다.", [
        option("regret", "후회가 남아요", "그때 다르게 했어야 했다고 생각합니다", null, ["mind.regret"]),
        option("hurt", "상처가 안 풀려요", "말로 정리되지 않은 감정이 있습니다", null, ["mind.hurt"]),
        option("attachment", "사람 자체를 못 놓겠어요", "미련이 오래 갑니다", null, ["mind.attachment"])
      ], ["state.lingering"]),
      node("mind", "mind.numb", "무기력한 상태라면 어떤 모습에 더 가깝나요?", "감정이 없는 것이 아니라 과부하로 둔해진 상태일 수 있습니다.", [
        option("blank", "해야 할 일이 있어도 시작이 안 돼요", "생각과 실행이 끊어집니다", null, ["mind.freeze"]),
        option("interest", "좋아하던 것도 재미가 없어요", "반응이 무뎌졌습니다", null, ["mind.low-interest"]),
        option("escape", "계속 피하고 눕고 싶어요", "멈추고 싶은 마음이 큽니다", null, ["mind.escape"])
      ], ["state.numb"])
    ]
  }
];

export const FLOW_MAP = TOPIC_FLOWS.reduce<Record<TopicId, TopicFlow>>((acc, flow) => {
  acc[flow.topicId] = flow;
  return acc;
}, {} as Record<TopicId, TopicFlow>);
