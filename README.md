# Baseline

It loads the NIST cybersecurity framework, lets you mark where you stand on each
item, and shows what's missing and who owns fixing it.

> **Status: in development.** This README is a stub. It is completed in Phase 5 —
> see [DECISIONS.md](./DECISIONS.md) for the running design log.

## The problem

Small organizations that handle sensitive data get asked to show that their security
is adequate — by a partner, a funder, or a customer. Most can't answer. They have some
good practices but nothing mapping them to a recognized standard and nothing showing
what's missing.

Baseline walks a small organization through NIST CSF 2.0, records where they actually
stand on each of its 22 categories, and shows what's missing and who's fixing it.

## What this is not

Not a novel product. Commercial tools (Vanta, Drata, Secureframe) do this and more, as
do open-source options (CISO Assistant, Eramba). Baseline is a deliberately simplified,
single-organization version. The full version of this section is written in Phase 5.

## Data source

NIST Cybersecurity Framework 2.0 (NIST.CSWP.29, 26 February 2024), from NIST's
Cybersecurity and Privacy Reference Tool. US Government work, public domain. NIST's
category descriptions are stored verbatim.
