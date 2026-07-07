# Provide Nova with Direct Database Access

Currently, Nova relies on rigid, regex-based handler functions (`handleOrderLookup`, `handleItemSearch`, etc.) which were ported over from the legacy system. These handlers are extremely limited; for example, `handleOrderLookup` assumes any unrecognized text is a customer name, making it impossible to search for orders by item model (like "pixel 10 pro xl").

To make Nova truly intelligent and "know everything in our system," we will replace or augment these rigid tools with a powerful `query_database` tool that allows the LangGraph agent to directly execute read-only MongoDB queries against the `Sale`, `Inventory`, `Customer`, and `Supplier` collections.

## Proposed Changes

### `backend/controllers/agentController.js`
1. **Add `query_database` Tool**:
   - Create a new `DynamicTool` that accepts a JSON string specifying the `collection`, `query` (MongoDB filter), `limit`, and `sort`.
   - The tool will securely execute `Model.find(query).sort(sort).limit(limit).lean()` and return the raw JSON results to the LLM.
   - The LLM can then natively read the raw data and format the perfect response to the user.
2. **Update System Prompt**:
   - Instruct the LLM to use `query_database` for complex searches (e.g., searching sales by item model, finding customers by specific criteria, or checking exact inventory fields) when the basic tools fail or are insufficient.

## Safety
- The tool will **only** support `.find()` (read-only operations). It will not allow modifications, deletions, or updates.
- It will be restricted to the 4 main collections (`Sale`, `Inventory`, `Customer`, `Supplier`).
