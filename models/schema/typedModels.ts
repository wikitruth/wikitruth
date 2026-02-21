import type { Model } from 'mongoose';
import type { IBaseDocument } from '../types';

export interface CoreModelRegistry {
  Topic: Model<IBaseDocument>;
  Argument: Model<IBaseDocument>;
  Question: Model<IBaseDocument>;
  Answer: Model<IBaseDocument>;
  Issue: Model<IBaseDocument>;
  Opinion: Model<IBaseDocument>;
  Artifact: Model<IBaseDocument>;
}

export function getCoreModels(app: { db: { models: Record<string, unknown> } }): CoreModelRegistry {
  return app.db.models as unknown as CoreModelRegistry;
}
