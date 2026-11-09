// 테스트용 1년치 카드 이용내역 엑셀(card-c-year.xlsx)을 만든다. 실행: node tests/fixtures/xlsx/generate.mjs
// 실제 1년치 가계부의 분포(카테고리별 건수 비율·금액대, 요일·시간대, 하루 건수, 취소 비율)만 참고한 합성 데이터다.
// 실제 거래·지점·이름·계좌는 들어 있지 않다. 시드를 고정해 다시 실행해도 같은 거래가 나온다.
import { writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const FILE_NAME = "card-c-year.xlsx";
const DAY = 86_400_000;
const START = Date.UTC(2025, 10, 1);
const END = Date.UTC(2026, 9, 31);

let seed = 20_261_031;
function random() { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
}
const pick = (list) => list[Math.floor(random() * list.length)];
// min~max를 step 단위로 뽑는다. skew가 1보다 크면 작은 금액 쪽으로 몰린다.
const amount = (min, max, step = 100, skew = 1) => min + step * Math.floor(random() ** skew * ((max - min) / step + 1));
const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

const CREDIT = { name: "신용(본인)", number: "5310-****-****-1234" };
const CHECK = { name: "체크(본인)", number: "4579-****-****-5678" };

// 평일 낮은 회사 근처, 저녁과 주말은 집 근처 지점에서 쓴다.
const HOME = ["망원점", "망원역점", "합정점", "합정역점"];
const WORK = ["여의도점", "여의도역점", "IFC몰점", "여의나루점"];
const at = (ctx, brand) => `${brand} ${pick(ctx.weekend || ctx.hour >= 19 || random() < 0.3 ? HOME : WORK)}`;
// 카드사 명세서처럼 긴 가맹점명은 가끔 잘려 있다.
const cut = (name) => (random() < 0.08 ? name.slice(0, 11) : name);

const DAILY = [
  { weight: 40, card: CHECK, hours: [7, 8, 8, 9, 10, 12, 13, 13, 14, 15, 16, 19, 20, 21, 22, 23, 0],
    merchant: (ctx) => cut(at(ctx, pick(["지에스(GS)25", "씨유(CU)", "(주)코리아세븐", "이마트24", "메가MGC커피", "컴포즈커피", "빽다방", "파리바게뜨", "배스킨라빈스"]))),
    amount: () => amount(900, 6_500, 100, 2) },
  { weight: 15, card: CHECK, hours: [11, 12, 12, 12, 13, 18, 19, 19, 20],
    merchant: (ctx) => random() < 0.25 ? "(주)아워홈 여의도사업장" : random() < 0.3 ? pick(["망원 손칼국수", "합정 순대국", "여의도 김치찌개", "여의도 돈까스"]) : at(ctx, pick(["김밥천국", "한솥도시락", "본죽", "홍콩반점0410", "맘스터치", "롯데리아", "맥도날드", "서브웨이"])),
    amount: () => amount(5_500, 13_000, 500) },
  { weight: 5, card: CREDIT, hours: [12, 18, 19, 19, 20, 21, 22],
    merchant: () => pick(["(주)우아한형제들", "(주)우아한형제들", "쿠팡이츠", "(주)위대한상상"]), amount: () => amount(13_900, 34_000, 100) },
  { weight: 3, card: CREDIT, hours: [18, 19, 19, 20, 21],
    merchant: (ctx) => random() < 0.5 ? at(ctx, pick(["교촌치킨", "BBQ치킨", "아웃백스테이크하우스", "빕스"])) : pick(["망원 삼겹살", "합정 이자카야", "망원 파스타", "여의도 횟집"]),
    amount: () => amount(18_000, 58_000, 1_000) },
  { weight: 5, card: CHECK, hours: [10, 11, 17, 18, 19, 20, 21],
    merchant: (ctx) => at({ ...ctx, weekend: true }, pick(["롯데쇼핑(주)롯데슈퍼", "홈플러스 익스프레스", "GS더프레시", "노브랜드"])),
    amount: () => amount(1_500, 42_000, 10, 2.2) },
  { weight: 6, card: CREDIT, hours: [0, 1, 9, 10, 12, 13, 21, 22, 23, 23],
    merchant: () => pick(["쿠팡", "쿠팡", "쿠팡", "(주)지마켓", "11번가", "무신사", "(주)컬리", "(주)에이블리코퍼레이션"]),
    amount: () => amount(3_900, 89_000, 10, 2.5) },
  { weight: 3, card: CHECK, hours: [12, 13, 18, 19, 20],
    merchant: (ctx) => at(ctx, "(주)아성다이소"), amount: () => amount(1_000, 15_000, 1_000, 1.8) },
  { weight: 2, card: CHECK, hours: [12, 13, 18, 19, 20],
    merchant: (ctx) => at(ctx, "씨제이올리브영 주식회사"), amount: () => amount(4_500, 46_000, 100, 1.5) },
  { weight: 2, card: CHECK, hours: [9, 12, 13, 18, 19],
    merchant: () => pick(["망원온누리약국", "합정 365약국", "여의도 미소약국"]), amount: () => amount(2_500, 18_000, 500, 1.5) },
  { weight: 1, card: CHECK, hours: [9, 10, 12, 18],
    merchant: () => pick(["망원연세내과의원", "합정바른정형외과의원", "여의도 맑은이비인후과"]), amount: () => amount(4_000, 26_000, 100, 2) },
  { weight: 2, card: CREDIT, hours: [0, 1, 8, 8, 9, 22, 23],
    merchant: () => pick(["카카오T 택시", "카카오T 택시", "티머니 택시"]), amount: () => amount(4_800, 23_000, 100, 1.5) },
  { weight: 2, card: CREDIT, hours: [13, 14, 15, 19, 20],
    merchant: () => pick(["CGV 여의도", "메가박스 홍대", "교보문고 광화문점", "YES24", "알라딘", "인터파크티켓", "코인노래연습장 망원"]),
    amount: () => amount(5_000, 32_000, 500) },
  { weight: 1, card: CREDIT, hours: [0, 1, 21, 22, 23],
    merchant: () => pick(["APPLE.COM/BILL", "구글플레이"]), amount: () => amount(1_100, 12_000, 100, 2) },
  { weight: 1, card: CREDIT, hours: [14, 15, 16, 17],
    merchant: (ctx) => at({ ...ctx, weekend: true }, pick(["유니클로", "탑텐", "ABC마트"])), amount: () => amount(19_900, 129_000, 100, 1.5) },
  { weight: 3, card: CREDIT, hours: [10, 12, 13, 20, 21, 22],
    merchant: () => pick(["네이버페이", "네이버페이", "카카오페이"]), amount: () => amount(2_000, 60_000, 10, 2.5) },
];

// 달마다 같은 날 빠지는 자동결제. m은 2025-11부터 센 달 번호(0~11).
const GAS = [32_400, 58_300, 71_800, 66_200, 41_500, 24_900, 15_300, 9_800, 8_200, 7_900, 9_100, 14_600];
const ELECTRIC = [21_300, 26_800, 29_400, 27_100, 22_600, 19_800, 21_200, 34_500, 68_400, 92_700, 41_300, 20_900];
const MONTHLY = [
  { day: 2, merchant: "망원 바디라인 피트니스", amount: () => 150_000, when: (m) => m % 3 === 2 }, // 3개월권
  { day: 3, merchant: "OPENAI *CHATGPT SUBSCR", amount: (m) => 28_900 + 100 * ((m * 7) % 16) }, // 달러 결제라 환율 따라 바뀜
  { day: 5, merchant: "넷플릭스", amount: () => 13_500 },
  { day: 9, merchant: "쿠팡 와우멤버십", amount: () => 7_890 },
  { day: 12, merchant: "유튜브프리미엄", amount: () => 14_900 },
  { day: 14, merchant: "밀리의서재", amount: () => 9_900, when: (m) => m >= 4 }, // 3월부터 새로 구독
  { day: 18, merchant: "한국전력공사", amount: (m) => ELECTRIC[m] },
  { day: 21, merchant: "LG유플러스 통신요금", amount: (m) => (m === 7 ? 61_200 : 52_000) },
  { day: 21, merchant: "LG유플러스 인터넷", amount: (m) => (m < 3 ? 22_000 : 27_500) },
  { day: 25, merchant: "삼성화재해상보험", amount: () => 48_900 },
  { day: 27, merchant: "서울도시가스(주)", amount: (m) => GAS[m] },
];

// 한 번뿐인 큰 지출과 명절·여행. 1,190,000원 가전은 이상 지출 후보다.
const EVENTS = [
  ["2025-12-20", "14:12", "이케아 고양점", 389_000],
  ["2025-12-24", "19:40", "아웃백스테이크하우스 합정점", 72_000],
  ["2026-02-02", "09:31", "한국철도공사", 59_800],
  ["2026-02-14", "15:22", "현대백화점 신촌점", 89_000],
  ["2026-03-08", "22:47", "(주)지마켓", 459_000],
  ["2026-05-16", "16:05", "삼성전자 디지털프라자 합정점", 1_190_000],
  ["2026-07-24", "23:10", "제주항공", 248_600],
  ["2026-07-24", "23:18", "(주)야놀자", 286_000],
  ["2026-08-01", "11:02", "제주 렌터카", 98_000],
  ["2026-08-01", "19:34", "제주 흑돼지 명가", 64_000],
  ["2026-08-02", "13:15", "제주 해녀의집", 38_000],
  ["2026-09-10", "10:20", "여의도 밝은치과의원", 285_000],
  ["2026-09-22", "08:44", "한국철도공사", 52_600],
  ["2026-10-17", "21:56", "무신사", 239_000],
];

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (time) => new Date(time).toISOString().slice(0, 10);
const approval = () => String(10_000_000 + Math.floor(random() * 90_000_000));
const rows = [];
const add = (date, time, card, merchant, krw, number = approval()) => rows.push({ date, time, card, number, merchant, krw });

let totalWeight = 0;
for (const category of DAILY) totalWeight += category.weight;
const WEEKDAY_FACTOR = [1.07, 0.94, 0.86, 0.93, 0.96, 0.98, 1.26]; // 일~토

for (let time = START; time <= END; time += DAY) {
  const day = new Date(time);
  const weekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
  const count = Math.max(1, Math.round(5.4 * WEEKDAY_FACTOR[day.getUTCDay()] + gaussian() * 2.2));
  for (let i = 0; i < count; i++) {
    let roll = random() * totalWeight;
    const category = DAILY.find((item) => (roll -= item.weight) < 0) ?? DAILY[0];
    const hour = pick(category.hours);
    add(isoDate(time), `${pad(hour)}:${pad(Math.floor(random() * 60))}`, category.card,
      category.merchant({ weekend, hour }), category.amount());
  }
}
for (let m = 0; m < 12; m++) {
  const year = 2025 + Math.floor((10 + m) / 12);
  const month = (10 + m) % 12;
  for (const item of MONTHLY) {
    if (item.when && !item.when(m)) continue;
    add(isoDate(Date.UTC(year, month, item.day)), `0${Math.floor(random() * 6)}:${pad(Math.floor(random() * 60))}`,
      CREDIT, item.merchant, item.amount(m));
  }
}
for (const [date, time, merchant, krw] of EVENTS) add(date, time, CREDIT, merchant, krw);

// 온라인 쇼핑·의류 결제 일부를 1~6일 뒤 같은 승인번호로 취소한다(음수 행).
const cancellable = rows.filter((row) => /^(쿠팡|\(주\)지마켓|11번가|무신사|\(주\)컬리|\(주\)에이블리|유니클로|탑텐|ABC마트)/.test(row.merchant)
  && row.krw < 100_000 && Date.parse(row.date) + 6 * DAY <= END);
for (let i = 0; i < 24; i++) {
  const [row] = cancellable.splice(Math.floor(random() * cancellable.length), 1);
  const time = Date.parse(row.date) + (1 + Math.floor(random() * 6)) * DAY;
  add(isoDate(time), `${pad(9 + Math.floor(random() * 12))}:${pad(Math.floor(random() * 60))}`, row.card, row.merchant, -row.krw, row.number);
}

// 최신 거래가 위로 오게 정렬한다.
rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

const serial = (date) => (Date.parse(date) - Date.UTC(1899, 11, 30)) / DAY;
const sheet = XLSX.utils.aoa_to_sheet([
  ["이용일자", "이용시간", "이용카드", "카드번호", "승인번호", "이용가맹점", "이용금액"],
  ...rows.map((row) => [
    { t: "n", v: serial(row.date), z: "yyyy-mm-dd" }, row.time, row.card.name, row.card.number, row.number, row.merchant,
    { t: "n", v: row.krw, z: "#,##0" },
  ]),
]);
sheet["!cols"] = [12, 8, 11, 21, 10, 32, 12].map((wch) => ({ wch }));
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "이용내역");
writeFileSync(new URL(FILE_NAME, import.meta.url), XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));

const won = (n) => n.toLocaleString("en-US");
const total = rows.reduce((sum, row) => sum + row.krw, 0);
const months = new Map();
for (const row of rows) {
  const month = months.get(row.date.slice(0, 7)) ?? { count: 0, sum: 0 };
  month.count++;
  month.sum += row.krw;
  months.set(row.date.slice(0, 7), month);
}
console.log(`${FILE_NAME}: ${rows.length}건, 합계 ${won(total)}원, 기간 ${rows.at(-1).date}~${rows[0].date}, `
  + `취소 ${rows.filter((row) => row.krw < 0).length}건, 가맹점 ${new Set(rows.map((row) => row.merchant)).size}곳`);
for (const [month, { count, sum }] of months) console.log(`  ${month} ${count}건 ${won(sum)}원`);
