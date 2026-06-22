// server/bridge.mjs
// 웹 UI <-> Pi 에이전트 브리지.
// 웹에서 보낸 프롬프트를 pi 에이전트로 전달하고(에이전트 깨우기), 응답을 되돌린다.
// 프롬프트는 stdin 으로 넘긴다(따옴표/JSON 깨짐 방지). 윈도우는 shell:true 로 pi.cmd 를 찾는다.
import express from "express";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const isWin = process.platform === "win32";

const app = express();
app.use(express.json());
app.use(express.static(join(ROOT, "web")));

const readData = (f) => JSON.parse(readFileSync(join(ROOT, "data", f), "utf-8"));

app.get("/api/data", (_req, res) => {
  res.json({
    roster: readData("roster.json"),
    opponents: readData("opponents.json"),
    plays: readData("plays.json"),
  });
});

app.post("/api/chat", (req, res) => {
  const message = String(req.body?.message || "").slice(0, 4000);
  if (!message) return res.status(400).json({ error: "empty message" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({
      reply:
        "⚠️ ANTHROPIC_API_KEY 가 설정되지 않아 데모 응답을 반환합니다.\n" +
        "이 창에서 키를 등록한 뒤 서버를 다시 켜세요.",
      demo: true,
    });
  }

  // 프롬프트는 인자가 아니라 stdin 으로 전달 → 따옴표/JSON 안전
  const args = [
    "-e", "extensions/flag-tools.ts",
    "-e", "extensions/tactical-monitor.ts",
    "--skill", "skills/player-stats",
    "--skill", "skills/analyze-defense",
    "--skill", "skills/training-planner",
    "--skill", "skills/play-review",
    "-p",
  ];

  let out = "", err = "", done = false;
  const finish = (payload) => {        // 응답을 한 번만 보낸다(헤더 중복 전송 방지)
    if (done || res.headersSent) return;
    done = true;
    res.json(payload);
  };

  let child;
  try {
    child = spawn("pi", args, { cwd: ROOT, env: process.env, shell: isWin });
  } catch (e) {
    return finish({ reply: `pi 실행 실패: ${e.message}` });
  }

  child.on("error", (e) =>
    finish({ reply: `pi 실행 실패: ${e.message}. PowerShell에서 'pi --version'이 되는지 확인하세요.` })
  );
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  child.on("close", () =>
    finish({ reply: out.trim() || err.trim() || "(빈 응답 — pi가 출력을 내지 않았습니다)" })
  );

  // 프롬프트를 stdin 으로 주입하고 닫는다
  child.stdin.on("error", () => {});   // EPIPE 등 무시
  child.stdin.write(message);
  child.stdin.end();
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => console.log(`▶ pi-flag-coach Web UI: http://localhost:${PORT}`));
