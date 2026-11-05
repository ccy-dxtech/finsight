export function deleteMyData() {
  return fetch("/api/data", { method: "DELETE" });
}
