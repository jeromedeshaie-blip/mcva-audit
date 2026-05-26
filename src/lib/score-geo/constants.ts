/**
 * Score GEO™ Protocol v0 — Constants partagées (REF-2026-016)
 *
 * Référence : Cahier MCVA n°1 *Mesurer la citabilité IA après mai 2026* (25 mai 2026)
 * Protocole : REF-2026-016 Protocole de mesure et codage Score GEO™ v0
 *
 * ⚠️ Ce module est SÉPARÉ de Score GEO Live (anciennement LLM Watch).
 * Score GEO Live = mesure automatique (LLM-as-judge) pour monitoring client.
 * Score GEO™ (ici) = mesure éditoriale propriétaire avec codage humain.
 */

// ============================================================
// 5 modèles standards (§2 Cahier n°1, §2.1 REF-2026-016)
// ============================================================

export const SCORE_GEO_MODELS = ["GPT", "CLAUDE", "PRPLX", "GEMINI", "MSTRL"] as const;
export type ScoreGeoModel = (typeof SCORE_GEO_MODELS)[number];

export const SCORE_GEO_MODEL_LABELS: Record<ScoreGeoModel, string> = {
  GPT: "ChatGPT",
  CLAUDE: "Claude",
  PRPLX: "Perplexity",
  GEMINI: "Gemini",
  MSTRL: "Mistral",
};

/**
 * Mapping vers les providers techniques de src/lib/llm-providers.ts
 * (utilisé pour passer du protocole humain à l'exécution technique).
 */
export const SCORE_GEO_MODEL_PROVIDER: Record<ScoreGeoModel, string> = {
  GPT: "openai",
  CLAUDE: "anthropic",
  PRPLX: "perplexity",
  GEMINI: "gemini",
  MSTRL: "mistral",
};

// ============================================================
// Itérations (§2.2 REF-2026-016)
// ============================================================

export const SCORE_GEO_ITERATIONS = ["T0", "T1", "T2"] as const;
export type ScoreGeoIteration = (typeof SCORE_GEO_ITERATIONS)[number];

// ============================================================
// Statut réponse (§2.3 REF-2026-016)
// ============================================================

export const SCORE_GEO_RESPONSE_STATUSES = [
  "complete",
  "refus",
  "vide",
  "erreur",
  "clarification",
  "partial",
] as const;
export type ScoreGeoResponseStatus = (typeof SCORE_GEO_RESPONSE_STATUSES)[number];

export const SCORE_GEO_RESPONSE_STATUS_LABELS: Record<ScoreGeoResponseStatus, string> = {
  complete: "Complète",
  refus: "Refus de répondre",
  vide: "Réponse vide",
  erreur: "Erreur technique",
  clarification: "Demande de clarification",
  partial: "Réponse partielle",
};

// ============================================================
// 7 thèmes de la grille (§3.2 REF-2026-016)
// ============================================================

export interface ScoreGeoTheme {
  id: number;
  code: string;
  label: string;
  description: string;
  /** true = codé par annotateur humain (T1-T5), false = calculé en agrégation (T6, T7) */
  coded_by_annotator: boolean;
}

export const SCORE_GEO_THEMES: readonly ScoreGeoTheme[] = [
  {
    id: 1,
    code: "T1",
    label: "Présence citationnelle",
    description: "L'entreprise est-elle mentionnée dans la réponse, avec quel statut citationnel ?",
    coded_by_annotator: true,
  },
  {
    id: 2,
    code: "T2",
    label: "Proéminence éditoriale",
    description: "Quand l'entreprise est citée, à quel rang apparaît-elle dans la composition de la réponse ?",
    coded_by_annotator: true,
  },
  {
    id: 3,
    code: "T3",
    label: "Contexte de citation",
    description: "La citation est-elle favorable, neutre, réservée, défavorable ?",
    coded_by_annotator: true,
  },
  {
    id: 4,
    code: "T4",
    label: "Exactitude factuelle",
    description: "Ce que la réponse dit de l'entreprise correspond-il à la réalité (nom, métier, périmètre, géographie, expertise) ?",
    coded_by_annotator: true,
  },
  {
    id: 5,
    code: "T5",
    label: "Ancrage des sources",
    description: "Sur quelles sources externes le modèle s'appuie-t-il, avec quelle diversité et quelle autorité ?",
    coded_by_annotator: true,
  },
  {
    id: 6,
    code: "T6",
    label: "Cohérence inter-modèles",
    description: "L'entreprise est-elle représentée de manière cohérente d'un modèle à l'autre, ou les 5 LLMs divergent-ils ?",
    coded_by_annotator: false,
  },
  {
    id: 7,
    code: "T7",
    label: "Stabilité temporelle",
    description: "La citation reste-t-elle stable sur des itérations successives à intervalle d'une semaine (T0, T1, T2) ?",
    coded_by_annotator: false,
  },
] as const;

// ============================================================
// Échelle de codage (§3.1 REF-2026-016 — entière 0-10)
// ============================================================

export const SCORE_GEO_SCORE_MIN = 0;
export const SCORE_GEO_SCORE_MAX = 10;
export type ScoreGeoScore = number; // 0-10 entier

// ============================================================
// Seuil contrôle inter-juges (§5.1 REF-2026-016)
// ============================================================

export const INTER_JUDGES_COHERENCE_THRESHOLD = 0.75; // 75% par défaut
export const INTER_JUDGES_SAMPLE_PCT = 0.125; // 12.5% (milieu de fourchette 10-15%)

// ============================================================
// Versions
// ============================================================

export const SCORE_GEO_GRID_VERSION = "REF-2026-016-v0";
export const SCORE_GEO_PROTOCOL_VERSION = "v0";

// ============================================================
// Helper : format identifiant unique de mesure (§2.2 REF-2026-016)
// ============================================================

/**
 * Génère l'identifiant unique normé :
 *   [code_panier]-[id_requête]-[code_modèle]-[itération]-[timestamp_ISO_CEST]
 *
 * Exemple : C2-V1.D.07-CLAUDE-T0-20260615T1430CEST
 *
 * Le timestamp est exprimé en heure suisse (CEST/CET selon saison) au format compact.
 */
export function formatScoreGeoUniqueId(params: {
  panierCode: string;
  requestId: string;
  model: ScoreGeoModel;
  iteration: ScoreGeoIteration;
  timestamp: Date;
}): string {
  const { panierCode, requestId, model, iteration, timestamp } = params;
  const cestTimestamp = formatCestTimestamp(timestamp);
  return `${panierCode}-${requestId}-${model}-${iteration}-${cestTimestamp}`;
}

/**
 * Format compact CEST/CET — YYYYMMDDTHHMM<TZ>
 * Ex: 20260615T1430CEST (15 juin 2026, 14h30, heure d'été)
 *
 * Note : on utilise toujours le suffix "CEST" en été et "CET" en hiver.
 * Détection naïve : si UTC offset = +02:00 → CEST, sinon CET.
 */
export function formatCestTimestamp(date: Date): string {
  // Force timezone Europe/Zurich
  const fmt = new Intl.DateTimeFormat("fr-CH", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  // tzName est typiquement "UTC+2" ou "GMT+2" via Intl — on déduit CEST/CET de l'offset
  const offsetMin = getZurichOffsetMinutes(date);
  const tzCode = offsetMin === 120 ? "CEST" : "CET";
  return `${year}${month}${day}T${hour}${minute}${tzCode}`;
}

function getZurichOffsetMinutes(date: Date): number {
  // Calcul de l'offset Europe/Zurich vs UTC en minutes
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const zurich = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
  return Math.round((zurich.getTime() - utc.getTime()) / 60000);
}

// ============================================================
// Parsing inverse (pour debugging/validation)
// ============================================================

export interface ParsedScoreGeoId {
  panierCode: string;
  requestId: string;
  model: ScoreGeoModel;
  iteration: ScoreGeoIteration;
  timestampRaw: string;
  isValid: boolean;
}

export function parseScoreGeoUniqueId(id: string): ParsedScoreGeoId | null {
  const parts = id.split("-");
  if (parts.length < 5) return null;
  // Le dernier segment peut contenir des tirets si jamais (timestamp est plain)
  const [panierCode, requestId, model, iteration, ...timestampParts] = parts;
  const timestampRaw = timestampParts.join("-");
  const isValid =
    SCORE_GEO_MODELS.includes(model as ScoreGeoModel) &&
    SCORE_GEO_ITERATIONS.includes(iteration as ScoreGeoIteration) &&
    /^\d{8}T\d{4}(CEST|CET)$/.test(timestampRaw);
  return {
    panierCode,
    requestId,
    model: model as ScoreGeoModel,
    iteration: iteration as ScoreGeoIteration,
    timestampRaw,
    isValid,
  };
}
