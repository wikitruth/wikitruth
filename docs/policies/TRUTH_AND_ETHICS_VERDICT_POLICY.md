# Truth And Ethics Verdict Policy

## Independent Channels

Factual truth and ethical assessment are separate verdict channels. An entry may have either, both, or neither.

### Factual Channel

Allowed states are `pending`, `supported`, `refuted`, `mixed`, and `insufficient_evidence`.

The factual channel asks whether the descriptive claim is supported by available evidence. Reviewer reasoning must cite artifacts or explain why evidence is insufficient.

### Ethical Channel

Allowed states are `pending`, `permissible`, `impermissible`, `contested`, and `not_applicable`.

The ethical channel asks how an action or position should be evaluated under an identified ethical framework. Reviewer reasoning must name the framework or principle; disagreement between frameworks is represented as `contested`, not converted into a factual dispute.

## Decision Rules

- A factual verdict cannot be inferred from ethical approval or disapproval.
- An ethical verdict cannot be inferred from factual truth or falsity.
- Each channel stores its own status, reasoning, votes, reviewer, decision date, and evidence references.
- Consensus is the normal final-decision path and is computed independently for each channel under a versioned policy.
- Conflicted votes remain visible for audit but do not count toward consensus; abstentions do not count toward a status majority.
- An administrator may make the final decision through an explicit override that records the reason, evidence, policy version, available consensus snapshot, actor, and date.
- Administrator overrides must be visibly labeled and remain reversible through a later revision; they never rewrite or hide prior consensus.
- Legacy verdict fields remain readable during migration and map only to the factual channel.
- Automatic unresolved-content expiry is disabled until a separate approved policy defines thresholds, notices, exceptions, and administrator overrides.
- Critical unresolved issues block a final factual verdict only after the issue-first gate and exception process are implemented.

## Review Presentation

User interfaces must label both channels explicitly, show `Not reviewed` instead of implying a default result, and display the reasoning and evidence associated with the selected channel.

Consensus decisions and administrator final-say decisions must be visually distinct. Minority and excluded vote reasoning remains available to reviewers and administrators.
