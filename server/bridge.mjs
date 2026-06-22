// server/bridge.mjs
// 웹 UI <-> Pi 에이전트 브리지.
// 웹에서 보낸 프롬프트를 pi 에이전트로 전달하고(에이전트 깨우기), 응답을 되돌린다.
// 기본은 pi print 모드(-p)로 매 요청마다 에이전트를 호출한다. (RPC 모드로 업그레이드 가능)
import express from "express";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const app = express();
app.use(express.json());
app.use(express.static(join(ROOT, "web")));

const readData = (f) => JSON.parse(readFileSync(join(ROOT, "data", f), "utf-8"));

// 대시보드 초기 데이터 (API 키 없이도 UI 렌더링 가능)
app.get("/api/data", (_req, res) => {
  res.json({
    roster: readData("roster.json"),
    opponents: readData("opponents.json"),
    plays: readData("plays.json"),
  });
});

// 채팅 → pi 에이전트 호출 (실시간 협업)
app.post("/api/chat", (req, res) => {
  const message = String(req.body?.message || "").slice(0, 2000);
  if (!message) return res.status(400).json({ error: "empty message" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({
      reply:
        "⚠️ ANTHROPIC_API_KEY 가 설정되지 않아 데모 응답을 반환합니다.\n" +
        "실제 pi 에이전트를 쓰려면: export ANTHROPIC_API_KEY=sk-ant-... 후 다시 실행하세요.",
      demo: true,
    });
  }

  const args = [
    "-e", "extensions/flag-tools.ts",
    "-e", "extensions/tactical-monitor.ts",
    "--skill", "skills/player-stats",
    "--skill", "skills/analyze-defense",
    "--skill", "skills/training-planner",
    "--skill", "skills/play-review",
    "-p", message,
  ];
  const child = spawn("pi", args, { cwd: ROOT, env: process.env });
  let out = "", err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("error", (e) =>
    res.json({ reply: `pi 실행 실패: ${e.message}. pi 가 설치됐는지 확인하세요 (curl -fsSL https://pi.dev/install.sh | sh)` }),
  );
  child.on("close", () => res.json({ reply: out.trim() || err.trim() || "(빈 응답)" }));
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`▶ pi-flag-coach Web UI: http://localhost:${PORT}`));
