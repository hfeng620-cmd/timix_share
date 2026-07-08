import { cp, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const sourceDir = join(root, "release");
const targetDir = join(root, "out", "release");

async function main() {
  let entries;
  try {
    entries = await readdir(sourceDir, { withFileTypes: true });
  } catch {
    return;
  }

  const files = entries.filter((entry) => entry.isFile());
  if (files.length === 0) return;

  await mkdir(targetDir, { recursive: true });
  await Promise.all(
    files.map((file) =>
      cp(join(sourceDir, file.name), join(targetDir, file.name), { force: true }),
    ),
  );

  console.log(`[copy-release] copied ${files.length} file(s) to out/release`);
}

main().catch((error) => {
  console.error("[copy-release] failed:", error);
  process.exitCode = 1;
});