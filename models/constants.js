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
            return 'CLAIM (Inconclusive)';

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
            return 'CLAIM (Pending)';
    }
};

VERDICT_STATUS.getColor = function (status) {
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

module.exports = {
    OBJECT_TYPES: {
        topic: 1,
        argument: 2,
        question: 3,
        comment: 4,
        definition: 5,
        issue: 10,
        opinion: 11,

        worldview: 200
    },
    ARGUMENT_LINK_TYPES: {
        prove: 1,
        disprove: 2
    },
    ARGUMENT_TYPES: {
        positive: 1,
        negative: 2
    },
    CORE_GROUPS: {
        truth: 100,
        worldviews: 101,
        morality: 102
    },

    VERDICT_STATUS: VERDICT_STATUS
};