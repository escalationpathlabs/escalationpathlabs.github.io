import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAbsenceClaim, evaluateReconciliation } from './reconcile.mjs';

const intended = {
  content_id: 'comment-1',
  post_id: 'post-1',
  parent_id: 'parent-1',
  author_id: 'author-1',
  content_sha256: 'sha256:abc',
  visibility_surface: 'comment_tree'
};

const validTraversal = {
  target_post: { independently_confirmed_exists: true },
  traversal: {
    pages: [{ http_status: 200, application_success: true }],
    exhaustion_reason: 'api_declared',
    repeated_cursor: false,
    repeated_page: false,
    stable_ids_deduplicated: true
  },
  expected_population: { provenance_independent: true },
  claim_scope: {
    surface: 'comment_tree',
    observed_at: '2026-09-09T00:00:00Z',
    observer_context: 'authenticated_non_author',
    recheck_at: '2026-09-09T01:00:00Z',
    maximum_rendered_depth: 5
  }
};

test('confirms only a correctly bound row on the intended surface', () => {
  const result = evaluateReconciliation({
    ...validTraversal,
    receipt: { complete: true },
    intended,
    observations: [{ observation_id: 'obs-1', visible: true, surface: 'comment_tree', ...intended }]
  });
  assert.equal(result.outcome, 'confirmed');
  assert.equal(result.retry_safe, false);
});

test('alternate-surface visibility remains inconclusive', () => {
  const result = evaluateReconciliation({
    ...validTraversal,
    receipt: { complete: true },
    intended,
    observations: [{ visible: true, surface: 'author_listing', ...intended }]
  });
  assert.equal(result.outcome, 'inconclusive');
  assert(result.reasons.includes('row_visible_only_on_alternate_surface'));
});

test('wrong-parent row does not confirm matching content', () => {
  const result = evaluateReconciliation({
    ...validTraversal,
    receipt: { complete: true },
    intended,
    observations: [{ visible: true, surface: 'comment_tree', ...intended, parent_id: 'wrong-parent' }]
  });
  assert.equal(result.outcome, 'inconclusive');
  assert(result.reasons.includes('observed_row_binding_mismatch'));
});

test('definitive rejection is the only failed outcome', () => {
  const result = evaluateReconciliation({
    create: { definitive_rejection: true, side_effects_definitively_absent: true, retry_rule: 'known_safe' }
  });
  assert.deepEqual(result, {
    outcome: 'failed',
    retry_safe: true,
    reasons: ['definitive_create_rejection_before_side_effects']
  });
});

test('a 429 parsed as empty invalidates an absence claim', () => {
  const result = evaluateAbsenceClaim({
    ...validTraversal,
    traversal: {
      ...validTraversal.traversal,
      pages: [{ http_status: 429, application_success: false, parsed_as_empty_after_error: true }]
    }
  });
  assert.equal(result.valid, false);
  assert(result.failures.includes('every_page_transport_success'));
});

test('valid surface absence still does not authorize retry', () => {
  const result = evaluateReconciliation({
    ...validTraversal,
    receipt: { complete: true },
    intended,
    verification: { accepted: true },
    observations: []
  });
  assert.equal(result.outcome, 'inconclusive');
  assert.equal(result.retry_safe, false);
  assert(result.reasons.includes('valid_absence_from_intended_surface_does_not_prove_no_side_effect'));
});

