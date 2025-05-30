const express = require('express');
const router = express.Router();
const validUrl = require('valid-url');
const shortid = require('shortid');
const Url = require('../models/Url');
const { requireAuth } = require('../middleware/auth');

// @route   POST /api/url/shorten
// @desc    Create short URL
router.post('/shorten', requireAuth, async (req, res) => {
  console.log('Received request:', req.body);
  const { longUrl, customCode } = req.body;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  // Check if URL is provided
  if (!longUrl) {
    console.log('No URL provided');
    return res.status(400).json({ error: 'URL is required' });
  }

  // Check long URL
  if (!validUrl.isUri(longUrl)) {
    console.log('Invalid URL:', longUrl);
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Check if URL already exists for this user
    let url = await Url.findOne({ longUrl, userId: req.user.id });
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
      longUrl,
      shortUrl,
      userId: req.user.id,
      createdAt: new Date()
    });

    await url.save();
    console.log('Saved new URL:', url);
    res.json(url);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// @route   GET /api/url/my-urls
// @desc    Get all URLs for the authenticated user
router.get('/my-urls', requireAuth, async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(urls);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/url/:code
// @desc    Get URL by code
router.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ urlCode: req.params.code });
    if (url) {
      return res.json(url);
    } else {
      return res.status(404).json({ error: 'URL not found' });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error' });
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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 