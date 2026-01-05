# AIAutomatiza - CRM Dashboard

Multi-tenant CRM and communication management dashboard built with React, TypeScript, and Supabase.

## Features

- **Multi-channel messaging**: WhatsApp, Instagram, webchat, email, and voice calls
- **Contact management**: CRM with custom fields and dynamic attributes
- **Campaign management**: Broadcast campaigns for WhatsApp and calls
- **Call analytics**: Voice call tracking and analytics
- **Multi-tenant architecture**: Complete data isolation per tenant
- **Real-time updates**: Live conversation and data synchronization

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn-ui (Radix UI + Tailwind CSS)
- **State Management**: TanStack React Query, React Context
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Styling**: Tailwind CSS 3

## Getting Started

### Prerequisites

- Node.js (recommended: install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```sh
npm install
```

3. Set up environment variables:
```sh
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous/public key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

4. Start the development server:
```sh
npm run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run type-check` - TypeScript type checking

## Deployment

**Test production build locally:**
```sh
npm run build
npm start
```

### Deployment Options

- **Vercel/Netlify**: Optimized for Vite/React SPAs (recommended)
- **Cloudflare Pages**: Fast global CDN for static sites
- **Railway**: Simple deployment with automatic builds

## Project Structure

```
src/
├── features/           # Feature-based modules
│   ├── conversations/  # Multi-channel messaging
│   ├── contacts/       # CRM contact management
│   ├── campaigns/      # Broadcast campaigns
│   ├── calls/          # Voice call tracking
│   └── admin/          # Tenant management
├── components/         # Shared UI components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Shared hooks
├── integrations/       # Third-party integrations
├── lib/                # Utilities and helpers
└── pages/              # Route components
```

## Documentation

For detailed development guidelines, architecture, and patterns, see [CLAUDE.md](./CLAUDE.md).

## License

Proprietary - AIAutomatiza
