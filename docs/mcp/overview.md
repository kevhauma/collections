# MCP: overview

Prefix `MCP`. The MCP server that lets an AI agent do admin edits, and its OAuth sign-in. Design: [technical-design.md § Auth and security](../technical-design.md#auth-and-security).

- [ ] [TICKET-MCP-01](./tickets/TICKET-MCP-01-admin-mcp-server.md): MCP server for admin edits by an AI agent (new; extends § Scope, § Auth and security). Needs TICKET-AUTH-02, TICKET-ITM-02, TICKET-COL-03 (all shipped), independent, can ship any time · _unreleased_
- [x] [TICKET-MCP-02](./tickets/TICKET-MCP-02-create-collections-and-item-images.md): MCP tools to create collections and set item images from a URL (extends TICKET-MCP-01, § Auth and security). Needs TICKET-MCP-01 · v1
