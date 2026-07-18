import {
  civicExtensionFields,
  civicExtensionSchemasInput,
  validateCivicExtensions,
} from '../../server/src/services/civicExtensionService';

const schemas = {
  '*': {
    title: 'Shared details',
    fields: [{ key: 'public_reference', label: 'Public reference', type: 'text' as const, maxLength: 20 }],
  },
  project: {
    title: 'Project details',
    fields: [
      { key: 'district', label: 'District', type: 'text' as const, required: true },
      { key: 'delivery_model', label: 'Delivery model', type: 'select' as const, options: [
        { value: 'public', label: 'Public' }, { value: 'partnership', label: 'Partnership' },
      ] },
      { key: 'beneficiaries', label: 'Beneficiaries', type: 'number' as const, min: 0, max: 1_000_000 },
    ],
  },
};

describe('civic tenant extension schemas', () => {
  it('accepts a bounded second-country schema and merges shared fields', () => {
    expect(civicExtensionSchemasInput.safeParse(schemas).success).toBe(true);
    expect(civicExtensionFields(schemas, 'project').map((field) => field.key)).toEqual([
      'public_reference', 'district', 'delivery_model', 'beneficiaries',
    ]);
  });

  it('normalizes configured values without accepting undeclared country fields', () => {
    const valid = validateCivicExtensions(schemas, 'project', {
      public_reference: ' REF-42 ', district: 'North', delivery_model: 'partnership', beneficiaries: 1200,
    });
    expect(valid).toEqual({
      success: true,
      data: { public_reference: 'REF-42', district: 'North', delivery_model: 'partnership', beneficiaries: 1200 },
    });

    const invalid = validateCivicExtensions(schemas, 'project', {
      public_reference: 'REF-42', delivery_model: 'private', unconfigured_field: 'not allowed',
    });
    expect(invalid).toEqual(expect.objectContaining({
      success: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: 'extensions.district' }),
        expect.objectContaining({ path: 'extensions.delivery_model' }),
        expect.objectContaining({ path: 'extensions.unconfigured_field' }),
      ]),
    }));
  });

  it('rejects executable, oversized, and malformed schema shapes', () => {
    expect(civicExtensionSchemasInput.safeParse({ project: { fields: [{ key: 'x', label: 'X', type: 'script' }] } }).success).toBe(false);
    expect(civicExtensionSchemasInput.safeParse({ unknown_kind: { fields: [] } }).success).toBe(false);
    expect(civicExtensionSchemasInput.safeParse({ project: { fields: [{ key: 'choice', label: 'Choice', type: 'select' }] } }).success).toBe(false);
  });
});
