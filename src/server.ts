// src/server.ts
import express, { Response } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// Create an Express app.
const app = express();

// Enable CORS so the Vue client can communicate from another origin.
app.use(cors());
app.use(express.json());

// Create an MCP server instance with basic info.
const mcpServer = new McpServer(
  { name: "example-server", version: "1.0.0" },
  {
    capabilities: {},
  }
);

mcpServer.tool(
  "get-weather",
  "tool to get the current weather of a city",
  { city: z.string() },
  async ({ city }) => {
    // Mocking the weather data
    const weatherData = {
      city,
      temperature: 25,
      condition: "Sunny",
    };
    return {
      content: [
        {
          type: "text",
          text: `The current weather in ${weatherData.city} is ${weatherData.temperature}°C and ${weatherData.condition}.`,
        },
      ],
    };
  }
);

mcpServer.tool(
  "get-time",
  "tool to get the current time in a city",
  { city: z.string() },
  async ({ city }) => {
    // Mocking the time data
    const timeData = {
      city,
      time: "12:00 PM",
    };
    return {
      content: [
        {
          type: "text",
          text: `The current time in ${timeData.city} is ${timeData.time}.`,
        },
      ],
    };
  }
);

// Optionally add a resource.
mcpServer.resource("greeting", "greeting://user", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      text: "Hello from the MCP server!",
    },
  ],
}));

// --- SET UP SSE TRANSPORT ---

app.get("/mcp", async (req, res) => {
  console.log("New SSE connection");
  const transport = new SSEServerTransport("/mcp", res as Response);
  console.log("Transport created", transport.sessionId);
  await mcpServer.connect(transport);
  // Store the transport instance for later use. For simplicity, we assume a single client here.
  app.locals.transport = transport;
});

app.post("/mcp", async (req, res) => {
  const transport = app.locals.transport;
  console.log("Transport found", transport.sessionId);
  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error("Error handling POST request", error);
    res.status(500).send("Error handling POST request");
  }
});

// Listen on port 3001.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP Server HTTP endpoint is listening on port ${PORT}`);
});
