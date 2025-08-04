# API Key Management System

This document describes the improved API key management system that fixes permission errors and allows multiple users to use their own API keys.

## Overview

The new system provides:
- **Dynamic API Key Support**: Users can provide their own API keys per request
- **Fallback Mechanisms**: Multiple environment variable names supported
- **Proper Error Handling**: Clear error messages for missing/invalid keys
- **User-Specific Keys**: Different users can use different API keys
- **Validation**: API keys are validated before use

## API Key Sources (Priority Order)

1. **Request Headers** (highest priority)
   - `x-api-key: YOUR_API_KEY`
   - `authorization: Bearer YOUR_API_KEY`
   - `gemini-api-key: YOUR_API_KEY`

2. **User-Specific Keys** 
   - Set via `/api/set-user-key` endpoint
   - Retrieved automatically based on user ID

3. **Environment Variables** (fallback)
   - `GEMINI_API_KEY`
   - `API`
   - `GOOGLE_AI_API_KEY`
   - `GOOGLE_GENERATIVE_AI_API_KEY`

## New Endpoints

### Bill Generator Service (Node.js)

#### Test API Key
```bash
POST /api/test-key
Content-Type: application/json

{
  "apiKey": "AIzaSy..."
}
```

#### Set User-Specific API Key
```bash
POST /api/set-user-key
Content-Type: application/json

{
  "userId": "user123",
  "apiKey": "AIzaSy..."
}
```

#### Get API Key Status
```bash
GET /api/key-status
```

### Bill Assistant Service (Python)

#### Test API Key
```bash
POST /api/test-key
Content-Type: application/json

{
  "apiKey": "AIzaSy..."
}
```

#### Set User-Specific API Key
```bash
POST /api/set-user-key
Content-Type: application/json

{
  "userId": "user123",
  "apiKey": "AIzaSy..."
}
```

#### Get API Key Status
```bash
GET /api/key-status
```

## Usage Examples

### Using Your Own API Key in Headers

```bash
# Bill Generator
curl -X POST http://localhost:3000/process-bill \
  -H "x-api-key: YOUR_GEMINI_API_KEY" \
  -F "bill_image=@receipt.jpg"

# Bill Assistant
curl -X POST http://localhost:8000/chat \
  -H "x-api-key: YOUR_GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend?", "uid": "user123"}'
```

### Setting User-Specific API Keys

```bash
# Set API key for a user
curl -X POST http://localhost:3000/api/set-user-key \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "apiKey": "YOUR_GEMINI_API_KEY"}'

# Now this user's requests will automatically use their key
curl -X POST http://localhost:3000/process-bill \
  -H "x-user-id: user123" \
  -F "bill_image=@receipt.jpg"
```

### Testing API Keys

```bash
# Test if an API key works
curl -X POST http://localhost:3000/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "YOUR_GEMINI_API_KEY"}'
```

## Environment Setup

### Development
Create a `.env` file in each service directory:

```bash
# bill_generator/.env
GEMINI_API_KEY=your_api_key_here

# bill_assistant/.env  
GEMINI_API_KEY=your_api_key_here
FIREBASE_SERVICE_ACCOUNT=your_base64_encoded_service_account
```

### Production
Set environment variables in your deployment platform:

```bash
GEMINI_API_KEY=your_api_key_here
FIREBASE_SERVICE_ACCOUNT=your_base64_encoded_service_account
```

## Error Handling

The system provides clear error messages:

### Missing API Key
```json
{
  "error": "API key error",
  "message": "No API key available. Please configure API key.",
  "hint": "Please provide a valid API key via x-api-key header or configure environment variables"
}
```

### Invalid API Key
```json
{
  "success": false,
  "message": "API key is invalid or has insufficient permissions"
}
```

### Permission Denied
```json
{
  "error": "API key error", 
  "message": "API key test failed with status 403",
  "hint": "Check your API key permissions and quotas"
}
```

## Migration Guide

### For Existing Users
1. **No Changes Required**: Existing environment variables still work
2. **Optional**: Set user-specific keys for better isolation
3. **Recommended**: Test your API keys using the new endpoints

### For New Users
1. **Option 1**: Set environment variables (traditional)
2. **Option 2**: Use request headers (flexible)
3. **Option 3**: Set user-specific keys (recommended for multi-user)

## Security Considerations

1. **API Key Storage**: User-specific keys are stored in memory only
2. **Validation**: All API keys are validated before use
3. **Headers**: API keys in headers are not logged
4. **Rotation**: Users can update their keys anytime via the API

## Troubleshooting

### Common Issues

1. **"No API key available"**
   - Set environment variable or provide in headers
   - Check spelling of environment variable names

2. **"Invalid API key format"**
   - Ensure API key is 20-50 characters
   - Check for extra spaces or characters

3. **"API key test failed"**
   - Verify API key has necessary permissions
   - Check quota limits on Google AI Studio

### Debug Commands

```bash
# Check API key status
curl http://localhost:3000/api/key-status

# Test API key
curl -X POST http://localhost:3000/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "YOUR_KEY"}'
```

## Benefits

1. **No More Permission Errors**: Each user can use their own API key
2. **Better Error Messages**: Clear indication of what went wrong
3. **Flexible Configuration**: Multiple ways to provide API keys
4. **Backward Compatible**: Existing setups continue to work
5. **Production Ready**: Proper logging and monitoring