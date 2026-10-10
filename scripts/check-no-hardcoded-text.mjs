#!/usr/bin/env node
/**
 * Fails if src/app/**\/*.tsx or src/components/custom/**\/*.tsx contain Cyrillic
 * text outside comments (src/app/dev/ is exempt). Interface text must come from
 * src/messages/ru.ts, not literals in components.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { globSync } from "node:fs";
import ts from "typescript";

const CYRILLIC = /[Ѐ-ӿ]/;
const ROOT = resolve(import.meta.dirname, "..");

function findFiles() {
  const patterns = ["src/app/**/*.tsx", "src/components/custom/**/*.tsx"];
  const files = new Set();
  for (const pattern of patterns) {
    for (const file of globSync(pattern, { cwd: ROOT })) {
      if (file.startsWith("src/app/dev/")) continue;
      files.add(file);
    }
  }
  return [...files].sort();
}

function checkFile(relativePath) {
  const fullPath = resolve(ROOT, relativePath);
  const text = readFileSync(fullPath, "utf8");
  const sourceFile = ts.createSourceFile(
    fullPath,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const violations = [];

  function lineOf(pos) {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
  }

  const TEMPLATE_PART_KINDS = new Set([
    ts.SyntaxKind.TemplateHead,
    ts.SyntaxKind.TemplateMiddle,
    ts.SyntaxKind.TemplateTail,
  ]);

  function visit(node) {
    const isTextNode =
      ts.isStringLiteralLike(node) ||
      ts.isJsxText(node) ||
      TEMPLATE_PART_KINDS.has(node.kind);
    if (isTextNode && CYRILLIC.test(node.text)) {
      violations.push({
        line: lineOf(node.getStart(sourceFile)),
        text: node.text.trim(),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  return violations;
}

function main() {
  const files = findFiles();
  let hasViolations = false;

  for (const file of files) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      hasViolations = true;
      console.error(`\n${file}`);
      for (const { line, text } of violations) {
        console.error(`  :${line}  "${text}"`);
      }
    }
  }

  if (hasViolations) {
    console.error(
      "\nHardcoded Cyrillic text found outside comments. Move it to src/messages/ru.ts.",
    );
    process.exit(1);
  }

  console.log(`check-no-hardcoded-text: OK (${files.length} files checked)`);
}

main();
