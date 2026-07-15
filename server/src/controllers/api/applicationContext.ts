'use strict';

import type { Router } from 'express';
import type { WikitruthRequest, WikitruthResponse } from '../../types/http';
import * as flowUtilsNs from '../../utils/flowUtils';
import { resolveActiveApplication, visibleApplications } from '../../services/applicationContextService';

const flowUtils = flowUtilsNs as unknown as {
  getCategories: (
    model: { categories?: unknown[] },
    topicId: string | null,
    req: WikitruthRequest,
  ) => Promise<void>;
};

export default function attachApplicationContext(router: Router): void {
  router.get('/', async (req: WikitruthRequest, res: WikitruthResponse) => {
    const application = await resolveActiveApplication(req, res);
    const categoryModel: { categories?: unknown[] } = {};

    if (application?.exploreTopicId) {
      await flowUtils.getCategories(categoryModel, String(application.exploreTopicId), req);
    } else if (!application) {
      categoryModel.categories = (
        res.locals.appCategories ||
        (req.app.locals as { appCategories?: unknown[] } | undefined)?.appCategories ||
        []
      ) as unknown[];
    } else {
      categoryModel.categories = [];
    }

    res.json({
      application,
      applications: visibleApplications(application),
      appCategories: categoryModel.categories || [],
    });
  });
}
