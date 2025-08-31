# Recruit Management API

This document describes the new recruit management functionality that allows logged-in users to add, update, and delete recruits that don't show up from the initial API pull.

## Authentication

All recruit management operations require authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Available Outcomes

Get the list of available outcomes and their point values:

```
GET /api/outcomes
```

Response:
```json
{
  "outcomes": [
    {"outcome": "Left Team/Little Contribution/Bust", "points": 0},
    {"outcome": "4 Year Contributor", "points": 1},
    {"outcome": "College Starter", "points": 2},
    {"outcome": "All Conference", "points": 3},
    {"outcome": "All American", "points": 4},
    {"outcome": "Undrafted but made NFL Roster", "points": 5},
    {"outcome": "NFL Drafted", "points": 6},
    {"outcome": "NFL Starter", "points": 7},
    {"outcome": "NFL Pro Bowl", "points": 8}
  ],
  "total_outcomes": 9
}
```

## Adding Recruits

Add a new recruit that wasn't included in the initial API pull:

```
POST /api/recruits/add
```

Request body:
```json
{
  "year": 2020,
  "team": "Alabama",
  "name": "John Smith",
  "position": "QB",
  "stars": 4,
  "rank": 150,
  "outcome": "College Starter",
  "points": 2,
  "note": "Started 3 years at QB",
  "source": "manual"
}
```

Response:
```json
{
  "ok": true,
  "recruit": {
    "id": 123,
    "name": "John Smith",
    "position": "QB",
    "stars": 4,
    "rank": 150,
    "outcome": "College Starter",
    "points": 2,
    "note": "Started 3 years at QB",
    "source": "manual"
  }
}
```

**Note**: The rerank will be automatically recalculated after adding a recruit.

## Updating Recruits

Update an existing recruit:

```
PUT /api/recruits/{recruit_id}
```

Request body (all fields optional):
```json
{
  "name": "John Smith Jr.",
  "position": "QB",
  "stars": 5,
  "rank": 100,
  "outcome": "NFL Drafted",
  "points": 6,
  "note": "Updated career outcome",
  "source": "manual"
}
```

**Note**: The rerank will be automatically recalculated after updating a recruit.

## Deleting Recruits

Delete a manually added recruit:

```
DELETE /api/recruits/{recruit_id}
```

**Note**: Only recruits with `source: "manual"` can be deleted. API-pulled recruits cannot be deleted.

## Viewing Recruits

Get detailed recruit information including which ones were manually added:

```
GET /api/recruits/{year}/{team}/detailed
```

Response:
```json
{
  "year": 2020,
  "team": "Alabama",
  "recruits": [
    {
      "id": 123,
      "name": "John Smith",
      "position": "QB",
      "stars": 4,
      "rank": 150,
      "outcome": "College Starter",
      "points": 2,
      "note": "Started 3 years at QB",
      "source": "manual",
      "is_manual": true,
      "can_delete": true
    },
    {
      "id": 124,
      "name": "Mike Johnson",
      "position": "WR",
      "stars": 5,
      "rank": 25,
      "outcome": "NFL Drafted",
      "points": 6,
      "note": "Drafted in 3rd round",
      "source": "cfbd",
      "is_manual": false,
      "can_delete": false
    }
  ],
  "total_recruits": 2,
  "manual_recruits": 1,
  "api_recruits": 1,
  "rerank_meta": {
    "year": 2020,
    "team": "Alabama",
    "class_id": 456,
    "rank": 5,
    "total_points": 8,
    "avg_points": 4.0,
    "commits": 2
  }
}
```

## Manual Recalculation

Manually recalculate the rerank for a team/year:

```
POST /api/recruits/recalc/{year}/{team}
```

This will recalculate the rerank based on all recruits (both API-pulled and manually added) for the specified team and year.

## Workflow Example

1. **Import initial data**: Use `/api/import/cfbd/{year}/{team}` to get the initial recruiting class
2. **Review recruits**: Use `/api/recruits/{year}/{team}/detailed` to see which recruits are missing
3. **Add missing recruits**: Use `/api/recruits/add` to add recruits that weren't in the API pull
4. **Update outcomes**: Use `/api/recruits/outcomes` to update career outcomes for all recruits
5. **View results**: The rerank will be automatically updated and available via `/api/rerank/{year}/{team}`

## Error Handling

- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Cannot delete API-pulled recruits
- **404 Not Found**: Recruit or team/year not found
- **409 Conflict**: Recruit already exists (when adding)

## Security Notes

- All recruit management operations require authentication
- Only manually added recruits can be deleted
- API-pulled recruits can be updated but not deleted
- The source field helps track the origin of each recruit