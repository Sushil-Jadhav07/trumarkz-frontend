// Which space id field(s) apply depends on what the org verifies. Shared
// between OrgRegistration's Advanced section and Profile's Organization
// Details card so both stay in sync with the same field set and labels.
//
// Note: only space ids exist on the backend (human_space_id, product_space_id,
// warrenty_space_id — confirmed against the live GET /auth/me and
// PATCH /auth/me/dhiway-space schemas). There is no schema_id concept live;
// don't reintroduce human_schema_id/product_schema_id/warranty_schema_id
// fields without re-checking the live swagger first.
export const ID_FIELDS_BY_SERVICE_TYPE = {
  human: [
    { key: 'humanSpaceId', label: 'Human Space ID' },
  ],
  product: [
    { key: 'productSpaceId', label: 'Product Space ID' },
    { key: 'warrantySpaceId', label: 'Warranty Space ID' },
  ],
};
