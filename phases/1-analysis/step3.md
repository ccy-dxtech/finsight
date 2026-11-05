# Step 3: claude-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md` (CRITICAL: AI 스키마에 금액 필드 금지, 서버 전용)
- `/docs/ARCHITECTURE.md` ("AI 호출 (`services/claude.ts`)" 전체)
- `/docs/ADR.md` (ADR-005, 006, 007)
- `/docs/PRD.md` ("업로드와 분석 규칙", UI_GUIDE의 "AI 문장" 톤)
- `/docs/UI_GUIDE.md` ("한국어 우선" 중 AI 문장 규칙)
- 이전 step의 `src/types/`, `src/lib/categories.ts`, `src/lib/plan.ts`

### SDK 사용법 (설치된 `@anthropic-ai/sdk` 1.5.0, `zod` 4.6.7 기준으로 확인됨)

기억에 의존하지 말고 아래 내용을 따르라. 의심스러우면 `node_modules/@anthropic-ai/sdk/resources/messages/messages.d.ts`, `lib/MessageStream.d.ts`, `lib/parser.js`, `helpers/zod.d.ts`를 직접 확인하라.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic(); // ANTHROPIC_API_KEY를 환경 변수에서 읽는다

// 비스트리밍 (mapColumns, classifyMerchants): max_tokens 16000
const res = await client.messages.parse({
  model, max_tokens: 16000, system, messages,
  output_config: { format: zodOutputFormat(Schema), effort: "low" },
});
res.parsed_output; // z.infer<typeof Schema> | null

// 스트리밍 (writeReport): stream()도 output_config.format을 받고, finalMessage()가 ParsedMessage를 돌려준다
const stream = client.messages.stream({
  model, max_tokens: 64000, system, messages,
  output_config: { format: zodOutputFormat(ReportSchema), effort: "medium" },
});
const msg = await stream.finalMessage(); // msg.parsed_output, msg.stop_reason
```

- **파싱 동작**(`lib/parser.js`, `helpers/zod.js`): JSON 파싱이나 zod 검증에 실패하면 SDK가 `AnthropicError`를 던진다. 텍스트 블록이 없으면 `parsed_output`은 `null`이다. 출력이 잘린 경우(`max_tokens`)에는 보통 파싱 단계에서 예외가 난다.
- **실패 판정**: 호출과 `finalMessage()`에서 나온 예외(SDK 재시도 2회 후의 API 오류 포함), `stop_reason`이 `"refusal"`이나 `"max_tokens"`, `parsed_output === null`이면 모두 `AiFailedError`로 바꾼다. `stop_reason`은 `parsed_output`보다 먼저 확인한다.
- **thinking**: 세 모델(`claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`) 모두 `thinking` 파라미터를 생략한다. `{ type: "disabled" }`나 `budget_tokens`는 이 모델들에서 400 오류가 난다. 깊이는 `output_config.effort`로만 조절한다. Opus 5.5와 Haiku 5.5는 effort 기본값이 `medium`이므로 반드시 명시한다.
- **보내지 않는 파라미터**: `temperature`, `top_p`, `top_k`는 보내지 않는다(현재 API 버전에서 400). assistant prefill(마지막 메시지를 assistant로 두기)도 400이므로 쓰지 않는다. 폐기된 `output_format` 대신 `output_config.format`을 쓴다.
- **모델 ID**: 하드코딩하지 말고 `src/lib/plan.ts`의 `getFastModel()`, `getReportModel(plan)`으로 받는다(각각 `claude-haiku-5-5` / `claude-sonnet-5-5` / `claude-opus-5-5`가 env로 주입된다).
- **테스트 모킹**: `Anthropic` 클라이언트를 주입 가능하게 하거나 `vi.mock("@anthropic-ai/sdk")`로 `messages.parse`, `messages.stream().finalMessage()`를 모킹한다. 실제 네트워크 호출은 하지 않는다.

## 작업

테스트를 먼저 작성한다. 테스트는 SDK 클라이언트를 모킹하며 실제 API를 호출하지 않는다.

`src/services/claude.ts` (`import "server-only"`):

```ts
mapColumns(maskedRows: string[][]): Promise<{ headerRowIndex: number; dateCol: number; merchantCol: number; amountCol: number } | null>
classifyMerchants(merchants: string[]): Promise<{ merchant: string; category: Category }[]>   // 200개 이하 1회분
writeReport(input: { plan: Plan; categoryTotals: ...; transactions: { id: number; date: string; merchant: string; amount: number; category: Category }[] }): Promise<ReportDraft>
// ReportDraft = { summary: string; recurring: { transactionIds: number[]; note: string }[]; anomalies: { transactionId: number; reason: string }[]; savingTips: { title: string; detail: string }[] }
```

- zod 스키마는 `output_config.format`에 넣고 결과를 zod로 다시 검증한다. category는 `categories.ts`의 enum이다.
- `mapColumns`/`classifyMerchants`는 `getFastModel()`, effort `low`. `writeReport`는 `getReportModel(plan)`, effort `medium` 명시, thinking 파라미터 생략, 스트리밍 + `finalMessage()`, `max_tokens` 64000. 프롬프트·스키마·설정은 Free/Pro 동일하고 `model`만 다르다.
- `stop_reason`이 `refusal`/`max_tokens`이거나 스키마 검증 실패면 `AiFailedError`(코드 `ai_failed`)를 던진다. 재시도는 SDK 기본값(2회)에 맡기고 직접 루프를 만들지 않는다.
- `writeReport` 시스템 프롬프트에 "금액을 계산해 쓰지 말고 거래 id로 참조하라", 관찰형 어조(나무라거나 겁주는 말·느낌표·이모지 금지), 한국어 해요체를 넣는다.
- 프롬프트 캐싱은 쓰지 않는다.
- 테스트: 정상 응답 파싱, 스키마 위반 시 `ai_failed`, `refusal` 시 `ai_failed`, 플랜별 model 인자가 달라지는지, 응답 스키마 JSON에 `amount`/`price`/`total` 같은 금액 필드가 없는지.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - AI 응답 스키마에 금액 필드가 없는가(거래는 id 참조)?
   - `server-only`가 있고 `ANTHROPIC_API_KEY`가 서버에서만 읽히는가?
   - 모델 ID가 하드코딩되지 않았는가?
3. 결과에 따라 `phases/1-analysis/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 실제 Anthropic API를 호출하는 테스트를 만들지 마라. 이유: 비용·키 의존·비결정성. 모킹만 쓴다.
- 응답 스키마에 금액·합계 필드를 추가하지 마라. 이유: CRITICAL 규칙, AI가 만든 숫자는 화면에 쓰지 않는다.
- 클라이언트 컴포넌트에서 이 모듈을 import하지 마라. 이유: 비밀값 유출.
- 기존 테스트를 깨뜨리지 마라.
