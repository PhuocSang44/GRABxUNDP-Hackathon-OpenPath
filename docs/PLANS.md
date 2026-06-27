# PLANS.md

How execution plans are created, updated, completed, and archived.

## When a Plan Is Required

Create an execution plan when work:

- spans more than one session
- changes more than one subsystem
- has non-trivial verification or rollout risk
- depends on open decisions that should be logged

Single-session, single-feature work can be tracked in `progress.md` alone.

## Plan Locations

- `docs/exec-plans/active/` — plans currently driving work (one file per plan)
- `docs/exec-plans/completed/` — finished plans kept for future agent context
- `docs/exec-plans/tech-debt-tracker.md` — deferred work and follow-ups

Filename pattern: `YYYY-MM-DD-short-topic.md`

## Minimum Plan Sections

- **Objective** — what this plan achieves in one sentence
- **Scope** — what is in and explicitly out of scope
- **Verification path** — the exact commands or checks that prove the work is done
- **Risks and blockers** — known dependencies, external keys, infra requirements
- **Progress log** — append-only; record each step as it completes
- **Open decisions** — questions that could change implementation direction

## Operating Rules

- One active plan should have one clearly owned current step.
- Update the plan as work progresses — it is the live record, not a frozen spec.
- If a decision changes implementation direction, record it in the plan before changing code.
- Move finished plans to `completed/` so agents can still discover prior context and understand why the code looks the way it does.
- Do not delete old plans; they are part of the repository's memory surface.
