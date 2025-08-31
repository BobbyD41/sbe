#!/bin/bash

echo "📊 Stars to Stats - Sample Data Import"
echo "======================================"

# Get Railway URL from user
read -p "Enter your Railway backend URL (e.g., https://your-project.up.railway.app): " RAILWAY_URL

echo ""
echo "Importing sample data..."
echo "======================="

# List of teams to import (2002 recruiting classes)
TEAMS=(
    "Oklahoma State"
    "Wisconsin"
    "Alabama"
    "Georgia"
    "Texas"
    "Michigan"
    "Ohio State"
    "Florida"
    "LSU"
    "Auburn"
)

YEAR=2002

for team in "${TEAMS[@]}"; do
    echo "Importing $team $YEAR..."
    
    # URL encode the team name
    ENCODED_TEAM=$(echo "$team" | sed 's/ /%20/g')
    
    # Import the class
    RESPONSE=$(curl -s -X POST "$RAILWAY_URL/api/import/cfbd/class?year=$YEAR&team=$ENCODED_TEAM")
    
    if [[ "$RESPONSE" == *"\"ok\":true"* ]]; then
        echo "✅ Successfully imported $team"
    else
        echo "❌ Failed to import $team: $RESPONSE"
    fi
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo "1. Check your leaderboard at your frontend URL"
echo "2. Teams should now be sorted by total points"
echo "3. Click on team names to view detailed rerank data"
echo "4. Test the rerank functionality"

echo ""
echo "🔍 Verify the import:"
echo "===================="
echo "curl -s \"$RAILWAY_URL/api/leaderboard/rerank/$YEAR\" | jq '.count'"
echo "This should show the number of teams imported"
