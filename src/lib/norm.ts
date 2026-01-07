export function normId(v: any) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");
}
