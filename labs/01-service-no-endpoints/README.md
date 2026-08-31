# Lab 01 — The Service Has No Endpoints

**Level:** Easy · **Target:** 5–10 minutes

A Deployment is healthy. The Service exists. Requests to the Service go nowhere.

**Goal:** Make `api-svc` route traffic to the running API pods.

```bash
kubectl apply -f broken.yaml
kubectl get all -n breakfix-01
```

Try to explain the failure before reading the walkthrough.

- [Broken manifest](broken.yaml)
- [Fixed Service](solution.yaml)
- [Cleanup script](cleanup.sh)
- [Hints and full walkthrough](https://escalationpathlabs.github.io/labs/01-service-no-endpoints/)
