import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";

const cssRoot = path.join(process.cwd(), "out", "_next", "static");

async function collectCssFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectCssFiles(fullPath);
      return entry.isFile() && entry.name.endsWith(".css") ? [fullPath] : [];
    }),
  );

  return files.flat();
}

function unwrapCascadeLayers(root) {
  root.walkAtRules("layer", (rule) => {
    if (!rule.nodes?.length) return;
    rule.replaceWith(...rule.nodes);
  });
}

const files = await collectCssFiles(cssRoot);

await Promise.all(
  files.map(async (file) => {
    const source = await fs.readFile(file, "utf8");
    const root = postcss.parse(source, { from: file });

    unwrapCascadeLayers(root);

    await fs.writeFile(file, root.toString(), "utf8");
    console.log(`Flattened CSS cascade layers: ${path.relative(process.cwd(), file)}`);
  }),
);
