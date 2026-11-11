import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseEnvFile(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function readEnvFiles() {
  const values = {};
  for (const name of ['.env', '.env.local']) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    Object.assign(values, parseEnvFile(readFileSync(file, 'utf8')));
  }
  return values;
}

const fileEnv = readEnvFiles();
const pick = (key, fallback = '') => process.env[key] ?? fileEnv[key] ?? fallback;

export const config = {
  apiKey: pick('SILICONFLOW_API_KEY'),
  baseUrl: pick('SILICONFLOW_BASE_URL', 'https://api.siliconflow.cn/v1').replace(/\/+$/, ''),
  model: pick('SILICONFLOW_MODEL', 'deepseek-ai/DeepSeek-V4.1-Flash'),
  port: Number(pick('PORT', '4173')) || 4173,
};

export const isConfigured = Boolean(config.apiKey);
