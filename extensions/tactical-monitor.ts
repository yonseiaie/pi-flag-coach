// extensions/tactical-monitor.ts
// 실시간 전술 감시 & 피드백 (Pi Extension)
// - before_agent_start: 매 턴 직전 현재 상대 수비 지표를 컨텍스트로 주입 (실시간 감시)
// - setWidget/setStatus: 전략 힌트를 사이드 위젯으로 상시 표시
// - background-notify 커맨드: 임계값 돌파 시 알림
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const readAgg = () =>
  JSON.parse(readFileSync(join(process.cwd(), "data", "opponents.json"), "utf-8")).aggregate;

// analyze-defense 스킬의 임계값 규칙을 코드로도 1차 평가 → 위젯에 즉시 표시
function quickHint(a: { safetyDepth: number; flatCoverageSuccess: number; blitzFreq: number }) {
  const hints: string[] = [];
  if (a.safetyDepth >= 70) hints.push(`딥 패스(Y/F) — 세이프티 ${a.safetyDepth}%`);
  if (a.flatCoverageSuccess <= 50) hints.push(`플랫/슬롯 퀵(H/Z) — 플랫 ${a.flatCoverageSuccess}%`);
  if (a.blitzFreq >= 65) hints.push(`핫 루트/3스텝 — 블리츠 ${a.blitzFreq}%`);
  return hints;
}

export default function (pi: ExtensionAPI) {
  // 세션 시작 시 모니터 위젯 켜기
  pi.on("session_start", async (_e, ctx) => {
    const hints = quickHint(readAgg());
    ctx.ui.setStatus("monitor", "🟢 전술 감시 ON");
    ctx.ui.setWidget("hint", ["💡 전략 힌트", ...hints.map((h) => "· " + h)]);
  });

  // 매 턴 직전: 현재 상대 수비 지표를 컨텍스트로 주입 (실시간 감시의 핵심)
  pi.on("before_agent_start", async (event: any) => {
    const a = readAgg();
    const inject =
      `[실시간 수비 지표] 세이프티 깊이 ${a.safetyDepth}% · ` +
      `플랫 수비 성공률 ${a.flatCoverageSuccess}% · 블리츠 빈도 ${a.blitzFreq}%. ` +
      `analyze-defense 임계값으로 판단해 전략 힌트를 갱신하라.`;
    return { message: { content: inject, display: false }, systemPrompt: event.systemPrompt };
  });

  // 백그라운드 알림 (훈련 완료 / 임계값 돌파 시 호출)
  pi.registerCommand("notify", {
    description: "코치에게 백그라운드 알림을 보낸다",
    handler: async (args, ctx) => {
      ctx.ui.notify(args || "전술 변화 감지", "info");
    },
  });

  // 코칭 리포트 생성 도구 (UI '코칭 리포트 생성' 버튼이 트리거)
  pi.registerTool({
    name: "coaching_report",
    label: "Generate Coaching Report",
    description: "현재 상대 지표와 전략 힌트를 묶어 코칭 리포트 텍스트를 생성한다.",
    parameters: Type.Object({}),
    async execute(_id, _p, _s, onUpdate, ctx) {
      onUpdate?.({ content: [{ type: "text", text: "리포트 생성 중..." }] });
      const a = readAgg();
      const hints = quickHint(a);
      ctx?.ui?.notify?.("코칭 리포트 생성 완료", "info");
      const report =
        `## 코칭 리포트\n- 세이프티 깊이: ${a.safetyDepth}%\n- 플랫 수비 성공률: ${a.flatCoverageSuccess}%\n` +
        `- 블리츠 빈도: ${a.blitzFreq}%\n\n### 추천\n` + hints.map((h) => "- " + h).join("\n");
      return { content: [{ type: "text", text: report }], details: { metrics: a, hints } };
    },
  });
}
