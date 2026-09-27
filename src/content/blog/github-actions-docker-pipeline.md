---
title: 'A minimal, production-minded CI pipeline with GitHub Actions'
description: 'Build, test, scan and push a container image on every commit — with caching, least-privilege tokens and no long-lived secrets.'
pubDate: 2026-09-26
tags: ['devops', 'ci-cd', 'github-actions', 'docker']
heroImage: '/images/uploads/ci-pipeline-cover.jpg'
draft: false
---

A CI pipeline doesn't need to be clever. It needs to be **fast, repeatable and boring**. Here's the baseline I reach for on any containerised service.

![A five-stage pipeline: commit, build, test, scan, deploy](/images/uploads/ci-cd-pipeline.svg)

## The workflow

```yaml
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  packages: write
  id-token: write # OIDC for cloud auth, no stored keys

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          push: ${{ github.event_name == 'push' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ghcr.io/${{ github.repository }}:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: '1'
```

## Why it's shaped this way

1. **Explicit `permissions`.** The default token can do far more than a build needs. Scope it down.
2. **OIDC over stored secrets.** `id-token: write` lets the job exchange a short-lived token with AWS, GCP or Azure instead of keeping access keys in repo secrets.
3. **Build cache in GitHub Actions.** `type=gha` layer caching routinely cuts image builds from minutes to seconds.
4. **Tag by commit SHA.** `latest` tells you nothing during an incident; a SHA tells you exactly what's running.
5. **Fail on critical CVEs.** Scanning that only warns gets ignored.

Locally, you can reproduce the build with:

```bash
docker buildx build --tag myapp:dev --load .
trivy image --severity CRITICAL,HIGH myapp:dev
```

Next time: promoting that image through environments with GitOps.
