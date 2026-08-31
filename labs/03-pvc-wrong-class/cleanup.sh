#!/usr/bin/env sh
set -eu
kubectl delete namespace breakfix-03 --ignore-not-found=true
kubectl delete pv manual-pv --ignore-not-found=true
