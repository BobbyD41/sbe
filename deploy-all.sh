#!/bin/bash

# Full Stack Deployment Script for Stars to Stats
echo "🚀 Deploying Stars to Stats Full Stack to Vercel..."

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Backend or frontend directory not found. Please run this from the project root."
    exit 1
fi

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

# Deploy Backend
echo "🚀 Deploying Backend API..."
cd backend
vercel --prod
BACKEND_URL=$(vercel ls | grep -o 'https://[^[:space:]]*' | head -1)
cd ..

echo "✅ Backend deployed to: $BACKEND_URL"

# Deploy Frontend
echo "🚀 Deploying Frontend..."
cd frontend
vercel --prod
FRONTEND_URL=$(vercel ls | grep -o 'https://[^[:space:]]*' | head -1)
cd ..

echo "✅ Frontend deployed to: $FRONTEND_URL"

echo ""
echo "🎉 Full stack deployment complete!"
echo ""
echo "🔗 URLs:"
echo "  Backend API: $BACKEND_URL"
echo "  Frontend App: $FRONTEND_URL"
echo "  API Docs: $BACKEND_URL/docs"
echo ""
echo "📋 Next Steps:"
echo "  1. Set backend environment variables in Vercel dashboard:"
echo "     - CFBD_API_KEY"
echo "     - SECRET_KEY"
echo "     - DATABASE_URL"
echo "  2. Set frontend environment variable:"
echo "     - VITE_API_BASE=$BACKEND_URL/api"
echo "  3. Test the full application"
echo ""
echo "🧪 Test Commands:"
echo "  curl $BACKEND_URL/"
echo "  curl $BACKEND_URL/api/outcomes"
echo "  curl $FRONTEND_URL"