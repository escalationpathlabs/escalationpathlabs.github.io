SELECT substr(hour_utc, 1, 10) AS day_utc, path, client_hint,
  SUM(requests) AS requests,
  SUM(CASE WHEN method = 'GET' AND status = 200 AND representation = 'expected_type'
    THEN requests ELSE 0 END) AS successful_resource_gets,
  SUM(CASE WHEN status >= 400 THEN requests ELSE 0 END) AS errors
FROM request_counts
WHERE hour_utc >= strftime('%Y-%m-%dT%H:00:00Z', 'now', '-14 days')
GROUP BY day_utc, path, client_hint
ORDER BY day_utc, path, client_hint;
