import * as frontendAdapter from "./frontend-adapter.js";
import { canSubmitSave, submitMatchRequest } from "./save-flow.js";

// Transitional ESM bridge for the legacy Babel script. It contains no rules.
const api = { ...frontendAdapter, submitMatchRequest, canSubmitSave };
window.ForrownautasGameBridge = { api, ready: Promise.resolve(api) };
