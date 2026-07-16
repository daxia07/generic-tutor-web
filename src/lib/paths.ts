// ---------------------------------------------------------------------------
// External data root — never store learner content inside the git repo
// Default: ~/workspace/generic-tutor-web
// Override: TUTOR_DATA_DIR
// ---------------------------------------------------------------------------

import fs from "fs";
import os from "os";
import path from "path";

const DEFAULT_REL = path.join("workspace", "generic-tutor-web");

export function getDataRoot(): string {
  if (process.env.TUTOR_DATA_DIR) {
    return path.resolve(process.env.TUTOR_DATA_DIR);
  }
  return path.join(os.homedir(), DEFAULT_REL);
}

export function getContentDir(topicId = "system-design"): string {
  return path.join(getDataRoot(), "content", topicId);
}

export function getDigestsDir(): string {
  return path.join(getDataRoot(), "digests");
}

export function getContextPacksDir(): string {
  return path.join(getDataRoot(), "context-packs");
}

export function getPlansDir(): string {
  return path.join(getDataRoot(), "plans");
}

export function getLogsDir(): string {
  return path.join(getDataRoot(), "logs");
}

/** Ensure standard subdirs exist under the data root. */
export function ensureDataDirs(): void {
  for (const dir of [
    getDataRoot(),
    getContentDir(),
    getDigestsDir(),
    getContextPacksDir(),
    getPlansDir(),
    getLogsDir(),
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
