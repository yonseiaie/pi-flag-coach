# 🏈 pi-flag-coach — 플래그풋볼 실시간 전술 코칭 & 팀 관리 AI 에이전트

> **Pi** 하니스 위에 **Skill · Extension · MCP · Web UI** 를 얹어 만든 플래그풋볼 전술 코칭 에이전트.
> 경기 중 상대 수비 데이터를 실시간으로 감시하다가 의미 있는 변화가 생기면 최적의 플레이 호출과 전술 수정을 제안하고,
> 선수 관리·훈련 세션 생성·플레이북 작성을 돕는다.
> *"코어(에이전트 루프·세션·LLM 호출)는 작게, 능력은 확장으로"* 라는 pi 철학을 그대로 따른다.

선택 시나리오: **실시간 전술 감시 및 피드백 + 맞춤형 팀 관리 솔루션**

---

## 프로젝트 소개

플래그풋볼(5인제) 코치와 선수가 **실제로 작전을 설계하고 학습**할 수 있는 웹 작전 보드다.
선수 5명(X·Y·Z·C·QB)을 드래그로 배치하고, 라우트를 직접 그리거나 프리셋으로 넣은 뒤,
재생으로 움직임을 확인하고, 저장/불러오기로 플레이북을 관리한다. 그린 작전은 **Pi 에이전트가
분석·평가**해 강점·약점·보완점을 돌려준다. 동시에 상대 수비 지표 모니터링, 선수 역할 조회,
훈련 계획 자동 생성 같은 코칭 기능을 함께 제공한다.

단순 챗봇과 달리, 이 에이전트는 **스스로 데이터를 읽고(도구), 절차를 지키고(스킬),
외부 DB와 연동하고(MCP), 매 턴 실시간 지표를 주입(Extension)** 하기 때문에 재현·추적 가능한 코칭을 제공한다.

## 주요 기능

웹 작전 보드는 **장식이 아니라 실제로 작동**한다. 5인제 플래그풋볼(X·Y·Z·C·QB)을 기준으로:

| 기능 | 동작 | 구현 |
|-----|-----|-----|
| 선수 배치 | 5명을 드래그해 포메이션 구성 | Web UI (이동 모드) |
| 라우트 그리기 | 선수에서 마우스를 끌어 자유 곡선 라우트 | Web UI (그리기 모드) |
| 프리셋 라우트 | go/slant/out/in/cross/curl/comeback/corner/post/skinny-post/flat/hitch 자동 생성 | Web UI |
| 볼 캐리어 표시 | 공을 받는 선수에 🏈 아이콘 + QB→캐리어 핸드오프/피치 점선 (스윕·핸드오프 작전용) | Web UI |
| 커스텀 얼라인/라우트 | 내가 배치한 포메이션·그린 라우트를 저장해 재사용 | Web UI (localStorage) |
| 재생 | 그린 라우트대로 선수가 움직이는 애니메이션 | Web UI (requestAnimationFrame) |
| 작전 저장/불러오기 | 이름별 저장 + JSON 내보내기/가져오기 | Web UI |
| 작전 설명 자동 생성 | 라우트→야드·전개 방향 텍스트화 | Web UI |
| **Pi 분석/평가** | 그린 작전을 에이전트가 강점·약점·보완 평가 | Skill `play-review` + 브리지 |
| 수행 역할 | X/Y/Z/C/QB 역할군 표시·선택 | Skill `player-stats` |
| 상대 분석(보조) | 최근 3경기 지표 기반 전략 힌트 | Skill `analyze-defense` + Extension |
| 훈련 계획 | 약점 기반 세션 자동 생성 | Skill `training-planner` |

## 사용한 기술 스택

- **에이전트 하니스:** Pi (`@mariozechner/pi-coding-agent`) — 에이전트 루프·세션·도구 호출·스킬 로딩
- **Extension/도구:** TypeScript + `@sinclair/typebox` (`pi.registerTool`)
- **MCP 서버:** `@modelcontextprotocol/server-sqlite`(기본, 무인증) / `server-postgres`(운영 교체)
- **Web UI:** HTML + CSS + Vanilla JS (SVG 전술 보드, 원형 차트), 별도 빌드 불필요
- **브리지 서버:** Node.js + Express — 웹 ↔ pi 에이전트 연결

## 설치 방법

```bash
# 1) Pi 설치
curl -fsSL https://pi.dev/install.sh | sh        # Windows: irm https://pi.dev/install.ps1 | iex

# 2) 저장소 클론 & 의존성 설치
git clone https://github.com/yonseiaie/pi-flag-coach.git
cd pi-flag-coach
npm install                      # 브리지 서버(express)
(cd extensions && npm install)   # Extension 의존성(typebox)

# 3) LLM 인증 (둘 중 하나)
pi   # 실행 후 /login
# 또는
export ANTHROPIC_API_KEY=sk-ant-...
```

## 실행 방법

### A. 웹 UI (권장 — 제출 요건)

```bash
npm run web        # http://localhost:5173 접속
```

대시보드에서 우하단 **🤖 에이전트** 버튼으로 에이전트와 대화한다.
`ANTHROPIC_API_KEY` 가 없으면 데모 응답으로, 있으면 실제 pi 에이전트로 동작한다.
(API 키 없이 `web/index.html` 을 직접 열어도 내장 데모 데이터로 화면이 렌더링된다 → 시연용)

### B. CLI 에이전트 (디버깅/검증용)

```bash
# 전체 스킬+확장 로드 대화형
npm run agent

# 실시간 수비 분석 한 번 실행
npm run agent:print -- "상대 수비 분석해서 다음 플레이 추천해줘"

# 스킬 ON/OFF 비교 (스킬 효과 검증)
pi -e extensions/flag-tools.ts --no-skills -p "선수 X의 역할 알려줘"

# 직전 세션 이어가기 (관찰가능성/연속성)
pi -e extensions/flag-tools.ts --skill skills/analyze-defense -c -p "방금 추천 플레이의 키 플레이어는?"
```

## Pi / Skill / MCP / Pi Extension 활용 설명

### Pi 활용
에이전트 루프·세션 저장(`~/.pi/agent/sessions/`)·LLM 호출·도구 오케스트레이션은 **전부 pi 코어가 담당**한다.
우리는 코어를 건드리지 않고 능력만 얹었다. 세션은 `-c`/`-r` 로 이어가며, `--mode json` 트랜스크립트로 동작을 관찰한다.

### Skill 활용 (`skills/`)
- **player-stats** — 선수/포지션 질문 시에만 로드(progressive disclosure)해 컨텍스트 오염 최소화. `references/positions.md` 는 필요할 때만 추가 로드.
- **analyze-defense** — 세이프티 깊이≥70% → 딥 패스, 플랫 성공률≤50% → 플랫/슬롯, 블리츠≥65% → 핫 루트 등 **임계값 규칙**으로 전략 힌트를 만든다.
- **play-review** — 웹 보드에서 그린 작전 JSON(선수 위치·라우트·프리셋)을 받아 강점/약점/보완을 코치 관점에서 평가한다. ("이 작전 분석시키기" 버튼이 호출)
- **training-planner** — 약점 지표 → 드릴 매핑으로 60~90분 세션을 자동 설계하고 저장한다.

### Pi Extension 활용 (`extensions/`)
- **flag-tools.ts** — `pi.registerTool` 로 `list_players` / `get_player_stats` / `read_opponent_record` / `save_play` / `create_training_session` 등 팀 관리 커스텀 도구 등록.
- **tactical-monitor.ts** — `before_agent_start` 이벤트로 **매 턴 직전 현재 상대 수비 지표를 컨텍스트로 주입**(실시간 감시), `ctx.ui.setWidget`/`setStatus` 로 전략 힌트 위젯 상시 표시, `coaching_report` 도구와 `/notify` 알림 제공.

### MCP 활용 (`.mcp.json`)
- 기본은 무인증으로 바로 도는 `server-sqlite`(경기 통계 DB) + `server-filesystem`(팀 데이터 저장소).
- 운영 시 `_production_swap` 블록처럼 **`server-postgres` 로 교체**하면 구조 변경 없이 실제 통계 DB에 직접 연결된다.

### 멀티 에이전트 오케스트레이션 (`.pi/agents/`)
중앙 에이전트가 `defense-analyst`(수비 분석)와 `offense-strategist`(공격 전술) 서브에이전트에 병렬 위임 → 컨텍스트 격리 + 속도 향상.

## 시스템 구조

```
[웹 대시보드 web/index.html]
        │  POST /api/chat (프롬프트 = triggerTurn)
        ▼
[브리지 server/bridge.mjs (Express)]
        │  spawn pi -p ...  (에이전트 깨우기)
        ▼
[Pi 에이전트 코어] ── AGENTS.md 지침
   ├─ Skills:      player-stats / analyze-defense / training-planner / play-review
   ├─ Extensions:  flag-tools(도구) · tactical-monitor(실시간 주입+위젯)
   ├─ MCP:         stats-db(sqlite/postgres) · team-store(filesystem)
   └─ Subagents:   defense-analyst ∥ offense-strategist
        │
        ▼  응답 → 브리지 → 웹 UI(전략 힌트/리포트 갱신)
```

## 실행 화면

`web/index.html` 실행 시: 좌측 내비게이션 + 중앙 **인터랙티브 작전 보드**(드래그로 옮기는 5명,
직접 그리거나 프리셋으로 넣는 라우트, ▶재생 애니메이션) + 우측 수행 역할 / 자동 작전 설명 /
Pi 분석 결과 / 저장·불러오기. 열면 예시 작전 **"Cross"** 가 미리 로드돼 바로 재생·분석할 수 있다.

> 스크린샷은 `docs/` 에 첨부하거나, `npm run web` 실행 후 캡처하여 이 위치에 넣으세요.

## 한계 및 개선 방향
- 라우트 거리는 픽셀→야드 근사값 — 실제 필드 스케일 보정 필요.
- 브리지는 print 모드(요청당 호출) — pi **RPC 모드** 로 바꾸면 스트리밍/연속 세션이 가능.
- 작전 저장은 브라우저 localStorage + JSON 파일 — 다중 사용자 공유는 MCP/DB 연동으로 확장 가능.
- 상대 지표는 샘플 데이터 — 라이브 스코어 API 연동이 다음 단계.

## 라이선스
[MIT](LICENSE)
