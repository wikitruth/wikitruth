# Source Quality Rubric

## Purpose

This rubric evaluates whether an artifact can support factual review. It evaluates provenance and verifiability, not whether the reviewer agrees with the source.

## Scoring

Score each dimension from `0` to `4`.

| Dimension | `0` | `2` | `4` |
| --- | --- | --- | --- |
| Identity | Unknown creator or publisher | Creator is named but authority is unclear | Creator, publisher, and accountable organization are verified |
| Proximity | Unsupported retelling | Secondary source with traceable references | Primary record, direct observation, or authoritative dataset |
| Integrity | Material appears altered or incomplete | Partial copy with some verification path | Original or cryptographically/independently verifiable copy |
| Recency | Date is unknown or unsuitable | Date is known but relevance is uncertain | Capture/publication date is known and appropriate to the claim |
| Reproducibility | No access or method | Reviewer can inspect a copy but not reproduce it | Stable access, archive, method, and necessary context are available |

Total score ranges from `0` to `20`:

- `16-20`: strong source; may support a factual verdict when claim relevance is established.
- `11-15`: usable with limitations; reviewer must state the limitations.
- `6-10`: weak; corroboration is required.
- `0-5`: insufficient for a factual verdict.

## Required Provenance

Artifact review should capture source URL or origin description, origin type, creator/publisher when known, publication date, capture date, file metadata, archive URL or checksum when available, access limitations, and verifiability notes.

Missing data must remain explicitly `unknown`; reviewers must not infer provenance from filenames or visual appearance.

