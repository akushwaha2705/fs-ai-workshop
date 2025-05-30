const mongoose = require('mongoose');
const shortid = require('shortid');
const validUrl = require('valid-url');

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

    if (event.httpMethod === 'POST') {
      const { longUrl, customCode } = JSON.parse(event.body);
      
      if (!validUrl.isUri(longUrl)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid URL' })
        };
      }

      // Check if URL already exists
      let url = await Url.findOne({ longUrl });
      if (url) {
        return {
          statusCode: 200,
          body: JSON.stringify(url)
        };
      }

      const urlCode = customCode || shortid.generate();

      // Check if custom code exists
      if (customCode) {
        const existingUrl = await Url.findOne({ urlCode: customCode });
        if (existingUrl) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Custom code already in use' })
          };
        }
      }

      const shortUrl = `${process.env.URL}/${urlCode}`;

      url = new Url({
        urlCode,
        longUrl,
        shortUrl
      });

      await url.save();

      return {
        statusCode: 200,
        body: JSON.stringify(url)
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
}; 