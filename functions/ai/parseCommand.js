/**
 * AI Command Parsing Cloud Function
 *
 * Parses natural language commands into structured actions using OpenAI GPT-4.
 * Requires Firebase Authentication.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {TEMPLATES} = require("./templates");

// Define OpenAI API key as a Firebase secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * Call OpenAI API directly using fetch
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {string} apiKey - The OpenAI API key
 * @return {Promise<string>} The response content from OpenAI
 */
const callOpenAI = async (prompt, apiKey) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Parse AI Command Cloud Function
 *
 * Takes natural language input and returns structured command object
 */
exports.parseAICommand = onCall(
    {
    // Allow all origins for now (can be restricted later)
      cors: true,
      memory: "256MiB",
      timeoutSeconds: 60,
      minInstances: 0, // Cold start is OK
      maxInstances: 10,
      secrets: [openaiApiKey], // Grant access to the secret
      invoker: "public", // Public invocation (auth checked inside)
    },
    async (request) => {
    // Verify user is authenticated
      if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "User must be authenticated to use AI commands",
        );
      }

      const {userInput, canvasContext} = request.data;

      // Validate input
      if (!userInput || typeof userInput !== "string") {
        throw new HttpsError("invalid-argument", "userInput must be a string");
      }

      if (userInput.length > 500) {
        throw new HttpsError(
            "invalid-argument",
            "Command too long (max 500 characters)",
        );
      }

      try {
        // console.log(
        //     `Parsing command for user ${request.auth.uid}: ` +
        //   `"${userInput}"`,
        // );

        // Build prompt string
        const selectedShapes = JSON.stringify(
            (canvasContext && canvasContext.selectedShapes) || [],
        );
        const viewportCenter = JSON.stringify(
            (canvasContext && canvasContext.viewportCenter) ||
          {x: 500, y: 500},
        );

        /* eslint-disable max-len */
        const prompt = `
You are an AI assistant for a collaborative canvas application.
Parse the user's command into a structured JSON response.

Current context:
- Selected shapes: ${selectedShapes}
- Viewport center (visible screen): ${viewportCenter}
- Canvas size: 3000x3000
- Available shape types: rectangle, circle, line, text
- Available templates: loginForm, trafficLight, navigationBar, signupForm, dashboard

User command: ${userInput}

Respond ONLY with valid JSON in this exact format:
{
  "category": "creation|manipulation|layout|complex|selection|deletion|style|utility",
  "action": "brief description",
  "parameters": {
    // Category-specific parameters
  }
}

Rules:
- If no position specified, shapes will be placed at viewport center: ${viewportCenter}
- For "login form" → category: "complex", parameters: { "template": "loginForm" }
- For "traffic light" → category: "complex", parameters: { "template": "trafficLight" }
- For "nav bar" or "navigation" → category: "complex", parameters: { "template": "navigationBar" }
- For "signup form" or "register" → category: "complex", parameters: { "template": "signupForm" }
- For "dashboard" → category: "complex", parameters: { "template": "dashboard" }
- For creation: include shapeType, color (hex), size (width/height/radius), text
- For manipulation: include property and value or delta
- For layout: include arrangement type (horizontal/vertical/grid) and spacing
- For selection: include criteria (type/color)
- For deletion: include target (selected/all)
- For style: include property, value, and optional filter
- For utility: include action (zoom-in/zoom-out/center/undo/redo/clear-selection)
- If "it" or "that", refer to selected shapes
- Use reasonable defaults for unspecified properties

Respond with ONLY the JSON, no other text.
`;
        /* eslint-enable max-len */

        // Call OpenAI API directly
        const responseContent = await callOpenAI(prompt, openaiApiKey.value());

        // Parse JSON response
        let parsed;
        try {
        // Extract JSON from response (handle markdown code blocks if present)
          let content = responseContent;

          // Remove markdown code blocks if present
          if (content.includes("```json")) {
            const match = content.match(/```json\n([\s\S]*?)\n```/);
            content = (match && match[1]) || content;
          } else if (content.includes("```")) {
            const match = content.match(/```\n([\s\S]*?)\n```/);
            content = (match && match[1]) || content;
          }

          parsed = JSON.parse(content.trim());
        } catch (parseError) {
          console.error("Failed to parse AI response:", responseContent);
          throw new HttpsError(
              "internal",
              "AI returned invalid response format",
          );
        }

        // Validate required fields
        if (!parsed.category || !parsed.action) {
          throw new HttpsError(
              "internal",
              "AI response missing required fields",
          );
        }

        // If template selected, include template data
        if (parsed.category === "complex" &&
          parsed.parameters &&
          parsed.parameters.template) {
          const templateName = parsed.parameters.template;
          if (TEMPLATES[templateName]) {
            parsed.parameters.templateData = TEMPLATES[templateName];
            // console.log(`✅ Using template: ${templateName}`);
          } else {
            console.warn(`⚠️ Template not found: ${templateName}`);
          }
        }

        // console.log(`✅ Parsed command: ${parsed.category} - ${parsed.action}`);

        return {
          success: true,
          command: parsed,
        };
      } catch (error) {
        console.error("Error parsing AI command:", error);

        // Handle specific errors
        if (error instanceof HttpsError) {
          throw error;
        }

        // OpenAI API errors
        if (error.message && error.message.includes("API key")) {
          throw new HttpsError(
              "failed-precondition",
              "AI service configuration error",
          );
        }

        if (error.message && error.message.includes("timeout")) {
          throw new HttpsError(
              "deadline-exceeded",
              "AI request timed out, please try again",
          );
        }

        // Generic error
        throw new HttpsError(
            "internal",
            "Failed to parse command. Please try rephrasing.",
        );
      }
    },
);

