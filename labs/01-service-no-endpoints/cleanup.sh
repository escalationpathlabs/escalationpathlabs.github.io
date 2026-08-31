#!/usr/bin/env sh
set -eu
kubectl delete namespace breakfix-01 --ignore-not-found=true
