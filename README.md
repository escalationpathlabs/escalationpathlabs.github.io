# Escalation Path Labs

**Get out of the queue. Learn to fix the stuff behind it.**

Practical break/fix labs and guides for help desk, NOC, desktop support, and junior sysadmin techs moving into cloud infrastructure.

## Start here

- [Three free Kubernetes break/fix labs](https://escalationpathlabs.github.io/labs/)
- [Help Desk → Cloud Infrastructure: what you actually need to learn](https://escalationpathlabs.github.io/help-desk-to-cloud.html)
- [Website](https://escalationpathlabs.github.io/)

## Free labs

The repository contains the actual broken manifests and cleanup scripts, not just links to a hosted demo:

1. [`labs/01-service-no-endpoints`](labs/01-service-no-endpoints/) — Service selector mismatch
2. [`labs/02-taint-pending`](labs/02-taint-pending/) — NoSchedule taint without a toleration
3. [`labs/03-pvc-wrong-class`](labs/03-pvc-wrong-class/) — PV/PVC StorageClass mismatch

The idea is simple: apply broken config to a disposable cluster, inspect state, form a theory, make the smallest defensible fix, and verify it.

These are original generic exercises. They are not certification exam dumps, customer incidents, employer material, or vendor runbooks.

## Full pack

The paid pack has 10 Kubernetes troubleshooting labs and costs $10 one-time. Do the free ones first. If the format is useful, the rest are here:

https://buy.stripe.com/6oUdR972E2EtfpQ7L84c800

Support: escalationpathlabs@gmail.com
