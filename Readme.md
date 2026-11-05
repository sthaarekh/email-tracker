
# Email Tracker

A self-hosted email tracking system that integrates with Gmail through a Chrome extension.

## Features

- Track email open events.
- Integrate tracking into Gmail.
- View tracking activity through a dashboard.
- Store tracking events in MongoDB.
- Self-hosted backend and tracking API.

## Tech Stack

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose

**Browser Extension**
- Chrome Extension Manifest V3
- JavaScript
- Gmail DOM integration

## Project Structure

```text
email-tracker/
├── backend/
├── extension/
├── docs/
└── .github/
```

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Chrome Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Select the `extension` directory.

## Development

Backend and extension are maintained as independent npm packages.

## License

MIT
