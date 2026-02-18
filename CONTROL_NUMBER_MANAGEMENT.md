# Control Number Management System

## Overview
This document describes the automated control number management system that prevents gaps and validates control number integrity when records are deleted.

## Features Implemented

### 1. **Automatic Counter Reset on Record Deletion**
When a record is deleted, the system automatically:
- Finds the highest sequence number from remaining records for that section/date
- Resets the counters in the database to match the highest number
- Ensures the next created record will use the correct sequential number without gaps

**How it works:**
- When `DELETE /records/:id` is called
- After successful deletion, calls `resetCountersForSection(section, dateReceived)`
- Scans all remaining records for that section and date
- Finds highest MC and Section control number sequences
- Updates the `counters` table with the new values

**Response Format:**
```json
{
  "ok": true,
  "countersReset": {
    "highestMC": 5,
    "highestSection": 3
  },
  "validation": {
    "hasProblems": false,
    "duplicates": [],
    "issues": [],
    "status": "ok"
  }
}
```

### 2. **Control Number Validation**
Validates control numbers for:
- **Duplicate control numbers** - Multiple records with the same control number
- **Missing sequences (gaps)** - Sequence numbers that are skipped (e.g., 01, 02, 04, 05 - missing 03)

**Endpoint:** `GET /records/validate-control-numbers`

**Query Parameters:**
- `section` (required) - The section to validate (e.g., INVES, INTEL, OPN)
- `dateReceived` (required) - Date to validate (YYYY-MM-DD format)

**Response:**
```json
{
  "section": "INVES",
  "dateReceived": "2026-02-18",
  "hasProblems": true,
  "status": "issues_found",
  "duplicates": [
    {
      "controlNumber": "RFU4A-INVES-MC-180226-02",
      "type": "MC",
      "ids": [123, 456]
    }
  ],
  "issues": [
    "MC control number missing: RFU4A-INVES-MC-180226-03",
    "SECTION control number missing: RFU4A-INVES-180226-02"
  ]
}
```

**Permissions:**
- MC role: Can validate any section
- SECTION role: Can only validate their own section

### 3. **Manual Counter Reset**
Admin endpoint to manually reset counters if needed.

**Endpoint:** `POST /records/reset-counters`

**Request Body:**
```json
{
  "section": "INVES",
  "dateReceived": "2026-02-18"
}
```

**Response:**
```json
{
  "ok": true,
  "section": "INVES",
  "dateReceived": "2026-02-18",
  "resetResult": {
    "highestMC": 10,
    "highestSection": 8
  },
  "validation": {
    "hasProblems": false,
    "duplicates": [],
    "issues": [],
    "status": "ok"
  }
}
```

**Permissions:**
- Only MC role can access this endpoint

## Database Functions

### `resetCountersForSection(section, dateReceived)`
Recalculates and resets counters for a specific section and date.

**Parameters:**
- `section` - Section code (INVES, INTEL, OPN, etc.)
- `dateReceived` - Date in YYYY-MM-DD format

**Returns:**
```javascript
{
  highestMC: 5,        // Highest MC sequence found
  highestSection: 3    // Highest Section sequence found
}
```

**Algorithm:**
1. Query all records for the section/date
2. Parse control numbers to extract sequence numbers
3. Find the maximum sequence for both MC and Section control numbers
4. Update the `counters` table with the new maximums

### `validateControlNumbers(section, dateReceived)`
Checks for duplicate and missing control numbers.

**Parameters:**
- `section` - Section code
- `dateReceived` - Date in YYYY-MM-DD format

**Returns:**
```javascript
{
  hasProblems: true,
  duplicates: [...],   // Array of duplicate control number objects
  issues: [...]        // Array of gap/missing number messages
}
```

**Algorithm:**
1. Query all records for the section/date
2. Check for duplicate MC and Section control numbers
3. Check for gaps in sequence numbers (1, 2, 4, 5 shows gap at 3)
4. Return lists of duplicates and issues found

## Control Number Format

### MC Control Number
`RFU4A-MC-{DDMMYY}-{SEQ}`
- Example: `RFU4A-MC-180226-01`
- Note: MC numbers are global and don't include the section

### Section Control Number
`RFU4A-{SECTION}-{DDMMYY}-{SEQ}`
- Example: `RFU4A-INVES-180226-01`

## Usage Scenarios

### Scenario 1: Delete a middle record
**Initial state:**
- Record 1: RFU4A-INVES-MC-180226-01
- Record 2: RFU4A-INVES-MC-180226-02
- Record 3: RFU4A-INVES-MC-180226-03

**Action:** Delete Record 2

**Result:**
- Counter resets to 3 (highest remaining)
- Next created record will be: RFU4A-INVES-MC-180226-04
- No gap in the counter sequence

### Scenario 2: Delete the last record
**Initial state:**
- Record 1: RFU4A-INVES-MC-180226-01
- Record 2: RFU4A-INVES-MC-180226-02
- Record 3: RFU4A-INVES-MC-180226-03

**Action:** Delete Record 3

**Result:**
- Counter resets to 2 (highest remaining)
- Next created record will be: RFU4A-INVES-MC-180226-03
- Reuses the number of the deleted record

### Scenario 3: Validation detects issues
**State:**
- Record 1: RFU4A-INVES-MC-180226-01
- Record 2: RFU4A-INVES-MC-180226-03 (gap - missing 02)
- Record 3: RFU4A-INVES-MC-180226-03 (duplicate)

**Validation Result:**
```json
{
  "hasProblems": true,
  "duplicates": [
    {
      "controlNumber": "RFU4A-INVES-MC-180226-03",
      "type": "MC",
      "ids": [2, 3]
    }
  ],
  "issues": [
    "MC control number missing: RFU4A-INVES-MC-180226-02"
  ]
}
```

## Frontend Integration Recommendations

### 1. Display validation warnings after deletion
```javascript
const response = await fetch(`/records/${id}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});

const result = await response.json();

if (result.validation && result.validation.hasProblems) {
  showWarning(`Control number issues detected: ${result.validation.issues.join(', ')}`);
}
```

### 2. Add periodic validation check
```javascript
// Check for issues on page load or periodically
async function checkControlNumbers(section, dateReceived) {
  const response = await fetch(
    `/records/validate-control-numbers?section=${section}&dateReceived=${dateReceived}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  const validation = await response.json();
  
  if (validation.hasProblems) {
    displayValidationIssues(validation);
  }
}
```

### 3. Admin tool for manual reset
```javascript
// Admin panel button to manually fix counters
async function resetCounters(section, dateReceived) {
  const response = await fetch('/records/reset-counters', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ section, dateReceived })
  });
  
  const result = await response.json();
  
  if (result.ok) {
    showSuccess(`Counters reset. MC: ${result.resetResult.highestMC}, Section: ${result.resetResult.highestSection}`);
  }
}
```

## Testing

All functionality is covered by automated tests in:
- `server/__tests__/control-numbers.test.js` (9 tests)

**Test Coverage:**
- ✅ Counter reset after deletion
- ✅ Validation warnings provided
- ✅ Validation endpoint with query parameters
- ✅ Manual counter reset endpoint
- ✅ Duplicate detection
- ✅ Gap detection
- ✅ Permission checks

Run tests:
```bash
cd server
npm test -- control-numbers.test.js
```

## Benefits

1. **Data Integrity:** Prevents control number gaps and duplicates
2. **Automatic:** No manual intervention needed when deleting records
3. **Validation:** Easy to check for any issues in the database
4. **Admin Control:** Manual reset option for edge cases
5. **Auditable:** All operations are logged to console
6. **Tested:** Comprehensive test coverage ensures reliability

## Future Enhancements

1. **Frontend UI:**
   - Add visual indicators for validation issues
   - Show warning modal before deleting records
   - Admin dashboard for bulk validation

2. **Batch Operations:**
   - Validate all sections/dates at once
   - Export validation report
   - Bulk counter reset

3. **Notifications:**
   - Email alerts when issues are detected
   - Slack/webhook integration for admins

4. **Audit Log:**
   - Track all counter reset operations
   - Record who triggered manual resets
   - History of validation checks
