# Lab 02 — Pending Forever

**Level:** Easy · **Target:** 5–10 minutes

The workload has a node selected and the node has capacity, but the pod never schedules.

**Goal:** Schedule the workload onto a node tainted `breakfix=special:NoSchedule`.

```bash
kubectl get nodes
kubectl label node <NODE> breakfix-target=yes
kubectl taint node <NODE> breakfix=special:NoSchedule
kubectl apply -f broken.yaml
```

Read the pod Events before reading the solution.

- [Broken manifest](broken.yaml)
- [Toleration snippet](solution.yaml)
- [Cleanup script](cleanup.sh)
- [Hints and full walkthrough](https://escalationpathlabs.github.io/labs/02-taint-pending/)
