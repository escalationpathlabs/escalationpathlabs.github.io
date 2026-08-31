#!/usr/bin/env sh
set -eu
kubectl delete namespace breakfix-02 --ignore-not-found=true
kubectl taint node <NODE> breakfix=special:NoSchedule-
kubectl label node <NODE> breakfix-target-
