# Canonical Card: System Architecture and Runtime

## Purpose

Define the core runtime shape of Wikitruth.

## Core Runtime Model

- Server runtime is Node.js + Express + Kraken with Mongoose/MongoDB.
- The app runs in hybrid mode:
- Legacy server-rendered routes (jade/dust-era flow) still exist.
- Modern React SPA is the primary product surface on canonical root routes (`/*`) and uses `/api` endpoints.
- `/app/*` remains a compatibility alias for modern routes.
- API surface is available under both `/api/*` and `/api/v1/*` (same router tree for migration compatibility).

## Request Pipeline Expectations

- Request context middleware sets request metadata used across API and logs.
- Security middleware includes `helmet`, CSRF protection, and session cookies.
- Monitoring beacon endpoints are CSRF-exempt to support browser beacon delivery.
- Session storage uses Mongo-backed sessions (`connect-mongo`), not memory store.

## Transport Expectations

- HTTP server always starts.
- Optional HTTPS server can be enabled by config/env cert paths.
- Optional HTTP to HTTPS redirect can be enabled when HTTPS is active.

## Architectural Invariant

Modern and legacy experiences coexist; core behavior changes must preserve API compatibility for SPA routes and avoid breaking legacy server-rendered paths still in use.
