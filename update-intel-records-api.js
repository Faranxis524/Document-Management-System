// update-intel-records-api.js
// Updates specified fields for INTEL records in DMS via API

const axios = require('axios');
const records = [
  // Format: [SectionCtrlNo, Subject, From, TargetDate, ReceivedBy, ActionTaken, Remarks, ConcernedUnits, DateSent]
  ["RFU4A/INTEL-260101-001","DIB","Rizal PFU","01/01/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/01/2026"],
  ["RFU4A/INTEL-260101-002","Information Report","Rizal PFU","01/01/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/01/2026"],
  ["RFU4A/INTEL-260101-003","Daily Submission of Consolidated Information Reports/Incident Reports Involving Mass Actions, Terrorism and Rebellion/Coup d’etat","ALL PFUs","01/01/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/01/2026"],
  ["RFU4A/INTEL-260102-001","DIB","Quezon PFU","01/02/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/02/2026"],
  ["RFU4A/INTEL-260102-002","Information Report","Quezon PFU","01/02/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/02/2026"],
  ["RFU4A/INTEL-260102-003","Daily Submission of Consolidated Information Reports/Incident Reports Involving Mass Actions, Terrorism and Rebellion/Coup d’etat","ALL PFUs","01/02/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/02/2026"],
  ["RFU4A/INTEL-260103-001","DIB","Quezon PFU","01/03/2026","PCpl Jose Jr","Drafted","Sent thru gmail","Intel Division","01/03/2026"],
  ["RFU4A/INTEL-260103-002","Information Report","Quezon PFU","01/03/2026","PCpl Jose Jr","Drafted","Sent thru gmail","Intel Division","01/03/2026"],
  ["RFU4A/INTEL-260103-003","Request Assistance to Locate Mr. Michael Keith Anderson, American National","Intel Division","01/03/2026","PCpl Jose Jr","Drafted","Sent thru gmail","ALL PFUs","01/03/2026"],
  ["RFU4A/INTEL-260103-004","Request for Assistance to Locate Wonki Hong and 16 others, Korean Nationals","Intel Division","01/03/2026","NUP Castro","Drafted","Sent thru gmail","ALL PFUs","01/03/2026"],
  ["RFU4A/INTEL-260103-005","Daily Submission of Consolidated Information Reports/Incident Reports Involving Mass Actions, Terrorism and Rebellion/Coup d’etat","ALL PFUs","01/03/2026","NUP Castro","Drafted","Sent thru gmail","Intel Division","01/03/2026"],
  // ... (add all other records as above)
];

const API_URL = "http://10.163.253.16:5000";
const USERNAME = "admin";
const PASSWORD = "admin123";

async function updateRecord([SectionCtrlNo, Subject, From, TargetDate, ReceivedBy, ActionTaken, Remarks, ConcernedUnits, DateSent]) {
  try {
    // Find record by Section Ctrl No.
    const searchRes = await axios.get(`${API_URL}/records?section_ctrl_no=${encodeURIComponent(SectionCtrlNo)}`, {
      auth: { username: USERNAME, password: PASSWORD }
    });
    if (!searchRes.data || !searchRes.data.length) {
      console.log(`Record not found: ${SectionCtrlNo}`);
      return;
    }
    const record = searchRes.data[0];
    // Update fields
    const updatePayload = {
      subject: Subject,
      from: From,
      target_date: TargetDate,
      received_by: ReceivedBy,
      action_taken: ActionTaken,
      remarks: Remarks,
      concerned_units: ConcernedUnits,
      date_sent: DateSent
    };
    const updateRes = await axios.put(`${API_URL}/records/${record.id}`, updatePayload, {
      auth: { username: USERNAME, password: PASSWORD }
    });
    console.log(`Updated: ${SectionCtrlNo}`);
  } catch (err) {
    console.error(`Error updating ${SectionCtrlNo}:`, err.response ? err.response.data : err.message);
  }
}

async function main() {
  for (const rec of records) {
    await updateRecord(rec);
  }
}

main();
