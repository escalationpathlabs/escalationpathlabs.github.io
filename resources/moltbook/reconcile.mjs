#!/usr/bin/env node

const same = (a, b) => (a ?? null) === (b ?? null);

export function evaluateAbsenceClaim(record = {}) {
  const pages = record.traversal?.pages;
  const checks = {
    post_independently_confirmed: record.target_post?.independently_confirmed_exists === true,
    pages_present: Array.isArray(pages) && pages.length > 0,
    every_page_transport_success: Array.isArray(pages) && pages.length > 0 &&
      pages.every(p => Number.isInteger(p.http_status) && p.http_status >= 200 && p.http_status < 300 &&
        p.application_success !== false && p.parsed_as_empty_after_error !== true),
    api_declared_exhaustion: record.traversal?.exhaustion_reason === 'api_declared',
    no_repeated_cursor_or_page: record.traversal?.repeated_cursor !== true &&
      record.traversal?.repeated_page !== true,
    stable_ids_deduplicated: record.traversal?.stable_ids_deduplicated === true,
    independent_expected_population: record.expected_population?.provenance_independent === true,
    scope_recorded: Boolean(record.claim_scope?.surface && record.claim_scope?.observed_at &&
      record.claim_scope?.observer_context && record.claim_scope?.recheck_at) &&
      Number.isInteger(record.claim_scope?.maximum_rendered_depth)
  };
  const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  return {
    valid: failures.length === 0,
    outcome: failures.length === 0 ? 'surface_absence_supported' : 'inconclusive',
    checks,
    failures,
    limit: 'A valid claim supports absence only from the named surface, context, and observation time.'
  };
}

function bindingMatches(observation, intended) {
  return observation.content_id === intended.content_id &&
    observation.post_id === intended.post_id &&
    same(observation.parent_id, intended.parent_id) &&
    observation.author_id === intended.author_id &&
    observation.content_sha256 === intended.content_sha256;
}

export function evaluateReconciliation(record = {}) {
  const intended = record.intended || {};
  const observations = Array.isArray(record.observations) ? record.observations : [];

  if (record.create?.definitive_rejection === true &&
      record.create?.side_effects_definitively_absent === true) {
    return {
      outcome: 'failed',
      retry_safe: record.create?.retry_rule === 'known_safe',
      reasons: ['definitive_create_rejection_before_side_effects']
    };
  }

  const intendedVisible = observations.find(o =>
    o.visible === true &&
    o.surface === intended.visibility_surface &&
    bindingMatches(o, intended)
  );

  if (intendedVisible) {
    return {
      outcome: 'confirmed',
      retry_safe: false,
      reasons: ['correctly_bound_row_visible_on_intended_surface'],
      observation_id: intendedVisible.observation_id ?? null
    };
  }

  const reasons = [];
  if (record.receipt?.complete !== true) reasons.push('incomplete_create_receipt');
  if (record.target_post?.independently_confirmed_exists !== true) reasons.push('target_post_not_independently_confirmed');
  if (observations.some(o => o.visible === true && bindingMatches(o, intended))) reasons.push('row_visible_only_on_alternate_surface');
  if (observations.some(o => o.visible === true && !bindingMatches(o, intended))) reasons.push('observed_row_binding_mismatch');

  const absence = evaluateAbsenceClaim(record);
  if (!absence.valid) reasons.push(...absence.failures.map(f => 'absence_check:' + f));
  else reasons.push('valid_absence_from_intended_surface_does_not_prove_no_side_effect');

  if (record.verification?.accepted === true) reasons.push('verification_acceptance_does_not_prove_visibility');
  if (reasons.length === 0) reasons.push('insufficient_evidence');

  return { outcome: 'inconclusive', retry_safe: false, reasons: [...new Set(reasons)], absence };
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  if (!raw.trim()) throw new Error('Expected one JSON reconciliation record on stdin');
  process.stdout.write(JSON.stringify(evaluateReconciliation(JSON.parse(raw)), null, 2) + '\n');
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invoked) main().catch(error => {
  process.stderr.write(JSON.stringify({ error: error.message }) + '\n');
  process.exitCode = 2;
});

