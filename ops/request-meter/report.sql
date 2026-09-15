-- A response classified as expected_type is NOT proof of full receipt or downstream use.
SELECT
  hour_utc, path, client_hint,
  SUM(requests) AS all_requests,
  SUM(CASE WHEN method = 'GET' AND status = 200 AND representation = 'expected_type'
           THEN requests ELSE 0 END) AS get_200_expected_type,
  SUM(CASE WHEN representation = 'head_only' THEN requests ELSE 0 END) AS head_requests,
  SUM(CASE WHEN representation = 'not_modified' THEN requests ELSE 0 END) AS not_modified,
  SUM(CASE WHEN representation = 'partial' THEN requests ELSE 0 END) AS partial_responses,
  SUM(CASE WHEN representation = 'unexpected_type' THEN requests ELSE 0 END) AS wrong_content_type,
  SUM(CASE WHEN status >= 400 THEN requests ELSE 0 END) AS errors,
  SUM(CASE WHEN cache_status = 'HIT' THEN requests ELSE 0 END) AS observed_cache_hits
FROM request_counts
WHERE hour_utc >= strftime('%Y-%m-%dT%H:00:00Z', 'now', '-14 days')
GROUP BY hour_utc, path, client_hint
ORDER BY hour_utc, path, client_hint;
