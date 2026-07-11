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
- Legacy verdict fields remain readable during migration and map only to the factual channel.
- Automatic unresolved-content expiry is disabled until a separate approved policy defines thresholds, notices, exceptions, and administrator overrides.
- Critical unresolved issues block a final factual verdict only after the issue-first gate and exception process are implemented.

## Review Presentation

User interfaces must label both channels explicitly, show `Not reviewed` instead of implying a default result, and display the reasoning and evidence associated with the selected channel.

