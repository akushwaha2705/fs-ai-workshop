const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  urlCode: {
    type: String,
    required: [true, 'URL code is required'],
    unique: true,
    trim: true,
    minlength: [4, 'URL code must be at least 4 characters long'],
    maxlength: [20, 'URL code cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9-_]+$/, 'URL code can only contain letters, numbers, hyphens, and underscores']
  },
  longUrl: {
    type: String,
    required: [true, 'Long URL is required'],
    trim: true,
    maxlength: [2048, 'URL cannot exceed 2048 characters']
  },
  shortUrl: {
    type: String,
    required: [true, 'Short URL is required'],
    trim: true
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Click count cannot be negative']
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
});

// Compound index for faster lookups
urlSchema.index({ userId: 1, longUrl: 1 }, { unique: true });

// Update lastAccessed timestamp before saving
urlSchema.pre('save', function(next) {
  this.lastAccessed = new Date();
  next();
});

// Add method to increment clicks
urlSchema.methods.incrementClicks = async function() {
  this.clicks += 1;
  this.lastAccessed = new Date();
  return this.save();
};

module.exports = mongoose.model('Url', urlSchema); 