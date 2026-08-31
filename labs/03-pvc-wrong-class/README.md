# Lab 03 — The PVC Never Binds

**Level:** Medium · **Target:** 10–15 minutes

A PersistentVolume exists and has enough capacity, but the claim stays `Pending` and the pod cannot start.

**Goal:** Bind `data-pvc` to `manual-pv` and get the writer pod running.

> This uses `hostPath` and is intended for a disposable single-node Linux cluster. It is a teaching device, not a production storage recommendation.

```bash
kubectl apply -f broken.yaml
kubectl get pv
kubectl get pvc -n breakfix-03
kubectl describe pvc data-pvc -n breakfix-03
```

- [Broken manifest](broken.yaml)
- [Fixed PVC](fixed-pvc.yaml)
- [Cleanup script](cleanup.sh)
- [Hints and full walkthrough](https://escalationpathlabs.github.io/labs/03-pvc-wrong-class/)
