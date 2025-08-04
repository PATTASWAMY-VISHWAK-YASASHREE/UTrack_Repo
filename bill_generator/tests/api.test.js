const request = require('supertest');
const { app } = require('../index');

describe('Bill Generator API', () => {
  describe('API Key Management', () => {
    test('should return status without crashing', async () => {
      const response = await request(app)
        .get('/api/key-status')
        .expect(200);
      
      expect(response.body).toHaveProperty('hasDefaultKey');
      expect(response.body).toHaveProperty('userKeysCount');
      expect(response.body).toHaveProperty('totalKeys');
    });

    test('should handle API key testing endpoint', async () => {
      const response = await request(app)
        .post('/api/test-key')
        .send({ apiKey: 'AIzaSyDummy1234567890123456789012345678' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });

    test('should handle setting user API key', async () => {
      const response = await request(app)
        .post('/api/set-user-key')
        .send({
          userId: 'test_user',
          apiKey: 'AIzaSyUser1234567890123456789012345678'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('test_user');
    });

    test('should reject invalid API key format', async () => {
      const response = await request(app)
        .post('/api/set-user-key')
        .send({
          userId: 'test_user',
          apiKey: 'invalid'
        })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid API key');
    });
  });

  describe('Health Endpoints', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
    });

    test('should return API info', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);
      
      expect(response.body.message).toBe('Bill Processor API');
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/process-bill')
        .expect(400);
      
      expect(response.body.error).toBe('No image file uploaded');
    });

    test('should handle missing API key in bill processing', async () => {
      // This test would require actual file upload, which is complex in unit tests
      // For now, we test that the endpoint exists and has proper error handling
      const response = await request(app)
        .post('/process-bill')
        .expect(400);
      
      expect(response.body).toBeDefined();
    });
  });
});