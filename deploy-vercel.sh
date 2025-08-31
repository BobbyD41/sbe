#!/bin/bash

# Vercel Deployment Script for Stars to Stats API
echo "🚀 Deploying Stars to Stats API to Vercel..."

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

# Make sure all changes are committed
echo "📝 Checking git status..."
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    git status
    exit 1
fi

# Push to GitHub if needed
echo "📤 Pushing to GitHub..."
git push origin main

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔗 Your API should be available at: https://your-project-name.vercel.app"
echo "📚 API docs: https://your-project-name.vercel.app/docs"
echo ""
echo "🧪 Test your new recruit management endpoints:"
echo "  - GET /api/outcomes"
echo "  - GET /api/recruits/{year}/{team}/detailed"
echo "  - POST /api/recruits/add (requires auth)"
echo "  - PUT /api/recruits/{id} (requires auth)"
echo "  - DELETE /api/recruits/{id} (requires auth)"
echo ""
echo "📋 Don't forget to:"
echo "  1. Set environment variables in Vercel dashboard:"
echo "     - CFBD_API_KEY"
echo "     - SECRET_KEY"
echo "     - DATABASE_URL (use a cloud database like Supabase or Railway)"
echo "  2. Update your frontend's VITE_API_BASE to point to the new Vercel URL"