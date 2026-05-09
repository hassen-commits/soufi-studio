export function slugify(input: string, maxLen = 80): string {
  const normalized = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized.slice(0, maxLen).replace(/-$/, "");
}

export function citationSlug(text: string): string {
  const firstWords = text.split(/\s+/).slice(0, 8).join(" ");
  return slugify(firstWords);
}
