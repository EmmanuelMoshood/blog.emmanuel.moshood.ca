---
title: TypeSafe in Front of Gemini
description: I wanted a reason to use TypeSafe that was not another chatbot
  wrapper. Most of the AI I wire into software still wants to talk. I needed
  something that would decide, then get out of the way.
pubDate: 2026-09-27
tags:
  - AI
  - Typesafe
  - Gemini
  - Python
heroImage: /images/uploads/jev-image-gate-architecture.png
draft: false
---
\# The mismatch

Large language models are trained to produce text for people. When your program needs a judgment - allow or deny, cheap or expensive, specific enough or not - you end up coercing a text generator into a JSON blob, then hoping the next response still parses.

That hop is where a lot of “AI in production” work actually lives. Prompt. Parse. Retry. Soften the prompt. Parse again. Meanwhile the thing you were trying to protect, an image API call, is already one hallucinated `yes` away from spending.

[TypeSafe](https://typesafe.ai/) starts from a different bet. Their [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer) puts it plainly: large-scale automation will be mostly machine-to-machine, so the machine interface matters more than the chat interface. They train for calibrated decisions instead of preferred-sounding prose.

\# What TypeSafe Jev is

[Jev](https://docs.typesafe.ai/introduction) is TypeSafe’s flagship model, and the first [System One](https://docs.typesafe.ai/concepts/system-one) model. You send a *state* and a set of typed *questions*. You get structured answers back. No generated paragraph. No “here is my reasoning.” Values your code can branch on.

The name comes from Kahneman’s System 1: fast, focused judgments. Jev currently takes text - strings, JSON, arrays of text. It does not see images. That is the point in this demo. The decision model never looks at pixels. The image model never decides whether it is allowed to run.

TypeSafe gives you three primitives. You can mix them in one request. Each question is evaluated in parallel against the same state:
