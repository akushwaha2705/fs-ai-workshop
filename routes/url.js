const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const shortid = require('shortid');
const Url = require('../models/Url');
const { requireAuth } = require('../middleware/auth');

// Constants
const CUSTOM_CODE_MIN_LENGTH = 4;
const CUSTOM_CODE_MAX_LENGTH = 20;
const CUSTOM_CODE_REGEX = /^[a-zA-Z0-9-_]+$/;
const MAX_URL_LENGTH = 2048;

// Helper function to validate custom code
const isValidCustomCode = (code) => {
  if (!code) return false;
  if (code.length < CUSTOM_CODE_MIN_LENGTH || code.length > CUSTOM_CODE_MAX_LENGTH) return false;
  return CUSTOM_CODE_REGEX.test(code);
};

// Helper function to get base URL
const getBaseUrl = (req) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
};

// Helper function to sanitize URL
const sanitizeUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch (err) {
    return url;
  }
};

// @route   POST /api/url/shorten
// @desc    Create short URL
router.post('/shorten', requireAuth, async (req, res) => {
  console.log('Received request:', req.body);
  const { longUrl, customCode } = req.body;
  const baseUrl = getBaseUrl(req);

  // Check if URL is provided
  if (!longUrl) {
    console.log('No URL provided');
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check URL length
  if (longUrl.length > MAX_URL_LENGTH) {
    console.log('URL too long:', longUrl.length);
    return res.status(400).json({ error: `URL cannot exceed ${MAX_URL_LENGTH} characters` });
  }

  // Sanitize and validate URL
  const sanitizedUrl = sanitizeUrl(longUrl);
  if (!validUrl.isUri(sanitizedUrl)) {
    console.log('Invalid URL:', sanitizedUrl);
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Validate custom code if provided
  if (customCode && !isValidCustomCode(customCode)) {
    console.log('Invalid custom code:', customCode);
    return res.status(400).json({ 
      error: `Custom code must be between ${CUSTOM_CODE_MIN_LENGTH} and ${CUSTOM_CODE_MAX_LENGTH} characters and contain only letters, numbers, hyphens, and underscores` 
    });
  }

  try {
    // Check if URL already exists for this user
    let url = await Url.findOne({ longUrl: sanitizedUrl, userId: req.user.id });
    if (url) {
      console.log('URL already exists:', url);
      return res.json(url);
    }

    // Create URL code
    const urlCode = customCode || shortid.generate();

    // Check if custom code already exists
    if (customCode) {
      const existingUrl = await Url.findOne({ urlCode: customCode });
      if (existingUrl) {
        console.log('Custom code already exists:', customCode);
        return res.status(400).json({ error: 'Custom code already in use' });
      }
    }

    const shortUrl = `${baseUrl}/${urlCode}`;
    console.log('Generated short URL:', shortUrl);

    url = new Url({
      urlCode,
      longUrl: sanitizedUrl,
      shortUrl,
      userId: req.user.id,
      createdAt: new Date(),
      lastAccessed: new Date()
    });

    await url.save();
    console.log('Saved new URL:', url);
    res.json(url);
  } catch (err) {
    console.error('Server error:', err);
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ error: 'This URL has already been shortened by you' });
    }
    res.status(500).json({ 
      error: 'Server error', 
      details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

// @route   GET /api/url/my-urls
// @desc    Get all URLs for the authenticated user
router.get('/my-urls', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      Url.find({ userId: req.user.id })
        .sort({ lastAccessed: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Url.countDocuments({ userId: req.user.id })
    ]);

    res.json({
      urls,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        hasMore: skip + urls.length < total
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

// @route   GET /api/url/:code
// @desc    Redirect to long URL
router.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });
    if (url) {
      await url.incrementClicks();
      return res.redirect(url.longUrl);
    } else {
      return res.status(404).json({ error: 'URL not found' });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

// @route   DELETE /api/url/:code
// @desc    Delete URL by code
router.delete('/:code', requireAuth, async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code, userId: req.user.id });
    if (!url) {
      return res.status(404).json({ error: 'URL not found or unauthorized' });
    }

    await url.deleteOne();
    res.json({ message: 'URL deleted successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
  }
});

module.exports = router; 