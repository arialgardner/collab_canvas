# AI Commands Setup Guide

This guide covers setting up and testing the OpenAI-powered AI command system.

## Prerequisites

1. **OpenAI API Key**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Node.js**: Version 18 or higher
3. **npm**: Comes with Node.js

## Environment Setup

### 1. Create `.env.local` file

Create a file named `.env.local` in the `ui/` directory with your OpenAI API key:

```bash
# Firebase Configuration (existing)
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# OpenAI Configuration (NEW - required for AI commands)
VITE_OPENAI_API_KEY=sk-proj-...your-key-here...

# Optional: AI Configuration (defaults shown)
VITE_AI_MODEL=gpt-3.5-turbo
VITE_AI_TEMPERATURE=0.1
VITE_AI_MAX_TOKENS=500
VITE_AI_TIMEOUT=5000
```

### 2. Install Dependencies

```bash
cd ui
npm install
```

This will install the OpenAI SDK (`openai@^4.20.0`) along with other dependencies.

## Testing the Integration

### Quick Test in Browser Console

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the browser console and test the AI service:
   ```javascript
   // Import the AI service
   import aiService from './src/services/aiService.js'
   
   // Test simple command
   const context = {
     viewportCenter: { x: 1500, y: 1500 },
     selectedShapeIds: [],
     lastCreatedShape: null,
     totalShapes: 0
   }
   
   // Parse a command
   const result = await aiService.parseNaturalLanguageCommand('draw a circle', context)
   // console.log('Result:', result)
   ```

### Manual Test Commands

Try these commands in the AI panel once it's integrated:

**Creation Commands:**
- `draw a circle`
- `create a blue rectangle at 500,300`
- `add text saying Hello World`
- `make 5 circles in a row`

**Expected Response Format:**
```json
{
  "intent": "CREATE_SHAPE",
  "parameters": {
    "shapeType": "circle",
    "position": null,
    "fill": "blue"
  },
  "confidence": 0.95,
  "reasoning": "User wants to create a single circle shape"
}
```

## Troubleshooting

### Error: "AI service not configured"
- Check that `VITE_OPENAI_API_KEY` is set in `.env.local`
- Restart the dev server after adding environment variables
- Verify the API key is valid (starts with `sk-`)

### Error: "Rate limit exceeded"
- You've hit OpenAI's rate limits
- Wait a few minutes and try again
- Check your OpenAI account usage at [platform.openai.com](https://platform.openai.com/usage)

### Error: "Request timed out"
- Network may be slow or OpenAI API is experiencing issues
- Default timeout is 5 seconds, can be increased in `.env.local`:
  ```
  VITE_AI_TIMEOUT=10000
  ```

### Error: "Could not understand that command"
- The AI couldn't parse the command with >70% confidence
- Try being more specific:
  - Instead of "make one": "create a circle"
  - Instead of "move that": "move the selected shape to 500,300"

## Cost Estimates

Using `gpt-3.5-turbo` (default):
- **Input**: $0.50 / 1M tokens
- **Output**: $1.50 / 1M tokens
- **Average cost per command**: ~$0.0005 (5/100th of a cent)
- **100 commands**: ~$0.05
- **1000 commands**: ~$0.50

### Monitoring Usage

1. Visit [OpenAI Platform - Usage](https://platform.openai.com/usage)
2. Set up usage limits in [OpenAI Platform - Limits](https://platform.openai.com/account/limits)
3. Consider setting up billing alerts

## Configuration Options

All configuration is done via environment variables in `.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_OPENAI_API_KEY` | (required) | Your OpenAI API key |
| `VITE_AI_MODEL` | `gpt-3.5-turbo` | OpenAI model to use |
| `VITE_AI_TEMPERATURE` | `0.1` | Response creativity (0-2, lower = more consistent) |
| `VITE_AI_MAX_TOKENS` | `500` | Maximum tokens in response |
| `VITE_AI_TIMEOUT` | `5000` | Request timeout in milliseconds |
| `VITE_AI_RATE_LIMIT` | `10` | Commands per minute per user (future) |

## Next Steps

Once the integration is verified:

1. **PR #2**: Build the AI Command Panel UI component
2. **PR #3**: Implement command execution logic
3. **PR #4-8**: Implement specific command types
4. **PR #9-14**: Testing, documentation, and polish

## Security Notes

⚠️ **Important Security Considerations:**

1. **Client-Side API Key**: The OpenAI API key is exposed in the browser. This is acceptable for MVP but consider moving to a backend proxy in production.

2. **Rate Limiting**: Implement per-user rate limiting to prevent abuse (10 commands/minute recommended).

3. **Data Privacy**: Only canvas context is sent to OpenAI, no user emails or sensitive data.

4. **Cost Control**: Set up billing alerts and usage limits in your OpenAI account.

## Support

For issues or questions:
1. Check the [OpenAI API Documentation](https://platform.openai.com/docs)
2. Review error messages in the browser console
3. Check the `aiService.js` error handling code
4. Verify your OpenAI account status and billing

## Verification Checklist

- [ ] OpenAI SDK installed (`npm install` completed)
- [ ] `.env.local` created with `VITE_OPENAI_API_KEY`
- [ ] Dev server started successfully
- [ ] No console errors about missing API key
- [ ] Test command "draw a circle" returns valid JSON response
- [ ] Response includes `intent`, `parameters`, `confidence` fields
- [ ] Confidence score is > 0.7 for valid commands
- [ ] Invalid commands are properly rejected

---

**PR #1 Status**: ✅ OpenAI Integration Foundation Complete

Next: PR #2 - Build AI Command Panel UI Component

