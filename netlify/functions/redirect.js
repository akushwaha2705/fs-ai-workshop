const mongoose = require('mongoose');

// MongoDB connection
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const connection = await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  cachedDb = connection;
  return connection;
}

// URL Schema
const urlSchema = new mongoose.Schema({
  urlCode: String,
  longUrl: String,
  shortUrl: String,
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Url = mongoose.models.Url || mongoose.model('Url', urlSchema);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectToDatabase();

    const { code } = event.queryStringParameters;

    const url = await Url.findOne({ urlCode: code });
    if (url) {
      url.clicks++;
      await url.save();

      return {
        statusCode: 302,
        headers: {
          Location: url.longUrl
        }
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'URL not found' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}; 