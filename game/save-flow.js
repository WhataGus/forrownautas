const messageFor = (response, body) => body?.error || (response.status >= 500 ? "Não foi possível salvar a partida. Tente novamente." : "Não foi possível salvar a partida.");

export const canSubmitSave = (inFlight) => !inFlight;

/** Production save-result interpreter used by the legacy UI and unit tests. */
export async function submitMatchRequest(fetchImpl, payload) {
  try {
    const response = await fetchImpl("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body = null;
    try { body = await response.json(); } catch { /* handled below */ }
    if (!response.ok) return { ok: false, error: messageFor(response, body), code: body?.code ?? null };
    if (!body || typeof body.id !== "string" || !body.id) return { ok: false, error: "Resposta inválida ao salvar a partida.", code: null };
    return { ok: true, id: body.id };
  } catch {
    return { ok: false, error: "Sem conexão ao salvar a partida. Tente novamente.", code: null };
  }
}
