-- Migration 006: model source + discovery state
-- Adds vendor-AI / third-party tracking to the model inventory.
-- All existing rows default to first_party / registered.

alter table ml_models
  add column source text not null default 'first_party'
    check (source in ('first_party', 'third_party')),
  add column discovery_state text not null default 'registered'
    check (discovery_state in ('discovered', 'registered'));
