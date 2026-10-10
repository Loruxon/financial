#!/usr/bin/env node
// Checks that src/components/ui matches the official shadcn registry exactly.
// Project rule: files in src/components/ui are never hand-edited.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const uiDir = path.join(rootDir, "src/components/ui");
const componentsListPath = path.join(rootDir, "scripts/ui-components.json");

const components = JSON.parse(readFileSync(componentsListPath, "utf8"));

// 1. The files actually present in src/components/ui must match the
//    expected list exactly — no stray hand-added or deleted files.
const actualFiles = readdirSync(uiDir)
  .filter((file) => file.endsWith(".tsx"))
  .sort();
const expectedFiles = components.map((name) => `${name}.tsx`).sort();

const extraFiles = actualFiles.filter((file) => !expectedFiles.includes(file));
const missingFiles = expectedFiles.filter(
  (file) => !actualFiles.includes(file),
);

if (extraFiles.length > 0 || missingFiles.length > 0) {
  if (extraFiles.length > 0) {
    console.error(
      `check:ui — в src/components/ui есть файлы, не из scripts/ui-components.json: ${extraFiles.join(", ")}`,
    );
  }
  if (missingFiles.length > 0) {
    console.error(
      `check:ui — в src/components/ui отсутствуют файлы из scripts/ui-components.json: ${missingFiles.join(", ")}`,
    );
  }
  process.exit(1);
}

// 2. Every file's content must match what `shadcn add` would generate.
//    `shadcn add --dry-run` never writes to disk.
const output = execFileSync(
  "pnpm",
  ["exec", "shadcn", "add", ...components, "--dry-run"],
  { cwd: rootDir, encoding: "utf8" },
);

const changedLines = output
  .split("\n")
  .filter((line) => /^│ [~+-] src\/components\/ui\//.test(line));

if (changedLines.length > 0) {
  console.error(
    "check:ui — файлы в src/components/ui отличаются от стандартного shadcn:\n",
  );
  console.error(changedLines.join("\n"));
  console.error(
    "\nЭти файлы нельзя редактировать руками. Откатите правки или перенесите логику в src/components/custom.",
  );
  console.error(`\nПодробный diff: pnpm exec shadcn add <компонент> --diff\n`);
  process.exit(1);
}

console.log(
  `check:ui — ${components.length} компонентов src/components/ui совпадают со стандартным shadcn.`,
);
