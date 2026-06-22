// extensions/flag-tools.ts
// 플래그풋볼 팀 관리 커스텀 도구 (Pi Extension)
// 에이전트 루프/세션/LLM 호출은 pi 코어가 담당하고, 우리는 도구만 등록한다.
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = join(process.cwd(), "data");
const readJson = (f: string) => JSON.parse(readFileSync(join(DATA, f), "utf-8"));
const ok = (text: string, details?: unknown) => ({ content: [{ type: "text" as const, text }], details });

export default function (pi: ExtensionAPI) {
  // 1) 로스터 전체 요약
  pi.registerTool({
    name: "list_players",
    label: "List Players",
    description: "팀 로스터 6포지션(Q/F/X/Y/Z/H) 요약을 반환한다.",
    parameters: Type.Object({}),
    async execute() {
      const { team, players } = readJson("roster.json");
      const lines = players.map((p: any) => `${p.id} · ${p.name}(${p.position}) — ${p.role}`);
      return ok(`[${team}] 로스터\n` + lines.join("\n"), { players });
    },
  });

  // 2) 특정 선수 스탯 (포지션 약어로 조회 → 토큰 절약)
  pi.registerTool({
    name: "get_player_stats",
    label: "Get Player Stats",
    description: "포지션 약어(Q/F/X/Y/Z/H)나 이름으로 한 선수의 역할·스탯을 반환한다.",
    parameters: Type.Object({ id: Type.String({ description: "포지션 약어 또는 선수 이름" }) }),
    async execute(_id, params: any) {
      const { players } = readJson("roster.json");
      const key = String(params.id).trim();
      const p = players.find((x: any) => x.id === key || x.name === key);
      if (!p) return ok(`'${key}' 선수를 찾지 못했습니다.`);
      return ok(`${p.id} · ${p.name} (${p.position})\n역할: ${p.role}\n스탯: ${JSON.stringify(p.stats)}`, p);
    },
  });

  // 3) 상대 기록 조회 (전략 힌트 근거)
  pi.registerTool({
    name: "read_opponent_record",
    label: "Read Opponent Record",
    description: "상대 팀 최근 3경기 집계(세이프티 깊이·플랫 수비 성공률·블리츠 빈도)를 반환한다.",
    parameters: Type.Object({}),
    async execute() {
      const o = readJson("opponents.json");
      const a = o.aggregate;
      return ok(
        `vs ${o.opponent} (최근 3경기)\n세이프티 깊이 ${a.safetyDepth}% · 플랫 수비 성공률 ${a.flatCoverageSuccess}% · 블리츠 빈도 ${a.blitzFreq}%`,
        o,
      );
    },
  });

  // 4) 플레이 저장 (플레이북)
  pi.registerTool({
    name: "save_play",
    label: "Save Play",
    description: "새 플레이를 플레이북(data/plays.json)에 저장한다.",
    parameters: Type.Object({
      name: Type.String(),
      desc: Type.String(),
      type: Type.String({ description: "pass | run" }),
    }),
    async execute(_id, params: any) {
      const pb = readJson("plays.json");
      const id = "PLAY" + String(pb.plays.length + 1).padStart(2, "0");
      pb.plays.push({ id, name: params.name, type: params.type, desc: params.desc, bestAgainst: [], routes: {} });
      writeFileSync(join(DATA, "plays.json"), JSON.stringify(pb, null, 2));
      return ok(`플레이 저장됨: ${id} ${params.name}`, { id });
    },
  });

  // 5) 훈련 세션 생성/저장 (training-planner 스킬이 호출)
  pi.registerTool({
    name: "create_training_session",
    label: "Create Training Session",
    description: "맞춤형 훈련 계획을 training-plans/ 에 마크다운으로 저장한다.",
    parameters: Type.Object({
      title: Type.String(),
      goal: Type.String(),
      markdown: Type.String({ description: "블록별 훈련 계획 마크다운" }),
    }),
    async execute(_id, params: any, _signal, onUpdate) {
      onUpdate?.({ content: [{ type: "text", text: "훈련 계획 저장 중..." }] });
      const dir = join(process.cwd(), "training-plans");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const date = new Date().toISOString().slice(0, 10);
      const file = join(dir, `${date}-${params.goal}.md`);
      writeFileSync(file, `# ${params.title}\n\n${params.markdown}\n`);
      return ok(`훈련 계획 생성 완료 → ${file}`, { file });
    },
  });
}
