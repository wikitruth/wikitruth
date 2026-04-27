'use strict';

import * as modernUtils from '../../../server/src/utils/utils';

const legacyUtils = modernUtils as unknown as Record<string, unknown>;
const legacyUtilsModule = module.exports as Record<string, unknown>;

Object.assign(legacyUtilsModule, legacyUtils);
legacyUtilsModule.default = legacyUtils;
