import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { logger } from "../../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname = apps/studio/src/agent/handlers → on remonte à apps/render
const RENDER_DIR = resolve(__dirname, "../../../../render");
// Output: apps/studio/media (déjà servi via /media/* par Hono)
const OUTPUT_DIR = resolve(__dirname, "../../../media");

export interface RenderVideoInput {
  composition: "ShortVertical" | "PodcastLong";
  output_filename: string;
  props: Record<string, unknown>;
}

export interface RenderVideoOutput {
  composition: string;
  path: string;
  url: string;
  bytes: number;
  duration_ms: number;
}

export async function renderVideo(input: RenderVideoInput): Promise<RenderVideoOutput> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const safeName = input.output_filename.replace(/[^a-z0-9._-]/gi, "-");
  const outputPath = resolve(OUTPUT_DIR, safeName);

  logger.info(
    { composition: input.composition, output: outputPath, propsKeys: Object.keys(input.props) },
    "render_video start",
  );

  const propsJson = JSON.stringify(input.props);
  const args = [
    "exec",
    "remotion",
    "render",
    input.composition,
    outputPath,
    `--props=${propsJson}`,
  ];

  const started = Date.now();
  const result = await runProcess("pnpm", args, RENDER_DIR);
  const duration = Date.now() - started;

  if (result.code !== 0) {
    logger.error({ stderr: result.stderr.slice(-500) }, "render_video failed");
    throw new Error(
      `Remotion render exited ${result.code}: ${result.stderr.slice(-300)}`,
    );
  }

  const { stat } = await import("node:fs/promises");
  const fileStat = await stat(outputPath);

  logger.info({ duration_ms: duration, bytes: fileStat.size }, "render_video done");

  return {
    composition: input.composition,
    path: outputPath,
    url: `/media/${safeName}`,
    bytes: fileStat.size,
    duration_ms: duration,
  };
}

interface ProcessResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runProcess(cmd: string, args: string[], cwd: string): Promise<ProcessResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr?.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (code) => {
      resolvePromise({ code, stdout, stderr });
    });
    child.on("error", (err) => {
      resolvePromise({ code: -1, stdout, stderr: stderr + "\n" + String(err) });
    });
  });
}
