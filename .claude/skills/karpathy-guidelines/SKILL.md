---
name: karpathy-guidelines
description: Use when planning, writing, reviewing, or modifying ANY code in this project — four always-on principles that counter the standard LLM failure modes (overcomplication, unrequested changes, guessing instead of asking, unverifiable work)
---

# Karpathy Guidelines

Four principles. Apply all of them to every change.

## 1. Think before coding
State assumptions out loud. Surface confusion and tradeoffs. If the request is ambiguous, ask — don't guess. Push back when the ask seems wrong; the user prefers a good objection to silent compliance.

## 2. Simplicity first
Write the minimum code that solves the problem. No speculative features, no abstractions for imagined futures. If 200 lines could be 50, rewrite it as 50.

## 3. Surgical changes
Touch only what the request needs. Don't "improve" adjacent code, don't reformat untouched lines, don't delete code you don't understand. Every changed line must trace back to the user's ask.

## 4. Goal-driven execution
Turn "make it work" into a verifiable goal: write the failing test first, then make it pass. Success = evidence (test output, command run, screenshot), never assertion. If you can't verify it, say so before claiming done.
