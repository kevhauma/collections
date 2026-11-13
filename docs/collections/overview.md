# Collections: overview

Prefix `COL`. Collections, slugs, the field editor, schema evolution. Design: [technical-design.md § Domain](../technical-design.md#domain).

- [x] [TICKET-COL-01](./tickets/TICKET-COL-01-collection-management.md): Collection management: create, settings, delete (§ Collection, § Slugs, ADR 0005). Needs TICKET-AUTH-02, TICKET-UI-02 · v1
- [x] [TICKET-COL-02](./tickets/TICKET-COL-02-field-editor.md): Field editor (§ Field, § Schema evolution). Needs TICKET-COL-01 · v1
- [x] [TICKET-COL-03](./tickets/TICKET-COL-03-schema-evolution.md): Field type changes and select-option edits (§ Schema evolution). Needs TICKET-COL-02, TICKET-ITM-02 · v1
- [x] [TICKET-COL-04](./tickets/TICKET-COL-04-field-prefix-suffix.md): Field prefix and suffix (extends § Field). Needs TICKET-COL-02, TICKET-ITM-05 (both shipped), independent, can ship any time · v1
- [x] [TICKET-COL-05](./tickets/TICKET-COL-05-rating-field.md): Rating field with configurable max and symbol (new type in § Field, § Schema evolution). Needs TICKET-COL-03 (shipped), independent, can ship any time · v1
- [ ] [TICKET-COL-06](./tickets/TICKET-COL-06-collection-picture.md): Collection picture (extends § Collection, reuses TICKET-ITM-04). Needs TICKET-COL-01, TICKET-ITM-04 (shipped) and TICKET-BAK-01 (built, one criterion open) for the export part · _unreleased_
