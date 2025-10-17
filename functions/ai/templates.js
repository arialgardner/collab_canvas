/**
 * Predefined Templates for Complex AI Commands
 *
 * These templates define multi-shape layouts that the AI can create
 * with a single command like "create a login form".
 */

const TEMPLATES = {
  loginForm: {
    name: "loginForm",
    description: "Login form with username, password fields, and button",
    shapes: [
      {
        type: "text",
        text: "Username",
        offsetX: 0,
        offsetY: 0,
        fontSize: 14,
        fill: "#333333",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      {
        type: "rectangle",
        width: 200,
        height: 36,
        offsetX: 0,
        offsetY: 24,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Password",
        offsetX: 0,
        offsetY: 76,
        fontSize: 14,
        fill: "#333333",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      {
        type: "rectangle",
        width: 200,
        height: 36,
        offsetX: 0,
        offsetY: 100,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 1,
      },
      {
        type: "rectangle",
        width: 200,
        height: 40,
        offsetX: 0,
        offsetY: 152,
        fill: "#000000",
      },
      {
        type: "text",
        text: "Login",
        offsetX: 80,
        offsetY: 162,
        fontSize: 16,
        fill: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        align: "center",
      },
    ],
  },

  trafficLight: {
    name: "trafficLight",
    description: "Traffic light with three lights in different shades of grey",
    shapes: [
      {
        type: "rectangle",
        width: 80,
        height: 220,
        offsetX: 0,
        offsetY: 0,
        fill: "#555555",
      },
      {
        type: "circle",
        radius: 28,
        offsetX: 40,
        offsetY: 40,
        fill: "#3d3d3d",
      },
      {
        type: "circle",
        radius: 28,
        offsetX: 40,
        offsetY: 110,
        fill: "#7d7d7d",
      },
      {
        type: "circle",
        radius: 28,
        offsetX: 40,
        offsetY: 180,
        fill: "#c0c0c0",
      },
    ],
  },

  navigationBar: {
    name: "navigationBar",
    description: "Navigation bar with Home, About, Contact links",
    shapes: [
      {
        type: "rectangle",
        width: 800,
        height: 60,
        offsetX: 0,
        offsetY: 0,
        fill: "#222222",
      },
      {
        type: "text",
        text: "Home",
        offsetX: 20,
        offsetY: 22,
        fontSize: 16,
        fill: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      {
        type: "text",
        text: "About",
        offsetX: 380,
        offsetY: 22,
        fontSize: 16,
        fill: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      {
        type: "text",
        text: "Contact",
        offsetX: 720,
        offsetY: 22,
        fontSize: 16,
        fill: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
    ],
  },

  signupForm: {
    name: "signupForm",
    description: "Signup form with email, password, and confirm password",
    shapes: [
      {
        type: "text",
        text: "Email",
        offsetX: 0,
        offsetY: 0,
        fontSize: 14,
        fill: "#333333",
      },
      {
        type: "rectangle",
        width: 250,
        height: 36,
        offsetX: 0,
        offsetY: 24,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Password",
        offsetX: 0,
        offsetY: 76,
        fontSize: 14,
        fill: "#333333",
      },
      {
        type: "rectangle",
        width: 250,
        height: 36,
        offsetX: 0,
        offsetY: 100,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Confirm Password",
        offsetX: 0,
        offsetY: 152,
        fontSize: 14,
        fill: "#333333",
      },
      {
        type: "rectangle",
        width: 250,
        height: 36,
        offsetX: 0,
        offsetY: 176,
        fill: "#ffffff",
        stroke: "#cccccc",
        strokeWidth: 1,
      },
      {
        type: "rectangle",
        width: 250,
        height: 44,
        offsetX: 0,
        offsetY: 228,
        fill: "#000000",
      },
      {
        type: "text",
        text: "Sign Up",
        offsetX: 95,
        offsetY: 240,
        fontSize: 16,
        fill: "#ffffff",
        fontStyle: "bold",
      },
    ],
  },

  dashboard: {
    name: "dashboard",
    description: "Dashboard with title and stat cards",
    shapes: [
      {
        type: "text",
        text: "Dashboard",
        offsetX: 0,
        offsetY: 0,
        fontSize: 24,
        fill: "#1a1a1a",
        fontStyle: "bold",
      },
      {
        type: "rectangle",
        width: 180,
        height: 100,
        offsetX: 0,
        offsetY: 50,
        fill: "#ffffff",
        stroke: "#e0e0e0",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Users",
        offsetX: 60,
        offsetY: 70,
        fontSize: 14,
        fill: "#808080",
      },
      {
        type: "text",
        text: "1,234",
        offsetX: 50,
        offsetY: 100,
        fontSize: 28,
        fill: "#333333",
        fontStyle: "bold",
      },
      {
        type: "rectangle",
        width: 180,
        height: 100,
        offsetX: 200,
        offsetY: 50,
        fill: "#ffffff",
        stroke: "#e0e0e0",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Revenue",
        offsetX: 250,
        offsetY: 70,
        fontSize: 14,
        fill: "#808080",
      },
      {
        type: "text",
        text: "$12.5K",
        offsetX: 235,
        offsetY: 100,
        fontSize: 28,
        fill: "#333333",
        fontStyle: "bold",
      },
      {
        type: "rectangle",
        width: 180,
        height: 100,
        offsetX: 400,
        offsetY: 50,
        fill: "#ffffff",
        stroke: "#e0e0e0",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "Growth",
        offsetX: 455,
        offsetY: 70,
        fontSize: 14,
        fill: "#808080",
      },
      {
        type: "text",
        text: "+23%",
        offsetX: 455,
        offsetY: 100,
        fontSize: 28,
        fill: "#333333",
        fontStyle: "bold",
      },
    ],
  },

  cardLayout: {
    name: "cardLayout",
    description: "Card with title, image placeholder, and description",
    shapes: [
      // Card container
      {
        type: "rectangle",
        width: 300,
        height: 420,
        offsetX: 0,
        offsetY: 0,
        fill: "#ffffff",
        stroke: "#d0d0d0",
        strokeWidth: 1,
      },
      // Image placeholder
      {
        type: "rectangle",
        width: 300,
        height: 200,
        offsetX: 0,
        offsetY: 0,
        fill: "#f5f5f5",
        stroke: "#d0d0d0",
        strokeWidth: 1,
      },
      {
        type: "text",
        text: "IMAGE",
        offsetX: 125,
        offsetY: 90,
        fontSize: 14,
        fill: "#a0a0a0",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "center",
      },
      // Card title
      {
        type: "text",
        text: "Card Title",
        offsetX: 20,
        offsetY: 220,
        fontSize: 20,
        fill: "#1a1a1a",
        fontFamily: "Arial",
        fontStyle: "bold",
        align: "left",
      },
      // Description line 1
      {
        type: "text",
        text: "This is a card description that provides",
        offsetX: 20,
        offsetY: 260,
        fontSize: 14,
        fill: "#666666",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      // Description line 2
      {
        type: "text",
        text: "more details about the card content.",
        offsetX: 20,
        offsetY: 280,
        fontSize: 14,
        fill: "#666666",
        fontFamily: "Arial",
        fontStyle: "normal",
        align: "left",
      },
      // CTA Button
      {
        type: "rectangle",
        width: 260,
        height: 40,
        offsetX: 20,
        offsetY: 360,
        fill: "#000000",
      },
      {
        type: "text",
        text: "Learn More",
        offsetX: 115,
        offsetY: 372,
        fontSize: 14,
        fill: "#ffffff",
        fontFamily: "Arial",
        fontStyle: "bold",
        align: "center",
      },
    ],
  },
};

/**
 * Generate a dynamic navigation bar with specified number of items
 * @param {number} itemCount - Number of menu items (1-10)
 * @return {Object} Template object with shapes array
 */
const generateNavigationBar = (itemCount = 4) => {
  // Validate and cap item count at 10
  const validCount = Math.min(Math.max(1, itemCount), 10);

  const itemLabels = [
    "Home",
    "About",
    "Services",
    "Contact",
    "Blog",
    "Shop",
    "Team",
    "Portfolio",
    "Careers",
    "Support",
  ];

  const barWidth = 800;
  const itemSpacing = barWidth / (validCount + 1);

  const shapes = [
    {
      type: "rectangle",
      width: barWidth,
      height: 60,
      offsetX: 0,
      offsetY: 0,
      fill: "#222222",
    },
  ];

  for (let i = 0; i < validCount; i++) {
    shapes.push({
      type: "text",
      text: itemLabels[i] || `Item ${i + 1}`,
      offsetX: itemSpacing * (i + 1) - 25,
      offsetY: 22,
      fontSize: 16,
      fill: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "normal",
      align: "left",
    });
  }

  return {
    name: "navigationBar",
    description: `Navigation bar with ${validCount} menu items`,
    shapes,
  };
};

module.exports = {TEMPLATES, generateNavigationBar};
