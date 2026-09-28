require("dotenv").config();
const {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
} = require("@langchain/langgraph");
const { ToolNode } = require("@langchain/langgraph/prebuilt");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} = require("@langchain/google-genai");
const { TavilySearch } = require("@langchain/tavily");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { TaskType } = require("@google/generative-ai");
const { QdrantVectorStore } = require("@langchain/qdrant");
connectDB();
const port = 3003;

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.6-flash",
  temperature: 0,
  maxOutputTokens: 200,
  maxRetries: 2,
});

// =====================================================
// EMBEDDINGS
// =====================================================

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Knowledge Base Embeddings",
});

// =====================================================
// QDRANT
// =====================================================

/** @type {import("@langchain/qdrant").QdrantVectorStore | undefined} */

let vectorStore;

// =====================================================
// CONNECT TO EXISTING QDRANT COLLECTION
// =====================================================

const initializeVectorStore = async () => {
  console.log("Connecting to Qdrant...");

  vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: "grocery_knowledge",
  });
  console.log("Qdrant connected successfully");
};

// =====================================================
// PDF UPLOAD
// =====================================================

const upload = async () => {
  console.log("Reading PDF...");
  const pdfFile = "./knowledge.pdf";
  const buffer = fs.readFileSync(pdfFile);
  const pdfresult = new PDFParse({
    data: buffer,
  });
  const text = await pdfresult.getText();
  const alltext = text.text;
  console.log("PDF text extracted");
  // =================================================
  // TEXT SPLITTER
  // =================================================
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await splitter.createDocuments([alltext]);
  console.log("Total chunks:", docs.length);
  if (!vectorStore) {
    throw new Error("Vector store is not initialized");
  }
  // =================================================
  // ADD DOCUMENTS TO QDRANT
  // =================================================

  await vectorStore.addDocuments(docs);
  console.log("Documents successfully added to Qdrant");
};
// =====================================================
// QDRANT SEARCH TOOL
// =====================================================
const grocerySearchTool = tool(
  async ({ query }) => {
    console.log("🔎 QDRANT SEARCH:", query);

    if (!vectorStore) {
      return "Grocery knowledge base is not available.";
    }
    const docs = await vectorStore.similaritySearch(query, 3);
    if (!docs || docs.length === 0) {
      return "No relevant information was found in the grocery knowledge base.";
    }
    const context = docs.map((doc) => doc.pageContent).join("\n\n");
    console.log("QDRANT RESULT:", context);
    return context;
  },
  {
    name: "grocery_knowledge_search",
    description: `
Search the grocery PDF knowledge base.
Use this tool when the user asks about:
- grocery products
- grocery prices
- product availability
- grocery product information
- products listed in the grocery PDF
- information that may exist in the grocery knowledge base

Do NOT use this tool for:

- current weather
- current date
- current time
- latest news
- current events
- general internet information
`,

    schema: z.object({
      query: z
        .string()
        .describe(
          "The grocery-related question to search in the knowledge base",
        ),
    }),
  },
);

// =====================================================
// TAVILY SEARCH
// =====================================================

const tavilyTool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

// =====================================================
// CURRENT DATE / TIME TOOL
// =====================================================

const currentDateTimeTool = tool(
  async () => {
    const now = new Date();

    const result = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",

      dateStyle: "full",

      timeStyle: "long",
    });

    console.log("CURRENT INDIA DATE/TIME:", result);

    return result;
  },

  {
    name: "current_date_time",

    description: `
Get the exact current date and time in India.

Use this tool whenever the user asks:

- today's date
- current date
- current time
- what day is today
- date in India
- time in India

Do not use Tavily for these questions.
`,

    schema: z.object({}),
  },
);

const tools = [grocerySearchTool, tavilyTool, currentDateTimeTool];

// =====================================================
// MEMORY
// =====================================================
const memory = new MemorySaver();
// =====================================================
// TOOL NODE
// =====================================================
const toolNode = new ToolNode(tools);
// =====================================================
// LLM WITH TOOLS
// =====================================================
const llmwithtools = llm.bindTools(tools);
// =====================================================
// LLM / AGENT NODE
// =====================================================
const callLLM = async (state) => {
  console.log("\n================ AGENT ================\n");
  console.log("STATE:", state);
  const response = await llmwithtools.invoke([
    {
      role: "system",

      content: `
You are an intelligent grocery assistant.
You have access to three tools.
==================================================
1. grocery_knowledge_search
==================================================
This searches the grocery PDF knowledge base.

Use it for:

- grocery products
- grocery prices
- product information
- product availability
- information contained in the grocery PDF

Never invent a grocery price.

If the required grocery information is not found,
tell the user that it was not found in the knowledge base.


==================================================
2. tavily_search
==================================================

This searches the internet.

Use it for:

- latest information
- current events
- current news
- latest product information
- information not available in the grocery PDF
- general web information
- real-time information

Do not use your internal knowledge for information
that must be current.

==================================================
3. current_date_time
==================================================

This provides the exact current date and time in India.
Use it for:

- today's date
- current date
- current time
- day today
- date in India
- time in India
Do NOT use Tavily for exact current India date/time.

==================================================
IMPORTANT AGENT RULES
==================================================

1. Decide yourself which tool is required.
2. Do NOT call grocery_knowledge_search for every question.
3. Do NOT call tavily_search for every question.
4. You can call multiple tools if the question requires
   information from multiple sources.
5. Use the tool results to formulate the final answer.
6. Never invent information.
7. Keep answers short and direct.
8. If the user asks a normal conversational question
   that does not require a tool, answer normally.
9. If the user asks about information from the grocery
   PDF, use grocery_knowledge_search.
10. If the user asks for current internet information,
    use tavily_search.
11. If the user asks for exact current India date/time,
    use current_date_time.
`,
    },

    // =================================================
    // PREVIOUS MESSAGES
    // =================================================

    ...state.messages,
  ]);

  console.log("AI RESPONSE:", response);
  console.log("TOOL CALLS:", response.tool_calls);
  console.log("\n========================================\n");
  return {
    messages: [response],
  };
};
// =====================================================
// CONDITIONAL EDGE
// =====================================================

const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];

  // If Gemini requested a tool
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log("➡️ Agent requested a tool");

    return "tools";
  }

  console.log("✅ Agent finished");
  return "__end__";
};

// =====================================================
// LANGGRAPH
// =====================================================

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .compile({
    checkpointer: memory,
  });

// =====================================================
// API
// =====================================================

app.post("/llm", async (req, res) => {
  try {
    const { input, threadId } = req.body;

    if (!input) {
      return res.status(400).json({
        message: "Input is required",
      });
    }
    const conversationId = threadId || "default-user-thread";
    console.log("THREAD ID:", conversationId);
    console.log("USER:", input);

    const response = await graph.invoke(
      {
        messages: [
          {
            role: "human",
            content: input,
          },
        ],
      },

      {
        configurable: {
          thread_id: conversationId,
        },
      },
    );

    // =================================================
    // LAST MESSAGE
    // =================================================

    const lastMessage = response.messages[response.messages.length - 1];

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      ai: lastMessage.content,
    });
  } catch (error) {
    console.error("LLM ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",

      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send(`Hello from ${process.env.SERVERNAME} server`);
});

const startServer = async () => {
  try {
    console.log("Starting server...");

    // =================================================
    // CONNECT TO EXISTING QDRANT COLLECTION
    // =================================================

    await initializeVectorStore();

    // =================================================
    // DO NOT RUN THIS EVERY TIME
    // =================================================

    // await upload();

    // =================================================
    // START EXPRESS
    // =================================================

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("STARTUP ERROR:", error);

    process.exit(1);
  }
};
startServer();
