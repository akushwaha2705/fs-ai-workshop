const express = require('express');
const request = require('supertest');
const shortid = require('shortid');
const validUrl = require('valid-url');
const Url = require('../models/Url');
const { requireAuth } = require('../middleware/auth');

// Mock dependencies
jest.mock('../models/Url');
jest.mock('shortid');
jest.mock('valid-url');
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123' }; // set mock user
    next();
  }
}));

describe('URL Routes', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    const urlRouter = require('./url');
    app.use('/api/url', urlRouter);
  });

  describe('POST /api/url/shorten', () => {
    it('should create a new short URL when provided with a valid long URL', async () => {
      // Mock dependencies
      const urlObj = {
        urlCode: 'abc123',
        longUrl: 'https://example.com',
        shortUrl: 'http://localhost:3000/abc123',
        userId: 'user123',
        createdAt: new Date().toISOString()
      };
      const mockUrl = {
        save: jest.fn().mockResolvedValue(urlObj),
        ...urlObj
      };

      Url.findOne = jest.fn().mockResolvedValue(null);
      Url.mockImplementation(() => mockUrl);
      shortid.generate = jest.fn().mockReturnValue('abc123');
      validUrl.isUri = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({
          longUrl: 'https://example.com'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(validUrl.isUri).toHaveBeenCalledWith('https://example.com');
      expect(Url.findOne).toHaveBeenCalledWith({ 
        longUrl: 'https://example.com', 
        userId: 'user123' 
      });
      expect(shortid.generate).toHaveBeenCalled();
      expect(mockUrl.save).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        urlCode: 'abc123',
        longUrl: 'https://example.com',
        shortUrl: 'http://localhost:3000/abc123',
        userId: 'user123'
      });
      expect(typeof response.body.createdAt).toBe('string');
    });

    it('should return existing URL if it was already shortened by the user', async () => {
      const existingUrl = {
        urlCode: 'abc123',
        longUrl: 'https://example.com',
        shortUrl: 'http://localhost:3000/abc123',
        userId: 'user123',
        createdAt: new Date().toISOString()
      };

      Url.findOne = jest.fn().mockResolvedValue(existingUrl);
      validUrl.isUri = jest.fn().mockReturnValue(true);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({
          longUrl: 'https://example.com'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(validUrl.isUri).toHaveBeenCalledWith('https://example.com');
      expect(Url.findOne).toHaveBeenCalledWith({ 
        longUrl: 'https://example.com', 
        userId: 'user123' 
      });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        urlCode: 'abc123',
        longUrl: 'https://example.com',
        shortUrl: 'http://localhost:3000/abc123',
        userId: 'user123'
      });
      expect(typeof response.body.createdAt).toBe('string');
    });

    it('should return error for invalid URL format', async () => {
      validUrl.isUri = jest.fn().mockReturnValue(false);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({
          longUrl: 'invalid-url'
        })
        .set('Authorization', 'Bearer mock-token');

      expect(validUrl.isUri).toHaveBeenCalledWith('invalid-url');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid URL format');
    });

    it('should return error when URL is not provided', async () => {
      const response = await request(app)
        .post('/api/url/shorten')
        .send({})
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'URL is required');
    });
  });
});