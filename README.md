# URL Shortener

A simple URL shortener application built with Node.js, Express, and MongoDB.

## Features

- Shorten long URLs
- Custom short URL slugs (optional)
- View click statistics
- Clean and responsive UI

## Prerequisites

- Node.js (v14 or higher)
- MongoDB

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd url-shortener
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

4. Start the server:
```bash
npm run dev
```

5. Visit `http://localhost:3000` in your browser

## API Endpoints

- `POST /api/url/shorten` - Create a short URL
- `GET /:code` - Redirect to original URL
- `GET /api/url/:code` - Get URL details

## License

MIT 