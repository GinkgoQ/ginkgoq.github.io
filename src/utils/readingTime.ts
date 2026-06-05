import fs from "node:fs/promises";
import path from "node:path";
import readingTime from "reading-time";

type ContentCollection = "blog" | "research";

export async function getRawContentSource(collection: ContentCollection, id: string) {
  const contentDir = path.join(process.cwd(), "src", "content", collection);
  const sourceBase = path.join(contentDir, id);
  const candidates = [`${sourceBase}.mdx`, `${sourceBase}.md`];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return fs.readFile(candidate, "utf-8");
    } catch {
      // try next candidate
    }
  }

  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  const normalizedId = id.toLowerCase();
  const matchingFile = entries.find((entry) => {
    if (!entry.isFile()) return false;

    const parsed = path.parse(entry.name);
    return [".mdx", ".md"].includes(parsed.ext) && parsed.name.toLowerCase() === normalizedId;
  });

  if (matchingFile) {
    return fs.readFile(path.join(contentDir, matchingFile.name), "utf-8");
  }

  throw new Error(`Unable to locate source file for ${collection} post "${id}"`);
}

export async function getReadingTimeText(collection: ContentCollection, id: string) {
  const rawSource = await getRawContentSource(collection, id);
  return readingTime(rawSource).text;
}
