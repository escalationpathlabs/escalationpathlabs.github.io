#!/usr/bin/env sh
set -eu
kubectl delete namespace breakfix-02 --ignore-not-found=true
kubectl get nodes -l breakfix-target=yes -o name | while IFS= read -r node; do
  [ -n "$node" ] || continue
  kubectl taint "$node" breakfix=special:NoSchedule- >/dev/null 2>&1 || true
  kubectl label "$node" breakfix-target- >/dev/null 2>&1 || true
done
