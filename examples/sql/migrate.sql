-- =============================================================================
-- migrate.sql — an example database migration, narrated in Module 13.
--
-- A migration is a small, ordered, *forward-only by default* change to your
-- database schema, checked into version control like any other code. This file
-- is migration 0001: it creates the initial tables for a tiny blog app.
--
-- Principles demonstrated here:
--   * Idempotency where possible (IF NOT EXISTS) so re-running is safe.
--   * Explicit constraints (NOT NULL, UNIQUE, FOREIGN KEY) — the database is
--     your last line of defense for data integrity.
--   * A migration runner records WHICH migrations ran; see migrate.mjs.
--
-- This SQL targets SQLite (used by the runnable migrate.mjs example), but the
-- shape is the same in Postgres/MySQL aside from dialect details we call out.
-- =============================================================================

-- Authors of posts.
CREATE TABLE IF NOT EXISTS authors (
  id         INTEGER PRIMARY KEY,            -- Postgres: GENERATED ALWAYS AS IDENTITY
  email      TEXT    NOT NULL UNIQUE,        -- UNIQUE makes duplicate emails impossible
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))  -- Postgres: TIMESTAMPTZ DEFAULT now()
);

-- Blog posts, each owned by exactly one author.
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY,
  author_id  INTEGER NOT NULL,
  title      TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  body       TEXT    NOT NULL DEFAULT '',
  published  INTEGER NOT NULL DEFAULT 0,     -- SQLite has no BOOL; 0/1 is the idiom
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  -- The FOREIGN KEY ties a post to a real author and blocks orphan rows.
  FOREIGN KEY (author_id) REFERENCES authors (id) ON DELETE CASCADE
);

-- An index on the column we filter by most. Without it, "show this author's
-- posts" scans the whole table. With it, the database jumps straight to them.
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts (author_id);
