import type { Model } from 'mongoose';
import type { IBaseDocument } from '../types';
import type { AppContext } from '../../types/models';

export interface CoreModelRegistry {
  Topic: Model<IBaseDocument>;
  Argument: Model<IBaseDocument>;
  Question: Model<IBaseDocument>;
  Answer: Model<IBaseDocument>;
  Issue: Model<IBaseDocument>;
  Opinion: Model<IBaseDocument>;
  Artifact: Model<IBaseDocument>;
  CivicRecord: Model<IBaseDocument>;
}

export function getCoreModels(app: AppContext): CoreModelRegistry {
  return app.db.models as unknown as CoreModelRegistry;
}
