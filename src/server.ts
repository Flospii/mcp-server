// src/server.ts
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// Create an Express app.
const app = express();

// Enable CORS so the Vue client can communicate from another origin.
app.use(cors());
app.use(express.json());

// In-memory store for active SSE transports, keyed by sessionId.
const sseTransports = new Map<string, SSEServerTransport>();

// Create an MCP server instance with basic info.
const mcpServer = new McpServer(
  { name: "example-server", version: "1.0.0" },
  { capabilities: {} }
);

// Define a simple tool as an example.
mcpServer.tool(
  "echo",
  "This tool echoes back the message you send.",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `Echo: ${message}` }]
  })
);

// Optionally add a resource.
mcpServer.resource(
  "greeting",
  "greeting://user",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "Hello from the MCP server!"
    }]
  })
);

// --- SET UP SSE TRANSPORT ---

// GET /mcp establishes the SSE connection.
app.get("/mcp", async (req, res) => {
  const sseTransport = new SSEServerTransport("/mcp", res);
  try {
    await sseTransport.start();
    console.log("SSE transport started with session:", sseTransport.sessionId);
    // Store the transport instance for later use.
    if (sseTransport.sessionId) {
      sseTransports.set(sseTransport.sessionId, sseTransport);
    } else {
      console.warn("Transport did not generate a sessionId; POST requests may fail.");
    }
  } catch (err) {
    console.error("Error starting SSE transport:", err);
    res.status(500).end("Error starting SSE stream.");
  }
});

// POST /mcp routes incoming JSON‑RPC messages.
app.post("/mcp", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).end("Missing sessionId query parameter.");
    return;
  }

  console.log("Received POST request with sessionId:", sessionId);

  // Retrieve the existing SSE transport instance by sessionId.
  const sseTransport = sseTransports.get(sessionId);
  if (!sseTransport) {
    res.status(400).end("Unknown or expired sessionId.");
    return;
  }

  try {
    // Pass req.body (the parsed JSON) so that the transport does not try to re-read the stream.
    await sseTransport.handlePostMessage(req, res, req.body);
  } catch (err) {
    console.error("Error handling POST message:", err);
    res.status(500).end("Internal Server Error");
  }
});

// Optionally, add cleanup logic to remove closed transports from sseTransports.

// Listen on port 3001.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP Server HTTP endpoint is listening on port ${PORT}`);
});
