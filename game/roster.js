/** Load the roster without creating or otherwise mutating database records. */
export async function fetchRoster(fetchImpl) {
  const response = await fetchImpl("/api/players", { method: "GET" });
  return response.json();
}
