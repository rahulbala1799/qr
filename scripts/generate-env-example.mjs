#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const envExample = `# Database Configuration
# PostgreSQL connection string for Prisma
DATABASE_URL="postgresql://user:password@localhost:5432/qr_ordering"

# NextAuth.js Configuration
# Secret for JWT token encryption (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
# Base URL for NextAuth.js (change for production)
NEXTAUTH_URL="http://localhost:3000"

# Application Configuration
# Public site URL for QR code generation and redirects
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Error Monitoring (Sentry)
# Sentry DSN for error tracking (optional)
SENTRY_DSN=""
# Environment for Sentry (development, staging, production)
SENTRY_ENVIRONMENT="development"

# Node Environment
# Set to 'production' in production environment
NODE_ENV="development"
`;

try {
  writeFileSync('.env.example', envExample);
  console.log('✅ Generated .env.example file');
} catch (error) {
  console.error('❌ Failed to generate .env.example:', error.message);
  process.exit(1);
}
