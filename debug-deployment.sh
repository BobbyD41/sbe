#!/bin/bash

echo "🔍 Stars to Stats Deployment Diagnostic"
echo "======================================="

# Get Railway URL from user
read -p "Enter your Railway backend URL (e.g., https://your-project.up.railway.app): " RAILWAY_URL

echo ""
echo "Testing Backend Health..."
echo "========================"

# Test basic connectivity
echo "1. Testing basic connectivity..."
if curl -s --connect-timeout 10 "$RAILWAY_URL/" > /dev/null; then
    echo "✅ Backend is reachable"
else
    echo "❌ Backend is not reachable"
    echo "   This could mean:"
    echo "   - Railway deployment failed"
    echo "   - Environment variables not set"
    echo "   - Application crashed"
    exit 1
fi

# Test API response
echo ""
echo "2. Testing API response..."
RESPONSE=$(curl -s --connect-timeout 10 "$RAILWAY_URL/")
echo "Response: $RESPONSE"

# Test leaderboard endpoint
echo ""
echo "3. Testing leaderboard endpoint..."
LEADERBOARD_RESPONSE=$(curl -s --connect-timeout 10 "$RAILWAY_URL/api/leaderboard/rerank/2002")
echo "Leaderboard response: $LEADERBOARD_RESPONSE"

# Test CFBD API status
echo ""
echo "4. Testing CFBD API status..."
CFBD_RESPONSE=$(curl -s --connect-timeout 10 "$RAILWAY_URL/api/import/cfbd/status")
echo "CFBD status: $CFBD_RESPONSE"

# Test specific team data
echo ""
echo "5. Testing specific team data..."
TEAM_RESPONSE=$(curl -s --connect-timeout 10 "$RAILWAY_URL/api/rerank/2002/Oklahoma%20State")
echo "Oklahoma State 2002: $TEAM_RESPONSE"

echo ""
echo "🔧 Troubleshooting Steps:"
echo "========================"

if [[ "$CFBD_RESPONSE" == *"\"ok\":false"* ]]; then
    echo "❌ CFBD API key issue detected"
    echo "   - Check Railway environment variables"
    echo "   - Verify CFBD_API_KEY is set correctly"
fi

if [[ "$LEADERBOARD_RESPONSE" == *"\"count\":0"* ]]; then
    echo "⚠️  No data found in leaderboard"
    echo "   - This is normal if no data has been imported yet"
    echo "   - Try importing some data first"
fi

if [[ "$TEAM_RESPONSE" == *"\"players\":[]"* ]] || [[ "$TEAM_RESPONSE" == *"404"* ]]; then
    echo "⚠️  No team data found"
    echo "   - Try importing data using CFBD API"
    echo "   - Example: curl -X POST \"$RAILWAY_URL/api/import/cfbd/class?year=2002&team=Oklahoma%20State\""
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Check Railway logs for errors"
echo "2. Verify environment variables are set"
echo "3. Import some sample data"
echo "4. Test the frontend connection"
