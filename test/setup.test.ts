import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");

const REQUIRED_PATHS = [
  "frontend/src/pages",
  "frontend/src/components",
  "frontend/src/auth",
  "frontend/src/services",
  "backend/src/projects",
  "backend/src/donations",
  "backend/src/authz",
  "backend/src/audit",
  "backend/src/shared",
  "backend/test",
  "infra",
  "policies",
  "docs",
  "evidence",
  ".github/workflows",
];

describe("T001 — estructura de repositorio (plan.md Project Structure, design.md §8)", () => {
  it.each(REQUIRED_PATHS)("existe %s", (relativePath) => {
    expect(existsSync(resolve(ROOT, relativePath))).toBe(true);
  });
});
