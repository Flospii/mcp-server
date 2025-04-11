"use strict";
// src/server.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const zod_1 = require("zod");
// Create an Express application.
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Create an MCP server instance with basic info.
const mcpServer = new mcp_js_1.McpServer({ name: "example-server", version: "1.0.0" }, { capabilities: {} });
// Define a simple "echo" tool.
mcpServer.tool("echo", { message: zod_1.z.string() }, (_a) => __awaiter(void 0, [_a], void 0, function* ({ message }) {
    return ({
        content: [{ type: "text", text: `Echo: ${message}` }]
    });
}));
// Define a greeting resource.
mcpServer.resource("greeting", "greeting://user", (uri) => __awaiter(void 0, void 0, void 0, function* () {
    return ({
        contents: [{
                uri: uri.href,
                text: "Hello from the MCP server!"
            }]
    });
}));
// Maintain a map of active SSE transports by their session IDs.
const transports = {};
/**
 * GET /mcp
 *
 * This route handles establishing the SSE connection.
 * It creates a new SSEServerTransport, starts it, and saves it by its session ID.
 */
app.get("/mcp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Create a new SSE transport instance with the endpoint path ("/mcp") and the HTTP response.
    const transport = new sse_js_1.SSEServerTransport("/mcp", res);
    try {
        // Start the SSE connection (this sends the proper SSE headers and starts the stream).
        yield transport.start();
        // Store the transport instance using its session ID.
        transports[transport.sessionId] = transport;
        console.log("SSE transport started with session:", transport.sessionId);
        // The transport takes over the response stream.
    }
    catch (err) {
        console.error("Error starting SSE transport:", err);
        res.statusCode = 500;
        res.end("Error starting SSE transport.");
    }
}));
/**
 * POST /mcp
 *
 * This route handles incoming JSON‑RPC messages.
 * The client should include a session ID (e.g. as a query parameter) that corresponds to the SSE
 * connection previously established.
 */
app.post("/mcp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Expect the client to pass the session ID in the URL as ?sessionId=...
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId || !transports[sessionId]) {
        res.statusCode = 400;
        res.end("Missing or invalid sessionId.");
        return;
    }
    const transport = transports[sessionId];
    try {
        yield transport.handlePostMessage(req, res);
    }
    catch (err) {
        console.error("Error handling POST message:", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}));
// Start the Express server on port 3001.
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`MCP Server HTTP endpoint is listening on port ${PORT}`);
});
