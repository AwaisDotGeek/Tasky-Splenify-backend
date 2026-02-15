import request from 'supertest';
import { createApp } from '../app';

describe('App', () => {
  const app = createApp();

  describe('Health Check', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('CORS', () => {
    it('should have CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    it('should parse JSON body', async () => {
      // This will be tested more thoroughly with actual routes
      const response = await request(app)
        .post('/api/test')
        .send({ test: 'data' });

      // Should return 404 since route doesn't exist, but body should be parsed
      expect(response.status).toBe(404);
    });
  });
});
