import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const blogsDir = path.join(rootDir, "blogs");
const outputPath = path.join(blogsDir, "index.json");

function slugToTitle(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || slug;
}

async function extractHeading(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const cleaned = line.replace(/^\uFEFF/, "");
      const match = /^\s*#\s+(.+)$/.exec(cleaned);
      if (match) {
        return match[1].trim();
      }
    }
  } catch (error) {
    console.warn(`Could not read ${filePath}: ${error.message}`);
  }
  return null;
}

async function buildIndex() {
  const entries = [];
  const dirItems = await fs.readdir(blogsDir, { withFileTypes: true });

  for (const item of dirItems) {
    if (!item.isFile() || !item.name.toLowerCase().endsWith(".md")) {
      continue;
    }
    const filePath = path.join(blogsDir, item.name);
    const stat = await fs.stat(filePath);
    const heading = await extractHeading(filePath);
    const filename = item.name;
    const slug = filename.replace(/\.md$/i, "");

    entries.push({
      path: `blogs/${filename}`,
      filename,
      title: heading || slugToTitle(slug),
      lastModified: stat.mtime.toISOString(),
      size: stat.size,
      sortKey: stat.mtimeMs
    });
  }

  entries.sort((a, b) => {
    if (b.sortKey !== a.sortKey) {
      return b.sortKey - a.sortKey;
    }
    return a.filename.localeCompare(b.filename);
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    posts: entries.map(({ sortKey, ...rest }) => rest)
  };

  await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${entries.length} posts to ${path.relative(rootDir, outputPath)}`);
}

buildIndex().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
