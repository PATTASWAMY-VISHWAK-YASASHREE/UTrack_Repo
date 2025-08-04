/**
 * Shared API Configuration Utility
 * Handles API key management with fallbacks and validation
 */

const DEFAULT_API_KEYS = {
  GEMINI_API_KEY: 'GEMINI_API_KEY',
  API: 'API',
  GOOGLE_AI_API_KEY: 'GOOGLE_AI_API_KEY'
};

class APIKeyManager {
  constructor() {
    this.apiKeys = new Map();
    this.loadDefaultKeys();
  }

  /**
   * Load API keys from environment variables with multiple fallback names
   */
  loadDefaultKeys() {
    const possibleKeys = [
      'GEMINI_API_KEY',
      'API',
      'GOOGLE_AI_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY'
    ];

    let foundKey = null;
    for (const keyName of possibleKeys) {
      const value = process.env[keyName];
      if (value && value.trim()) {
        foundKey = value.trim();
        console.log(`✅ Found API key from environment: ${keyName}`);
        break;
      }
    }

    if (foundKey) {
      this.setDefaultKey(foundKey);
    } else {
      console.warn('⚠️  No API key found in environment variables');
      console.warn('   Please set one of:', possibleKeys.join(', '));
    }
  }

  /**
   * Set default API key for the application
   */
  setDefaultKey(apiKey) {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    this.apiKeys.set('default', apiKey);
  }

  /**
   * Set API key for a specific user
   */
  setUserKey(userId, apiKey) {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    this.apiKeys.set(`user_${userId}`, apiKey);
  }

  /**
   * Get API key for a specific user or fallback to default
   */
  getApiKey(userId = null) {
    if (userId) {
      const userKey = this.apiKeys.get(`user_${userId}`);
      if (userKey) {
        return userKey;
      }
    }

    const defaultKey = this.apiKeys.get('default');
    if (!defaultKey) {
      throw new Error('No API key available. Please configure API key.');
    }

    return defaultKey;
  }

  /**
   * Validate API key format (basic validation)
   */
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Basic validation for Google AI API keys
    // They typically start with 'AIza' and are 39 characters long
    const trimmed = apiKey.trim();
    return trimmed.length >= 20 && trimmed.length <= 50;
  }

  /**
   * Test API key by making a simple request
   */
  async testApiKey(apiKey) {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (response.status === 200) {
        return { valid: true, message: 'API key is valid' };
      } else if (response.status === 400) {
        return { valid: false, message: 'API key is invalid or has insufficient permissions' };
      } else {
        return { valid: false, message: `API key test failed with status ${response.status}` };
      }
    } catch (error) {
      return { valid: false, message: `API key test failed: ${error.message}` };
    }
  }

  /**
   * Clear all stored API keys
   */
  clearKeys() {
    this.apiKeys.clear();
  }

  /**
   * Get status of API key configuration
   */
  getStatus() {
    return {
      hasDefaultKey: this.apiKeys.has('default'),
      userKeysCount: Array.from(this.apiKeys.keys()).filter(key => key.startsWith('user_')).length,
      totalKeys: this.apiKeys.size
    };
  }
}

// Export singleton instance
const apiKeyManager = new APIKeyManager();

module.exports = {
  APIKeyManager,
  apiKeyManager,
  DEFAULT_API_KEYS
};