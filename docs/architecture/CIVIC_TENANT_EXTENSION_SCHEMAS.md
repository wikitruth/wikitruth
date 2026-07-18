# Civic Tenant Extension Schema Contract

Date: 2026-07-18

## Purpose

Civic Core keeps common accountability data strongly typed while allowing each
country tenant to add bounded local fields without a backend fork. Tenant fields
are configuration, never executable code. Browser contributors and API agents
submit the same `extensions` object and receive the same validation behavior.

## Configuration

`CivicTenant.extensionSchemas` is keyed by `*` for fields shared by every civic
record or by one of the supported record kinds. A record-kind field with the same
key replaces the shared definition for that kind.

```json
{
  "*": {
    "title": "Local public record details",
    "fields": [
      { "key": "public_reference", "label": "Public reference", "type": "text", "maxLength": 120 }
    ]
  },
  "project": {
    "title": "Country project details",
    "fields": [
      { "key": "district", "label": "District", "type": "text", "required": true },
      {
        "key": "delivery_model",
        "label": "Delivery model",
        "type": "select",
        "options": [
          { "value": "public", "label": "Public" },
          { "value": "partnership", "label": "Partnership" }
        ]
      }
    ]
  }
}
```

Supported controls are `text`, `textarea`, `number`, `boolean`, `date`, `url`,
and `select`. Fields may define descriptions, placeholders, required state,
string lengths, numeric ranges, and select options.

## Safety Bounds

- Schema keys are `*` or a known Civic Core record kind.
- Field keys are stable lowercase identifiers and are unique per schema.
- A tenant may define at most 60 fields, with at most 30 in one schema.
- Configuration is limited to 50 KB and record extension values to 32 KB.
- Unknown fields, invalid options, unsupported URL protocols, and incorrect
  primitive types are rejected with field-addressable API errors.
- The service stores normalized values in `CivicRecord.extensions`; it never
  merges them into common model fields.

## Geography and Identity

The resolved tenant, not request data or model defaults, supplies `tenantId` and
`countryCode`. `geography.addressFields` controls which location fields the form
renders and the API accepts. This permits district, county, province, barangay,
or other country structures while maintaining strict tenant isolation.

## Administration

Only a platform administrator may create tenants or change tenant configuration.
Only an explicit active `TenantMembership` with the tenant `admin` role may
manage that tenant's members, jurisdictions, private records, and lifecycle.
Platform administration does not silently grant country-level final authority.
