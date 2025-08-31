#!/bin/bash

# Backend Deployment Script for Stars to Stats API
echo "🚀 Deploying Stars to Stats Backend API to Vercel..."

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Backend directory not found. Please run this from the project root."
    exit 1
fi

# Navigate to backend directory
cd backend

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

# Deploy to Vercel
echo "🚀 Deploying backend to Vercel..."
vercel --prod

echo "✅ Backend deployment complete!"
echo ""
echo "🔗 Your backend API should be available at: https://your-backend-project-name.vercel.app"
echo "📚 API docs: https://your-backend-project-name.vercel.app/docs"
echo ""
echo "📋 Don't forget to:"
echo "  1. Set environment variables in Vercel dashboard:"
echo "     - CFBD_API_KEY"
echo "     - SECRET_KEY"
echo "     - DATABASE_URL (use a cloud database like Supabase or Railway)"
echo "  2. Update your frontend's VITE_API_BASE to point to the new backend URL"