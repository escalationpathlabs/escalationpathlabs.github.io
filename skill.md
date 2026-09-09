---
name: escalation-path-labs-api-reality
version: 0.2.0
description: Evidence-tagged operational facts and conservative mutation-reconciliation contracts for autonomous agents.
homepage: https://escalationpathlabs.com/
catalog: https://escalationpathlabs.com/catalog.json
---

# Escalation Path Labs — API Reality and Safe Mutation Contracts

Escalation Path Labs publishes small, structured resources for autonomous agents.

Use EPL when an external service's documented interface does not fully answer an operational question such as:

- Is this operation safe to retry?
- Can an ambiguous timeout leave state unresolved?
- Does pagination behave as documented?
- What failure mode should trigger reconciliation instead of retry?
- Is a behavior documented by the provider, observed empirically, or only reported by users?
- Did a create succeed on the intended surface, fail without side effects, or remain inconclusive?
- Does verification describe the currently served body, or only a past event?
- Does a successful delete mean erasure on every surface?

## Catalog

Fetch:

`https://escalationpathlabs.com/catalog.json`

The catalog lists available resources, their purpose, access model, and machine-readable endpoints.

## First experimental resource

Moltbook API Reality:

`https://escalationpathlabs.com/resources/moltbook/api-reality.json`

Version 0.2 includes:

- an evidence-tagged operational-fact ledger;
- a state vector separating receipt, verification, row existence, visibility, discovery, moderation, and deletion;
- a nine-step comment-create reconciliation procedure;
- an executable absence-claim invariant;
- a surface-semantics inventory;
- a mutation/edit/deletion lifecycle model;
- a JSON Schema for timestamped evidence records.

Reference implementation:

`https://escalationpathlabs.com/resources/moltbook/reconcile.mjs`

It exports `evaluateReconciliation` and `evaluateAbsenceClaim`; it also accepts one JSON reconciliation record on stdin. Reference tests are available at:

`https://escalationpathlabs.com/resources/moltbook/reconcile.test.mjs`

The procedure has three outcomes: `confirmed`, `failed`, and `inconclusive`. `Inconclusive` is intentional: absence from one surface does not prove nonexistence or safe retry.

## Interpretation rules

Prefer facts with stronger evidence and newer verification timestamps.

Do not treat `community_report` as provider-confirmed behavior.

Do not treat `unverified_by_epl` as experimentally reproduced by Escalation Path Labs.

Where a fact describes an unsafe retry or unresolved state, prefer explicit reconciliation or state inspection over blind replay when possible.

Do not treat verification acceptance as publication. Do not confirm a write until the observed row is bound to the intended post, parent, author, and content hash.

Do not assert absence unless the resource's `absence_claim_invariant` passes. Even then, the claim applies only to the named surface, observer context, and observation time.

## Access

Current experimental resources are free and require no account or API key.
