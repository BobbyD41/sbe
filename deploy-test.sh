#!/bin/bash

echo "🚀 Stars to Stats Deployment Test"
echo "=================================="

# Get Railway URL from user
read -p "Enter your Railway backend URL (e.g., https://your-project.up.railway.app): " RAILWAY_URL
read -p "Enter your Vercel frontend URL (e.g., https://your-project.vercel.app): " VERCEL_URL

echo ""
echo "Testing Backend API..."
echo "======================"

# Test backend health
echo "1. Testing backend health..."
curl -s "$RAILWAY_URL/" | jq '.' 2>/dev/null || curl -s "$RAILWAY_URL/"

echo ""
echo "2. Testing API endpoints..."
curl -s "$RAILWAY_URL/api/leaderboard/rerank/2002" | jq '.' 2>/dev/null || curl -s "$RAILWAY_URL/api/leaderboard/rerank/2002"

echo ""
echo "3. Testing CFBD API status..."
curl -s "$RAILWAY_URL/api/import/cfbd/status" | jq '.' 2>/dev/null || curl -s "$RAILWAY_URL/api/import/cfbd/status"

echo ""
echo "Testing Frontend..."
echo "=================="

echo "4. Testing frontend accessibility..."
curl -s -I "$VERCEL_URL" | head -1

echo ""
echo "5. Testing frontend API proxy..."
curl -s "$VERCEL_URL/api/leaderboard/rerank/2002" | jq '.' 2>/dev/null || curl -s "$VERCEL_URL/api/leaderboard/rerank/2002"

echo ""
echo "✅ Deployment Test Complete!"
echo ""
echo "Your URLs:"
echo "Backend: $RAILWAY_URL"
echo "Frontend: $VERCEL_URL"
echo ""
echo "Next steps:"
echo "1. Open $VERCEL_URL in your browser"
echo "2. Test the leaderboard functionality"
echo "3. Test clicking on team names to view rerank data"
echo "4. Import some data using the CFBD API if needed"
