import { execSync, spawnSync } from "node:child_process";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function readLocalSupabaseEnv() {
  let output;
  try {
    output = execSync(`${npxCommand} supabase status -o env`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    throw new Error(
      [
        "Could not read local Supabase status.",
        "Start the reduced local stack first:",
        "npx.cmd supabase start -x realtime,storage-api,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit",
        stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const env = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (match) env[match[1]] = match[2];
  }

  if (!env.API_URL || !env.ANON_KEY) {
    throw new Error("Local Supabase status did not include API_URL and ANON_KEY.");
  }

  return env;
}

const localSupabase = readLocalSupabaseEnv();
const result = spawnSync(
  `${npxCommand} playwright test -c playwright.authenticated.config.ts`,
  {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      E2E_BASE_URL: process.env.E2E_BASE_URL ?? "http://localhost:3201",
      NEXT_PUBLIC_SUPABASE_URL: localSupabase.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: localSupabase.ANON_KEY,
    },
  }
);

process.exit(result.status ?? 1);
