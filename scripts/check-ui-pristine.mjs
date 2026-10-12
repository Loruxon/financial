#!/usr/bin/env node
// Checks that src/components/ui matches the official shadcn registry exactly.
// Project rule: files in src/components/ui are never hand-edited.

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "../..");
const uiDir = path.join(rootDir, "src/components/ui");
const componentsListPath = path.join(rootDir, "scripts/ui-components.json");

if (process.argv.includes("--self-test")) {
  runSelfTest();
  process.exit(process.exitCode ?? 0);
}

/**
 * Регрессионный тест самой проверки: копирует проект во временную папку,
 * портит там button.tsx и убеждается, что проверка на этой копии падает.
 * Ловит случай, когда формат вывода `shadcn add --dry-run` изменился и
 * проверка перестала замечать руками изменённые файлы.
 */
function runSelfTest() {
  const tempDir = mkdtempSync(path.join(tmpdir(), "check-ui-self-test-"));
  try {
    const skip = new Set(["node_modules", ".next", ".git"]);
    cpSync(rootDir, tempDir, {
      recursive: true,
      filter: (src) => !skip.has(path.basename(src)),
    });
    symlinkSync(
      path.join(rootDir, "node_modules"),
      path.join(tempDir, "node_modules"),
      "dir",
    );

    appendFileSync(
      path.join(tempDir, "src/components/ui/button.tsx"),
      "\n// self-test mutation\n",
    );

    let failed = false;
    try {
      execFileSync(
        "node",
        [path.join(tempDir, "scripts/check-ui-pristine.mjs")],
        { cwd: tempDir, stdio: "pipe" },
      );
    } catch {
      failed = true;
    }

    if (!failed) {
      console.error(
        "check:ui --self-test — проверка НЕ заметила испорченный button.tsx в копии. " +
          "Формат вывода `shadcn add --dry-run`, вероятно, изменился.",
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      "check:ui --self-test — OK: проверка корректно падает на изменённом components/ui.",
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

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
