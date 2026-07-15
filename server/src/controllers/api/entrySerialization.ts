const HYDRATED_IDENTITY_FIELDS = ['createUsername', 'editUsername', 'editorUsername'] as const;

type HydratedEntry = Record<string, unknown> & {
  toObject?: () => Record<string, unknown>;
};

export function serializeHydratedEntry<T extends HydratedEntry>(entry: T): Record<string, unknown> {
  const serialized = typeof entry.toObject === 'function' ? entry.toObject() : { ...entry };

  HYDRATED_IDENTITY_FIELDS.forEach((field) => {
    const value = entry[field];
    if (value) {
      serialized[field] = value;
    }
  });

  return serialized;
}
