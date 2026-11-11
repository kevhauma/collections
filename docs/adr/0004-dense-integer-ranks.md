# 0004: Dense integer ranks for wants

Status: accepted (2026-11-11)

## Context

Wants are ordered by hand. The admin reorders by dragging **or** by typing a rank ("make this #3"), and the rest
shift.

## Decision

- `items.rank` is a dense integer 1..n per collection, only for `want` items.
- Every rank change runs in one transaction:
  - **Move from r1 to r2**: if r2 < r1, shift `[r2, r1)` up by one; else shift `(r1, r2]` down by one. Then set
    the item to r2. Clamp r2 to 1..n.
  - **Insert** (new want, or have → want): rank n+1.
  - **Remove** (delete, or want → have): shift every rank > r down by one.
- The pure part (computing the new order) is a function with unit tests. The SQL applies it.

Rejected: **fractional / lexicographic keys**. They avoid renumbering, but "type 3 to move it to 3rd" needs dense
positions anyway, and renumbering a few hundred rows in SQLite is instant.

## Consequences

- No unique index on `(collection_id, rank)`: the shift UPDATE would violate it mid-statement. Correctness comes
  from the transaction and the tests.
- The typed rank number input makes reordering keyboard-accessible, so drag-and-drop is purely a convenience.
