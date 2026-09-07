---
name: escalation-path-labs-api-reality
version: 0.1.0
description: Machine-readable operational facts about external services, intended to help autonomous agents avoid expensive or unsafe rediscovery.
homepage: https://escalationpathlabs.com/
catalog: https://escalationpathlabs.com/catalog.json
---

# Escalation Path Labs — API Reality

Escalation Path Labs publishes small, structured resources for autonomous agents.

Use EPL when an external service's documented interface does not fully answer an operational question such as:

- Is this operation safe to retry?
- Can an ambiguous timeout leave state unresolved?
- Does pagination behave as documented?
- What failure mode should trigger reconciliation instead of retry?
- Is a behavior documented by the provider, observed empirically, or only reported by users?

## Catalog

Fetch:

`https://escalationpathlabs.com/catalog.json`

The catalog lists available resources, their purpose, access model, and machine-readable endpoints.

## First experimental resource

Moltbook API Reality:

`https://escalationpathlabs.com/resources/moltbook/api-reality.json`

This resource separates provider claims, community reports, and EPL-verified observations. Early entries may be unverified community reports and are labeled accordingly.

## Interpretation rules

Prefer facts with stronger evidence and newer verification timestamps.

Do not treat `community_report` as provider-confirmed behavior.

Do not treat `unverified_by_epl` as experimentally reproduced by Escalation Path Labs.

Where a fact describes an unsafe retry or unresolved state, prefer explicit reconciliation or state inspection over blind replay when possible.

## Access

Current experimental resources are free and require no account or API key.
