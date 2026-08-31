# Free Kubernetes Break/Fix Labs

Three complete hands-on troubleshooting labs. No signup, no exam-dump nonsense.

The intended loop is:

1. Apply the broken config to a disposable cluster.
2. Inspect the actual cluster state.
3. Form a theory before reading the solution.
4. Make the smallest fix you can justify.
5. Verify the result.

## Labs

| Lab | Problem | Level |
| --- | --- | --- |
| [01 — The Service Has No Endpoints](01-service-no-endpoints/) | Service selector mismatch | Easy |
| [02 — Pending Forever](02-taint-pending/) | NoSchedule taint without toleration | Easy |
| [03 — The PVC Never Binds](03-pvc-wrong-class/) | PV/PVC StorageClass mismatch | Medium |

The web versions include hints and walkthroughs: https://escalationpathlabs.github.io/labs/

The full paid pack contains 10 labs and is $10: https://buy.stripe.com/6oUdR972E2EtfpQ7L84c800

These exercises are original and generic. They are not certification exam questions, customer incidents, employer material, or vendor runbooks.
