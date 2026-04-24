/**
 * Schéma JSON — Import d'audit depuis Mac Studio (Phase 3 hybrid)
 *
 * Le script Python local (`audit_local.py`) POST un payload de ce format
 * vers `/api/audit-import/from-local`.
 *
 * Principe : les données extraites localement par Gemma 4 remplacent
 * l'étape `/api/audit-direct/data` du flow cloud. Le scoring continue
 * normalement (CORE-EEAT + CITE + thèmes) côté web app.
 */

import type { AuditTheme, QualityLevel } from "./audit";

// ============================================================
// Payload racine — ce que le Mac Studio POST
// ============================================================

export interface LocalImportPayload {
  /** URL principale auditée (homepage) */
  url: string;

  /** Secteur d'activité (clé `SECTOR_GROUPS` — ex: "finance-fiduciaire") */
  sector: string;

  /** Nom de marque (optionnel, extrait auto si absent) */
  brand_name?: string;

  /** Niveau d'audit demandé */
  audit_type: "pre_audit" | "express" | "full" | "ultra";

  /** Qualité LLM pour le scoring cloud */
  quality: QualityLevel;

  /** Themes activés (pour audits ultra/thématiques) */
  themes?: AuditTheme[];

  /** Pages crawlées + extraites */
  pages: PageExtraction[];

  /** Métadonnées du crawl */
  crawl_meta: CrawlMetadata;

  /** Version du schéma (v3 initial = "3.0") */
  schema_version: string;
}

// ============================================================
// Extraction par page
// ============================================================

export interface PageExtraction {
  /** URL de la page */
  url: string;

  /** Est-ce la homepage ? */
  is_homepage: boolean;

  /** HTTP status code du crawl */
  status_code: number;

  /** Taille du HTML brut (bytes) */
  html_size_bytes: number;

  /** SHA-256 du HTML pour dédoublonnage */
  html_hash: string;

  /** HTML brut tronqué (max 50000 chars, pour scoring) */
  html_truncated: string;

  /** Données structurées extraites par Gemma 4 */
  extracted: {
    /** Technique SEO de base */
    technique: {
      h1: string[];
      h2: string[];
      h3: string[];
      title: string | null;
      meta_description: string | null;
      canonical: string | null;
      hreflang: Array<{ lang: string; href: string }>;
      robots_meta: string | null;
      viewport: boolean;
      charset: string | null;
    };

    /** Maillage interne + externe */
    maillage: {
      internal_links_count: number;
      external_links_count: number;
      top_internal_links: Array<{ anchor: string; target: string }>;
      top_external_links: Array<{ anchor: string; target: string; domain: string }>;
    };

    /** Données géo/local (CORE-EEAT R, GEO) */
    geo: {
      adresses: string[];
      villes: string[];
      codes_postaux: string[];
      telephones: string[];
      emails: string[];
      google_maps_embed: boolean;
      gbp_mentioned: boolean;
    };

    /** Sémantique et entités nommées */
    semantique: {
      entites_nommees: string[];
      mots_cles_frequents: Array<{ word: string; count: number }>;
      flesch_score?: number | null;
      mots_total?: number;
      lang_detected: string;
    };

    /** Structured data (JSON-LD, schema.org) */
    schema_org: {
      types_detected: string[];
      raw_scripts: string[]; // JSON-LD scripts bruts (max 5)
    };

    /** Images et média */
    media: {
      images_count: number;
      images_without_alt: number;
      has_video: boolean;
      has_audio: boolean;
    };
  };
}

// ============================================================
// Métadonnées du crawl
// ============================================================

export interface CrawlMetadata {
  /** Timestamp ISO du début du crawl */
  started_at: string;

  /** Timestamp ISO de fin */
  finished_at: string;

  /** Nombre total de pages crawlées */
  pages_count: number;

  /** Nombre de pages avec erreur (status >= 400) */
  pages_failed: number;

  /** Site détecté comme SPA (client-rendered) ? */
  spa_detected: boolean;

  /** Domaine parqué détecté ? */
  parked_domain_detected: boolean;

  /** Modèle LLM utilisé pour l'extraction (ex: "gemma4:26b") */
  extractor_model: string;

  /** Version du crawler (ex: "mcva-crawler-v1.0") */
  crawler_version: string;

  /** Durée totale d'extraction (ms) */
  extraction_duration_ms: number;

  /** Hash agrégé de tous les HTMLs (pour dédup côté DB) */
  aggregate_html_hash: string;

  /** User-agent utilisé pour le crawl */
  user_agent?: string;
}

// ============================================================
// Response
// ============================================================

export interface LocalImportResponse {
  success: boolean;
  audit_id?: string;
  reference?: string; // ex: "AUDIT-2026-012"
  dashboard_url?: string;
  errors?: string[];
  warnings?: string[];
}

// ============================================================
// Validation helpers
// ============================================================

/**
 * Valide qu'un payload est bien formé. Retourne la liste des erreurs
 * (vide = valide).
 */
export function validateLocalImportPayload(input: unknown): string[] {
  const errors: string[] = [];

  if (!input || typeof input !== "object") {
    return ["Payload must be a JSON object"];
  }

  const p = input as Partial<LocalImportPayload>;

  // Required fields
  if (!p.url || typeof p.url !== "string") errors.push("url: required string");
  else {
    try { new URL(p.url); } catch { errors.push("url: invalid URL format"); }
  }

  if (!p.sector || typeof p.sector !== "string") errors.push("sector: required string");

  if (!p.audit_type || !["pre_audit", "express", "full", "ultra"].includes(p.audit_type)) {
    errors.push("audit_type: must be one of pre_audit|express|full|ultra");
  }

  if (!p.quality || !["eco", "standard", "premium", "ultra", "dryrun"].includes(p.quality)) {
    errors.push("quality: must be one of eco|standard|premium|ultra|dryrun");
  }

  if (!p.pages || !Array.isArray(p.pages) || p.pages.length === 0) {
    errors.push("pages: required non-empty array");
  } else {
    if (p.pages.length > 20) errors.push("pages: max 20 pages per import");
    for (let i = 0; i < Math.min(p.pages.length, 20); i++) {
      const page = p.pages[i];
      if (!page.url) errors.push(`pages[${i}].url: required`);
      if (typeof page.status_code !== "number") errors.push(`pages[${i}].status_code: required number`);
      if (!page.html_hash) errors.push(`pages[${i}].html_hash: required`);
      if (!page.extracted) errors.push(`pages[${i}].extracted: required object`);
    }
  }

  if (!p.crawl_meta) errors.push("crawl_meta: required");
  else {
    if (!p.crawl_meta.started_at) errors.push("crawl_meta.started_at: required ISO timestamp");
    if (!p.crawl_meta.finished_at) errors.push("crawl_meta.finished_at: required ISO timestamp");
    if (!p.crawl_meta.extractor_model) errors.push("crawl_meta.extractor_model: required");
  }

  if (!p.schema_version) errors.push("schema_version: required (current: '3.0')");

  return errors;
}
