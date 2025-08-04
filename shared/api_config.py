"""
Shared API Configuration Utility for Python
Handles API key management with fallbacks and validation
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any
import httpx
from datetime import datetime


class APIKeyManager:
    """Manages API keys with user-specific overrides and validation"""
    
    def __init__(self):
        self.api_keys = {}
        self.http_client = None
        self.load_default_keys()
    
    def load_default_keys(self):
        """Load API keys from environment variables with multiple fallback names"""
        possible_keys = [
            'GEMINI_API_KEY',
            'API',
            'GOOGLE_AI_API_KEY',
            'GOOGLE_GENERATIVE_AI_API_KEY'
        ]
        
        found_key = None
        for key_name in possible_keys:
            value = os.getenv(key_name)
            if value and value.strip():
                found_key = value.strip()
                print(f"✅ Found API key from environment: {key_name}")
                break
        
        if found_key:
            self.set_default_key(found_key)
        else:
            print("⚠️  No API key found in environment variables")
            print(f"   Please set one of: {', '.join(possible_keys)}")
    
    def set_default_key(self, api_key: str):
        """Set default API key for the application"""
        if not self.validate_api_key(api_key):
            raise ValueError('Invalid API key format')
        self.api_keys['default'] = api_key
    
    def set_user_key(self, user_id: str, api_key: str):
        """Set API key for a specific user"""
        if not self.validate_api_key(api_key):
            raise ValueError('Invalid API key format')
        self.api_keys[f'user_{user_id}'] = api_key
    
    def get_api_key(self, user_id: Optional[str] = None) -> str:
        """Get API key for a specific user or fallback to default"""
        if user_id:
            user_key = self.api_keys.get(f'user_{user_id}')
            if user_key:
                return user_key
        
        default_key = self.api_keys.get('default')
        if not default_key:
            raise ValueError('No API key available. Please configure API key.')
        
        return default_key
    
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key format (basic validation)"""
        if not api_key or not isinstance(api_key, str):
            return False
        
        # Basic validation for Google AI API keys
        # They typically start with 'AIza' and are 39 characters long
        trimmed = api_key.strip()
        return 20 <= len(trimmed) <= 50
    
    async def test_api_key(self, api_key: str) -> Dict[str, Any]:
        """Test API key by making a simple request"""
        test_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        if not self.http_client:
            self.http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                limits=httpx.Limits(max_connections=10)
            )
        
        try:
            response = await self.http_client.post(
                test_url,
                json={
                    "contents": [{"parts": [{"text": "Hello"}]}],
                    "generationConfig": {"maxOutputTokens": 10}
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return {"valid": True, "message": "API key is valid"}
            elif response.status_code == 400:
                return {"valid": False, "message": "API key is invalid or has insufficient permissions"}
            else:
                return {"valid": False, "message": f"API key test failed with status {response.status_code}"}
                
        except Exception as error:
            return {"valid": False, "message": f"API key test failed: {str(error)}"}
    
    def clear_keys(self):
        """Clear all stored API keys"""
        self.api_keys.clear()
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of API key configuration"""
        user_keys = [key for key in self.api_keys.keys() if key.startswith('user_')]
        return {
            "has_default_key": 'default' in self.api_keys,
            "user_keys_count": len(user_keys),
            "total_keys": len(self.api_keys),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def close(self):
        """Close HTTP client"""
        if self.http_client:
            await self.http_client.aclose()


# Global singleton instance
api_key_manager = APIKeyManager()


class APIKeyMiddleware:
    """Middleware to handle API key extraction from requests"""
    
    @staticmethod
    def extract_api_key_from_headers(headers: Dict[str, str]) -> Optional[str]:
        """Extract API key from request headers"""
        # Check common header names
        api_key_headers = [
            'x-api-key',
            'authorization',
            'gemini-api-key',
            'google-api-key'
        ]
        
        for header_name in api_key_headers:
            value = headers.get(header_name.lower())
            if value:
                # Handle Bearer token format
                if value.lower().startswith('bearer '):
                    return value[7:].strip()
                return value.strip()
        
        return None
    
    @staticmethod
    def extract_user_id_from_headers(headers: Dict[str, str]) -> Optional[str]:
        """Extract user ID from request headers"""
        user_id_headers = [
            'x-user-id',
            'user-id',
            'uid'
        ]
        
        for header_name in user_id_headers:
            value = headers.get(header_name.lower())
            if value:
                return value.strip()
        
        return None


def get_api_key_for_request(headers: Dict[str, str], user_id: Optional[str] = None) -> str:
    """Get appropriate API key for a request"""
    # First try to get API key from headers
    header_api_key = APIKeyMiddleware.extract_api_key_from_headers(headers)
    if header_api_key and api_key_manager.validate_api_key(header_api_key):
        return header_api_key
    
    # If no valid header API key, try user-specific key
    if not user_id:
        user_id = APIKeyMiddleware.extract_user_id_from_headers(headers)
    
    # Fall back to managed API keys
    return api_key_manager.get_api_key(user_id)


# Backwards compatibility exports
DEFAULT_API_KEYS = {
    'GEMINI_API_KEY': 'GEMINI_API_KEY',
    'API': 'API',
    'GOOGLE_AI_API_KEY': 'GOOGLE_AI_API_KEY'
}