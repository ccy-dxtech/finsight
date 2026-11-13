export const meta = {
  name: 'review-code',
  description: 'FinSight 변경을 correctness·security·architecture(화면이 바뀌면 ux까지) 리뷰어로 병렬 리뷰하고 차원별로 반박 검증한다',
  whenToUse: '/review 명령이 리뷰 범위와 바뀐 파일 목록을 args({ range, files, screenFiles })로 넘겨 호출한다',
  phases: [
    { title: 'Review', detail: '차원별 리뷰어 병렬 실행' },
    { title: 'Verify', detail: '차원별 지적을 코드로 반박 검증하고 심각도를 다시 매김' },
  ],
}

const SEVERITY = { type: 'string', enum: ['P0', 'P1', 'P2'] }

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: SEVERITY,
          title: { type: 'string', description: '한 줄 요약' },
          file: { type: 'string', description: '저장소 기준 상대경로' },
          line: { type: 'integer', minimum: 0, description: '지금 작업 트리 파일의 줄 번호. 줄을 특정할 수 없으면 0' },
          scenario: { type: 'string', description: '실패 상황·공격 경로·문제: 어떤 입력·상태에서 무엇이 잘못되는지' },
          evidence: { type: 'string', description: '근거: 문서 구절 또는 코드' },
          fix: { type: 'string', description: '수정 방안. 붙여 넣을 수 있는 짧은 코드나 구체적인 변경' },
          critical: { type: 'boolean', description: 'AGENTS.md의 CRITICAL 규칙 위반이면 true' },
          preExisting: { type: 'boolean', description: '이번 diff가 아니라 원래 있던 코드의 문제면 true' },
        },
        required: ['severity', 'title', 'file', 'line', 'scenario', 'evidence', 'fix', 'critical', 'preExisting'],
      },
    },
    passed: { type: 'array', items: { type: 'string' }, description: '문제 없음으로 확인한 항목(번호와 이름)' },
    unverified: { type: 'array', items: { type: 'string' }, description: '코드로 확인하지 못한 추측' },
  },
  required: ['findings', 'passed', 'unverified'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', minimum: 0 },
          verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
          severity: SEVERITY,
          reason: { type: 'string' },
        },
        required: ['index', 'verdict', 'severity', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}

const SEVERITY_RULE = [
  'P0: 출시를 막음. 다른 사용자 데이터 접근, 비밀값 노출, 결제 없이 Pro, 금액·합계가 틀리게 표시됨, 사용자 데이터 손실, 사용자 단계가 끊김',
  'P1: 고쳐야 함. 특정 입력·상태에서 틀린 동작, 규칙 위반이지만 바로 피해가 나지 않음, 방어 한 겹이 빠짐',
  'P2: 다듬기',
].join('\n')

const range = args && args.range
const files = (args && args.files) || []
const screenFiles = (args && args.screenFiles) || []
if (!range || !files.length) throw new Error('args.range와 args.files가 필요하다')

const DIMS = [
  { key: 'correctness', agentType: 'correctness-reviewer', files },
  { key: 'security', agentType: 'security-reviewer', files },
  { key: 'architecture', agentType: 'architecture-reviewer', files },
]
if (screenFiles.length) DIMS.push({ key: 'ux', agentType: 'ux-reviewer', files: screenFiles })

const list = (xs) => xs.map((f) => `- ${f}`).join('\n')

function reviewPrompt(d) {
  const diffHint = d.key === 'ux'
    ? '바뀐 화면 파일과 그 화면이 쓰는 컴포넌트를 읽는다.'
    : `diff는 \`git diff ${range} -- <파일>\`로 본다. 범위가 작업 트리라 diff에 없는 새 파일은 직접 읽는다.`
  return [
    `리뷰 범위: ${range}`,
    `바뀐 파일:\n${list(d.files)}`,
    diffHint,
    '네 지시의 "확인할 것"을 모두 보고 결과를 스키마에 맞춰 돌려준다.',
    'line은 지금 작업 트리 파일의 줄 번호다. 문제 없는 항목은 passed에, 코드로 확인하지 못한 추측은 unverified에 넣는다.',
    '지적할 것이 없으면 findings를 빈 배열로 둔다. 파일은 고치지 않는다.',
  ].join('\n\n')
}

async function review(d) {
  let r = null
  try {
    r = await agent(reviewPrompt(d), {
      label: `review:${d.key}`, phase: 'Review', agentType: d.agentType, schema: FINDINGS,
    })
  } catch (e) {
    // 세션 시작 뒤에 만든 에이전트 정의는 아직 등록되지 않아 "agent type not found"를 던진다.
    log(`${d.key}: ${d.agentType} 호출 실패 (${e && e.message ? e.message : e})`)
  }
  if (r) return r
  // 에이전트 정의를 쓸 수 없으면 기본 에이전트가 정의 파일을 읽고 대신한다.
  log(`${d.key}: 기본 에이전트가 .claude/agents/${d.agentType}.md를 읽고 대신 리뷰`)
  return agent(`먼저 .claude/agents/${d.agentType}.md를 읽고, 그 파일의 지시를 너의 지시로 삼아 리뷰한다.\n\n${reviewPrompt(d)}`, {
    label: `review:${d.key}(fallback)`, phase: 'Review', schema: FINDINGS,
  })
}

async function verify(r, d) {
  if (!r) return { dimension: d.key, ran: false, findings: [], refuted: [], passed: [], unverified: [] }
  const base = { dimension: d.key, ran: true, passed: r.passed, unverified: r.unverified }
  if (!r.findings.length) return { ...base, findings: [], refuted: [] }

  const numbered = r.findings.map((f, index) => ({ index, ...f }))
  const v = await agent([
    `아래는 ${d.key} 리뷰어가 리뷰 범위 ${range}에서 낸 지적이다. 너는 이 지적들을 반박하려는 검증자다.`,
    '지적마다 해당 파일:줄과 호출 경로를 직접 읽고, 리뷰 범위의 diff를 확인하고, 적힌 실패 상황이 실제로 일어나는지 본다.',
    '외부 SDK(Polar, Supabase, Anthropic)에 대한 지적은 node_modules의 실제 타입·코드로 확인한다. docs/PRD.md "한계"에 이미 적힌 것은 refuted로 본다.',
    '실제로 일어나면 confirmed, 일어나지 않거나 다른 코드가 이미 막고 있으면 refuted, 코드로 판단할 수 없으면 uncertain.',
    `리뷰어는 자기 차원을 중요하게 보고 심각도를 올리는 경향이 있다. 아래 기준으로 심각도를 다시 매긴다.\n${SEVERITY_RULE}`,
    '파일은 고치지 않는다. 모든 index에 대해 하나씩 판정을 돌려준다.',
    JSON.stringify(numbered, null, 2),
  ].join('\n\n'), { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICTS })

  if (!v) {
    log(`${d.key}: 검증 에이전트가 실패해 지적 ${r.findings.length}건을 모두 uncertain으로 넘김`)
    return {
      ...base,
      findings: r.findings.map((f) => ({ ...f, dimension: d.key, verdict: 'uncertain', verifyReason: '검증 실패' })),
      refuted: [],
    }
  }

  const byIndex = new Map(v.verdicts.map((x) => [x.index, x]))
  const judged = r.findings.map((f, i) => {
    const x = byIndex.get(i)
    return {
      ...f,
      dimension: d.key,
      originalSeverity: f.severity,
      severity: x ? x.severity : f.severity,
      verdict: x ? x.verdict : 'uncertain',
      verifyReason: x ? x.reason : '검증 결과 없음',
    }
  })
  const refuted = judged.filter((f) => f.verdict === 'refuted')
  if (refuted.length) log(`${d.key}: ${refuted.length}건이 반박되어 빠짐`)
  return {
    ...base,
    findings: judged.filter((f) => f.verdict !== 'refuted'),
    refuted: refuted.map((f) => ({ title: f.title, file: f.file, line: f.line, reason: f.verifyReason })),
  }
}

const results = await pipeline(DIMS, review, verify)

return {
  range,
  dimensions: DIMS.map((d, i) => results[i] || {
    dimension: d.key, ran: false, findings: [], refuted: [], passed: [], unverified: [],
  }),
}
