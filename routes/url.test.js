const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const shortid = require('shortid');
const validUrl = require('valid-url');
const { requireAuth } = require('../middleware/auth');
const urlRouter = require('./url');

// Mock dependencies
jest.mock('../models/Url');
jest.mock('shortid');
jest.mock('valid-url');
jest.mock('../middleware/auth');
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    }
  }
}));

describe('URL Routes', () => {
  let app;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup express app
    app = express();
    app.use(express.json());
    
    // Mock requireAuth middleware
    requireAuth.mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });
    
    // Use the URL router
    app.use('/api/url', urlRouter);
  });

  describe('POST /api/url/shorten', () => {
    const mockUrlData = {
      urlCode: 'test123',
      longUrl: 'https://example.com/',
      shortUrl: 'http://localhost:3000/test123',
      userId: 'test-user-id',
      clicks: 0
    };
    let mockUrlInstance;

    beforeEach(() => {
      // Mock valid-url
      validUrl.isUri.mockReturnValue(true);
      // Mock shortid
      shortid.generate.mockReturnValue('test123');
      // Mock Url instance
      mockUrlInstance = { ...mockUrlData, save: jest.fn().mockResolvedValue(mockUrlData) };
      const Url = require('../models/Url');
      Url.mockImplementation(() => mockUrlInstance);
    });

    it('should create a new short URL', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(null);
      mockUrlInstance.save.mockResolvedValue(mockUrlData);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({ longUrl: 'https://example.com' });

      expect(response.status).toBe(200);
      // Only check serializable properties
      expect(response.body).toMatchObject(mockUrlData);
      expect(Url.findOne).toHaveBeenCalledWith({
        longUrl: 'https://example.com/',
        userId: 'test-user-id'
      });
    });

    it('should return existing URL if already shortened by user', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(mockUrlData);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({ longUrl: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(mockUrlData);
      expect(mockUrlInstance.save).not.toHaveBeenCalled();
    });

    it('should handle custom URL codes', async () => {
      const Url = require('../models/Url');
      const customUrlData = { ...mockUrlData, urlCode: 'custom123', shortUrl: 'http://localhost:3000/custom123' };
      mockUrlInstance = { ...customUrlData, save: jest.fn().mockResolvedValue(customUrlData) };
      Url.mockImplementation(() => mockUrlInstance);
      Url.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // for longUrl and customCode

      const response = await request(app)
        .post('/api/url/shorten')
        .send({
          longUrl: 'https://example.com',
          customCode: 'custom123'
        });

      expect(response.status).toBe(200);
      expect(response.body.urlCode).toBe('custom123');
    });

    it('should reject invalid URLs', async () => {
      validUrl.isUri.mockReturnValue(false);

      const response = await request(app)
        .post('/api/url/shorten')
        .send({ longUrl: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid URL format');
    });

    it('should reject URLs that are too long', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2049);
      
      const response = await request(app)
        .post('/api/url/shorten')
        .send({ longUrl });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL cannot exceed 2048 characters');
    });
  });

  describe('GET /api/url/my-urls', () => {
    const mockUrls = [
      {
        urlCode: 'test1',
        longUrl: 'https://example1.com',
        shortUrl: 'http://localhost:3000/test1',
        clicks: 5
      },
      {
        urlCode: 'test2',
        longUrl: 'https://example2.com',
        shortUrl: 'http://localhost:3000/test2',
        clicks: 3
      }
    ];

    it('should return paginated URLs for the user', async () => {
      const Url = require('../models/Url');
      Url.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockUrls)
      });
      Url.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/url/my-urls')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        urls: mockUrls,
        pagination: {
          total: 2,
          page: 1,
          pages: 1,
          hasMore: false
        }
      });
    });
  });

  describe('GET /api/url/:code', () => {
    const mockUrl = {
      urlCode: 'test123',
      longUrl: 'https://example.com',
      incrementClicks: jest.fn().mockResolvedValue(true)
    };

    it('should redirect to long URL', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(mockUrl);

      const response = await request(app)
        .get('/api/url/test123')
        .redirects(0);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('https://example.com');
      expect(mockUrl.incrementClicks).toHaveBeenCalled();
    });

    it('should return 404 for non-existent URL', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/url/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('URL not found');
    });
  });

  describe('DELETE /api/url/:code', () => {
    const mockUrl = {
      urlCode: 'test123',
      userId: 'test-user-id',
      deleteOne: jest.fn().mockResolvedValue(true)
    };

    it('should delete URL if owned by user', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(mockUrl);

      const response = await request(app)
        .delete('/api/url/test123');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('URL deleted successfully');
      expect(mockUrl.deleteOne).toHaveBeenCalled();
    });

    it('should return 404 for non-existent URL', async () => {
      const Url = require('../models/Url');
      Url.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/url/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('URL not found or unauthorized');
    });
  });
});