#!/bin/bash

# Frontend Deployment Script for Stars to Stats
echo "🚀 Deploying Stars to Stats Frontend to Vercel..."

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Frontend directory not found. Please run this from the project root."
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Deploy to Vercel
echo "🚀 Deploying frontend to Vercel..."
vercel --prod

echo "✅ Frontend deployment complete!"
echo ""
echo "🔗 Your frontend should be available at: https://your-frontend-project-name.vercel.app"
echo ""
echo "📋 Don't forget to:"
echo "  1. Set environment variable in Vercel dashboard:"
echo "     - VITE_API_BASE=https://your-backend-project-name.vercel.app/api"
echo "  2. Test the connection between frontend and backend"