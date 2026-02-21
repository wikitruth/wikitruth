import type { ObjectType, ScreeningStatusCode } from './domain';

export interface ConstantCodeLabel {
  code: number;
  text: string;
}

export interface VerdictStatusShape {
  pending: number;
  status_true: number;
  status_false: number;
  claim: number;
  most_likely: number;
  very_likely: number;
  likely: number;
  makes_sense: number;
  unlikely: number;
  very_unlikely: number;
  most_likely_false: number;
  misleading_invalid: number;
  categories: {
    true: number;
    pending: number;
    false: number;
  };
  getLabel(status: number): string | undefined;
  getTheme(status: number): { theme: 'success' | 'danger' | 'warning'; icon: string } | undefined;
  getCategory(status: number): number | undefined;
}

export interface ArgumentTypesShape {
  ethical: number;
  factual: number;
  prediction: number;
  artifact: number;
  artifactLabel: string;
  experience: number;
  getUXInfo(typeId: number): { label: string; theme: string };
}

export interface ScreeningStatusShape {
  [key: string]: {
    code: ScreeningStatusCode;
    text: string;
  };
  status0: { code: 0; text: string };
  status1: { code: 1; text: string };
  status2: { code: 2; text: string };
  status3: { code: 3; text: string };
}

export interface ObjectTypesShape {
  topic: 1;
  topicLink: 32;
  argument: 2;
  argumentLink: 31;
  question: 3;
  definition: 5;
  artifact: 6;
  issue: 10;
  opinion: 11;
  answer: 12;
  user: 21;
  group: 30;
}

export interface WikitruthConstants {
  OBJECT_TYPES: ObjectTypesShape;
  ARGUMENT_TYPES: ArgumentTypesShape;
  ISSUE_TYPES: Record<string, ConstantCodeLabel & { critical?: boolean }>;
  GROUP_ROLE_TYPES: Record<string, ConstantCodeLabel>;
  GROUP_PRIVACY_TYPES: Record<string, ConstantCodeLabel>;
  ARGUMENT_TAGS: Record<string, ConstantCodeLabel>;
  TOPIC_TAGS: Record<string, ConstantCodeLabel>;
  SCREENING_STATUS: ScreeningStatusShape;
  VERDICT_STATUS: VerdictStatusShape;
  SETTINGS: {
    contentPreviewLength: number;
    TILE_MAX_ENTRY_LEN: number;
    TILE_MAX_SUB_ENTRY_LEN: number;
    SUBCATEGORY_LIST_SIZE: number;
  };
  OBJECT_NAMES_MAP: Record<number, string>;
  OBJECT_ID_NAME_MAP: Record<number, string>;
  OBJECT_FORMAL_NAME_MAP: Record<number, string>;
  LINK_TYPES: Record<string, number>;
  ETHICAL_STATUS: Record<string, number>;
}

export type ObjectTypeMap = Record<ObjectType, string>;
