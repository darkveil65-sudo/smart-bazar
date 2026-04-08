# Smart Bazar 🛒

A production-ready grocery delivery web application built with Next.js, Tailwind CSS, and Firebase.

## Features

- **Multi-Role System**: Admin, Co-Admin, Manager, Store, Delivery Boy, Customer
- **6 Categories**: Mudikhana, Household, Vegetables, Fruits, Beauty, Fashion
- **Real-time Order Tracking**
- **Fast Delivery**: 30-minute delivery target
- **Free Delivery**: On orders above ₹199

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase Account

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/smart-bazar.git
cd smart-bazar

# Install dependencies
npm install

# Set up Firebase
# Create .env.local with your Firebase credentials
cp .env.example .env.local

# Run development server
npm run dev
```

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## License

MIT
