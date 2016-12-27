'use strict';

var VERDICT_STATUS = {
    pending: 0,
    status_true: 1,
    status_false: 2,
    claim: 3,

    most_likely: 13,
    very_likely: 12,
    likely: 11,
    makes_sense: 10,

    unlikely: 21,
    very_unlikely: 22,
    most_likely_false: 23,
    misleading_invalid: 24,

    categories: {
        true: 1,
        false:  0,
        pending: 2
    }
};

VERDICT_STATUS.getLabel = function (status) {
    switch (status) {
        case VERDICT_STATUS.status_true:
            return 'TRUE';
        case VERDICT_STATUS.status_false:
            return 'FALSE';
        case VERDICT_STATUS.claim:
            return 'Claim (Inconclusive)';

        case VERDICT_STATUS.most_likely:
            return 'Most Like True';
        case VERDICT_STATUS.very_likely:
            return 'Very Likely';
        case VERDICT_STATUS.likely:
            return 'Likely';
        case VERDICT_STATUS.makes_sense:
            return 'Makes Sense';

        case VERDICT_STATUS.unlikely:
            return 'Unlikely';
        case VERDICT_STATUS.very_unlikely:
            return 'Very Unlikely';
        case VERDICT_STATUS.most_likely_false:
            return 'Most Likely False';
        case VERDICT_STATUS.misleading_invalid:
            return 'Misleading (Invalid)';

        case VERDICT_STATUS.pending:
            return 'Claim (Unverified)';
    }
};

VERDICT_STATUS.getTheme = function (status) {
    switch (status) {
        case VERDICT_STATUS.status_true:
        case VERDICT_STATUS.most_likely:
        case VERDICT_STATUS.very_likely:
        case VERDICT_STATUS.likely:
        case VERDICT_STATUS.makes_sense:
            return 'success';

        case VERDICT_STATUS.status_false:
        case VERDICT_STATUS.unlikely:
        case VERDICT_STATUS.very_unlikely:
        case VERDICT_STATUS.most_likely_false:
        case VERDICT_STATUS.misleading_invalid:
            return 'danger';

        case VERDICT_STATUS.claim:
        case VERDICT_STATUS.pending:
            return 'warning';
    }
};

VERDICT_STATUS.getCategory = function (status) {
    switch (status) {
        case VERDICT_STATUS.status_true:
        case VERDICT_STATUS.most_likely:
        case VERDICT_STATUS.very_likely:
        case VERDICT_STATUS.likely:
        case VERDICT_STATUS.makes_sense:
            return VERDICT_STATUS.categories.true;

        case VERDICT_STATUS.status_false:
        case VERDICT_STATUS.unlikely:
        case VERDICT_STATUS.very_unlikely:
        case VERDICT_STATUS.most_likely_false:
        case VERDICT_STATUS.misleading_invalid:
            return VERDICT_STATUS.categories.false;

        case VERDICT_STATUS.claim:
        case VERDICT_STATUS.pending:
            return VERDICT_STATUS.categories.pending;
    }
};

var ARGUMENT_TYPES = {
    // Types of arguments:
    // * A moral or ethical argument (something that should or should not/ought/this becomes a voting then? E.g. ought or ought not)
    // * A statement of a reality or phenomenon (current)
    // * A prediction of a future event or phenomenon
    // * A public material (a popular claim) or a reference material (source)
    ethical: 0,
    factual: 1,
    prediction: 2,
    artifact: 3,
    experience: 4
};

ARGUMENT_TYPES.getUXInfo = function (typeId) {
    var label = "factual";
    var theme = "info";
    switch (typeId) {
        case ARGUMENT_TYPES.ethical:
            label = "value";
            theme = "warning";
            break;
        case ARGUMENT_TYPES.artifact:
            label = "artifact";
            break;
        case ARGUMENT_TYPES.experience:
            label = "experience";
            break;
        case ARGUMENT_TYPES.prediction:
            label = "prediction";
            break;
    }

    return {
        label: label,
        theme: theme
    };
};

var SCREENING_STATUS = {
    status0: {
        code: 0,
        text: "Pending"
    },
    status1: {
        code: 1,
        text: "Approved"
    },
    status2: {
        code: 2,
        text: "Rejected"
    }
};

var ISSUE_TYPES = {
    type10: {
        code: 10,
        text: "Logical fallacy"
    },
    type20: {
        code: 20,
        text: "Biased or flawed reasoning"
    },
    type30: {
        code: 30,
        text: "Terminology issue"
    },
    type40: {
        code: 40,
        text: "Unwelcome content"
    },
    type50: {
        code: 50,
        text: "Incoherent or unrelated"
    },
    type60: {
        code: 60,
        text: "Too broad or multiple topics"
    },
    type70: {
        code: 70,
        text: "Unsubstantiated claim"
    },
    type100: {
        code: 100,
        text: "Other issue"
    }
};

var ARGUMENT_TAGS = {
    tag10: {
        code: 10,
        text: "Value"
    },
    tag20: {
        code: 20,
        text: "Key Argument"
    },
    tag30: {
        code: 30,
        text: "Extrapolation"
    },
    tag40: {
        code: 40,
        text: "Conjecture"
    },
    tag50: {
        code: 50,
        text: "Hypothetical"
    },
    tag60: {
        code: 60,
        text: "Generalization"
    },
    tag70: {
        code: 70,
        text: "Conceptual"
    },
    tag80: {
        code: 80,
        text: "Figurative"
    }
};

var TOPIC_TAGS = {
    tag10: {
        code: 10,
        text: "Value"
    },
    tag20: {
        code: 20,
        text: "Key Topic"
    },
    tag510: {
        code: 510,
        text: "Category"
    },
    tag520: {
        code: 520,
        text: "Main"
    },
    tag530: {
        code: 530,
        text: "Person"
    },
    tag540: {
        code: 540,
        text: "Territory"
    },
    tag550: {
        code: 550,
        text: "Event"
    },
    tag560: {
        code: 560,
        text: "Organization"
    },
    tag570: {
        code: 570,
        text: "Artifact"
    }
};

module.exports = {
    OBJECT_TYPES: {
        topic: 1,
        argument: 2,
        question: 3,
        comment: 4,
        definition: 5,
        issue: 10,
        opinion: 11,
        user: 21
    },
    ARGUMENT_TYPES: ARGUMENT_TYPES,
    ISSUE_TYPES: ISSUE_TYPES,
    ARGUMENT_TAGS: ARGUMENT_TAGS,
    TOPIC_TAGS: TOPIC_TAGS,
    ETHICAL_STATUS: {
        very_good: 12,
        good: 11,
        encourage: 10,
        pending: 0,
        discourage: 20,
        bad: 21,
        dangerous: 22
    },
    SCREENING_STATUS: SCREENING_STATUS,
    VERDICT_STATUS: VERDICT_STATUS
};