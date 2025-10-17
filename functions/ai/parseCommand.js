/**
 * AI Command Parsing Cloud Function
 *
 * Parses natural language commands into structured actions using OpenAI GPT-4.
 * Requires Firebase Authentication.
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {TEMPLATES, generateNavigationBar} = require("./templates");

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
 * Check if a hex color is grayscale (black, white, or grey)
 * @param {string} color - Hex color string (e.g., "#FF5733" or "#808080")
 * @return {boolean} True if grayscale, false otherwise
 */
const isGrayscaleColor = (color) => {
  if (!color || typeof color !== "string") return true; // Allow undefined/null

  // Remove # if present
  const hex = color.replace("#", "");

  // Must be valid hex
  // Allow invalid hex (will be caught elsewhere)
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return true;

  // Extract RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Grayscale means R = G = B
  return r === g && g === b;
};

/**
 * Validate that all colors in a parsed command are grayscale
 * @param {Object} parsed - Parsed command object
 * @return {Object} { isValid: boolean, invalidColors: string[] }
 */
const validateGrayscaleColors = (parsed) => {
  const invalidColors = [];

  // Check parameters object for color properties
  if (parsed.parameters) {
    const params = parsed.parameters;

    // Check common color properties
    const colorProps = ["color", "fill", "stroke"];

    for (const prop of colorProps) {
      if (params[prop] && !isGrayscaleColor(params[prop])) {
        invalidColors.push(params[prop]);
      }
    }

    // Check templateData if present (for complex templates)
    if (params.templateData && params.templateData.shapes) {
      for (const shape of params.templateData.shapes) {
        if (shape.fill && !isGrayscaleColor(shape.fill)) {
          invalidColors.push(shape.fill);
        }
        if (shape.stroke && !isGrayscaleColor(shape.stroke)) {
          invalidColors.push(shape.stroke);
        }
      }
    }
  }

  return {
    isValid: invalidColors.length === 0,
    invalidColors,
  };
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
            (canvasContext && canvasContext.selectedShapeIds) || [],
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
- Available templates: loginForm, trafficLight, navigationBar, signupForm, dashboard, cardLayout

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
- CRITICAL: Only use grayscale colors (black, white, or grey shades). RGB values must be equal (e.g., #000000, #FFFFFF, #808080). NO colored fills or strokes allowed.
- If no position specified, shapes will be placed at viewport center: ${viewportCenter}
- For "login form" → category: "complex", parameters: { "template": "loginForm" }
- For "traffic light" → category: "complex", parameters: { "template": "trafficLight" }
- For "nav bar" or "navigation" → category: "complex", parameters: { "template": "navigationBar" }
- For "nav bar with X items" → category: "complex", parameters: { "template": "navigationBar", "itemCount": X }
- For "signup form" or "register" → category: "complex", parameters: { "template": "signupForm" }
- For "dashboard" → category: "complex", parameters: { "template": "dashboard" }
- For "card layout" or "card" → category: "complex", parameters: { "template": "cardLayout" }
- For creation: include shapeType, color (hex - grayscale only), size (width/height/radius), text
- For creation with specific grid: "create a 3x3 grid of squares" → category: "creation", action: "create-multiple", parameters: { "shapeType": "rectangle", "gridRows": 3, "gridCols": 3 }
- For manipulation: include property and value or delta
- For manipulation on selected: "move selected to center" → category: "manipulation", parameters: { "moveTo": "center" } (requires selected shapes)
- For relative sizing: "twice as big" → parameters: { "sizeMultiplier": 2.0 }, "50% larger" → parameters: { "sizePercent": 150 }, "half the size" → parameters: { "sizeMultiplier": 0.5 }
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

        // Validate colors are grayscale only
        const colorValidation = validateGrayscaleColors(parsed);
        if (!colorValidation.isValid) {
          throw new HttpsError(
              "invalid-argument",
              "🖤 Be more goth! Only black, white, and shades of grey " +
              "are allowed on this canvas. Choose a grayscale color instead.",
          );
        }

        // If template selected, include template data
        if (parsed.category === "complex" &&
          parsed.parameters &&
          parsed.parameters.template) {
          const templateName = parsed.parameters.template;

          // Handle parameterized navigation bar
          if (templateName === "navigationBar" &&
              parsed.parameters.itemCount) {
            const itemCount = Math.min(
                Math.max(1, parsed.parameters.itemCount), 10);
            parsed.parameters.templateData = generateNavigationBar(itemCount);
            // console.log(
            //     `✅ Using template: ${templateName} ` +
            //     `with ${itemCount} items`);
          } else if (TEMPLATES[templateName]) {
            parsed.parameters.templateData = TEMPLATES[templateName];
            // console.log(`✅ Using template: ${templateName}`);
          } else {
            console.warn(`⚠️ Template not found: ${templateName}`);
          }
        }

        // console.log(
        //     `✅ Parsed command: ${parsed.category} - ${parsed.action}`,
        // );

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

