# Add Recruit Feature

## Overview
This feature allows logged-in users to add additional recruits to existing recruiting classes that were not originally pulled by the API. When a new recruit is added, both the Original Class and ReRank are automatically updated.

## Backend Changes

### New API Endpoint
- **POST** `/api/recruits/add`
- **Authentication**: Required (Bearer token)
- **Payload**:
  ```json
  {
    "year": 2002,
    "team": "Oklahoma State",
    "name": "John Doe",
    "position": "QB",
    "stars": 4,
    "rank": 150,
    "outcome": "College Starter",
    "note": "Transfer from another school",
    "source": "manual"
  }
  ```

### Features
1. **Authentication Required**: Only logged-in users can add recruits
2. **Duplicate Prevention**: Checks for existing recruits with the same name/year/team
3. **Automatic Points Calculation**: If an outcome is provided, points are automatically calculated
4. **Class Meta Update**: Updates the Original Class statistics (commits, avg_stars, avg_rating)
5. **ReRank Recalculation**: Automatically recalculates the ReRank after adding a recruit

## Frontend Changes

### New UI Components
1. **Add Recruit Button**: Toggle to show/hide the add recruit form
2. **Recruit Form**: Input fields for all recruit properties
3. **Form Validation**: Ensures required fields are filled
4. **Real-time Updates**: Automatically refreshes class data after adding a recruit

### Form Fields
- **Name** (required): Recruit's full name
- **Position**: Playing position
- **Stars**: Rating from 0-5
- **Rank**: Recruiting rank
- **Outcome** (optional): Career outcome (affects points)
- **Note** (optional): Additional notes

### User Experience
1. User clicks "Add New Recruit" button
2. Form appears with all input fields
3. User fills in recruit information
4. User clicks "Add Recruit" to save
5. System automatically:
   - Saves the recruit to database
   - Updates Original Class statistics
   - Recalculates ReRank
   - Refreshes the display
6. Success message is shown
7. Form is reset and hidden

## Database Updates

### Recruit Table
- New recruits are added with `source: "manual"`
- All standard recruit fields are populated
- Points are calculated based on outcome if provided

### ClassMeta Table
- `commits` count is updated
- `avg_stars` is recalculated
- `avg_rating` is recalculated (if rating data exists)

### RerankClass Table
- New rerank class is created with updated statistics
- Previous rerank classes for the same year/team are deleted

## Security
- Authentication is required for all add operations
- Input validation prevents invalid data
- Duplicate prevention ensures data integrity

## Error Handling
- Clear error messages for validation failures
- Graceful handling of missing authentication
- Safe parsing of rating data from notes

## Usage Example
1. Navigate to the ReRank page
2. Load an existing class (e.g., 2002 Oklahoma State)
3. Click "Add New Recruit" button
4. Fill in recruit information:
   - Name: "John Smith"
   - Position: "WR"
   - Stars: 3
   - Rank: 200
   - Outcome: "College Starter"
5. Click "Add Recruit"
6. Observe that the recruit appears in the list and statistics are updated
