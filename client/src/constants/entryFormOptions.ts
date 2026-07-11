import type { NumericTagOption } from '../components/Form/NumericTagCheckboxes';

export const FACT_TYPE_OPTIONS = [
  { value: '1', label: 'Factual - a current fact, reality, or phenomenon' },
  { value: '2', label: 'Prediction - an extrapolation or future claim' },
  { value: '3', label: 'Artifact - a public claim or reference material' },
  { value: '4', label: 'Testimony - a personal experience' },
  { value: '0', label: 'Value - a moral, ethical, or aesthetic claim' },
];

export const TOPIC_TAG_OPTIONS: NumericTagOption[] = [
  { value: 20, label: 'Key Topic', help: 'A primary or crucial part of the parent topic.' },
  { value: 510, label: 'Category' },
  { value: 520, label: 'Main Topic' },
  { value: 530, label: 'Person' },
  { value: 540, label: 'Territory' },
  { value: 550, label: 'Event' },
  { value: 560, label: 'Organization' },
  { value: 565, label: 'Idea' },
  { value: 567, label: 'List' },
  { value: 570, label: 'Source' },
];

export const FACT_TAG_OPTIONS: NumericTagOption[] = [
  { value: 20, label: 'Key Fact', help: 'A primary or crucial part of the parent entry.' },
  { value: 30, label: 'Extrapolation' },
  { value: 40, label: 'Conjecture' },
  { value: 50, label: 'Hypothetical' },
  { value: 60, label: 'Generalization' },
  { value: 70, label: 'Conceptual' },
  { value: 80, label: 'Figurative' },
];
