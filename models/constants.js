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
    // * A statement of a far previous reality (historical or something had happen a long time or lacks evidences)
    ethical: 0,
    factual: 1,
    prediction: 2,
    historical: 3
};

ARGUMENT_TYPES.getUXInfo = function (typeId) {
    var label = "factual";
    var theme = "info";
    switch (typeId) {
        case ARGUMENT_TYPES.ethical:
            label = "ethical";
            theme = "warning";
            break;
        case ARGUMENT_TYPES.historical:
            label = "historical";
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

module.exports = {
    OBJECT_TYPES: {
        topic: 1,
        argument: 2,
        question: 3,
        comment: 4,
        definition: 5,
        issue: 10,
        opinion: 11
    },
    ARGUMENT_TYPES: ARGUMENT_TYPES,
    ETHICAL_STATUS: {
        very_good: 12,
        good: 11,
        encourage: 10,
        pending: 0,
        discourage: 20,
        bad: 21,
        dangerous: 22
    },
    VERDICT_STATUS: VERDICT_STATUS
};