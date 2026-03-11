# resetAllCounters.js

This script resets all counters in the counters table to match the highest control number found in the records table for each section and date.

## Usage

1. Make sure your database is not in use (stop the server if running).
2. Open a terminal in the `server/scripts` directory.
3. Run the script with Node.js:

    ```sh
    node resetAllCounters.js
    ```

4. You should see a message: `All counters reset to match highest control numbers in records.`

## When to use
- After importing records with existing control numbers.
- If you encounter duplicate control numbers when adding new records.

## What it does
- For each section and dateReceived, finds the highest sequence number in both `mcCtrlNo` and `sectionCtrlNo`.
- Updates the `counters` table so the next generated control number will not duplicate any existing record.

---
**Note:** If you use PostgreSQL, you may need to adapt the script accordingly.
