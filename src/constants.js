// ─── Shared constants ────────────────────────────────────────────────────────
// Single source of truth. Import from here everywhere; never duplicate.

export const API_BASE = '';

export const USERS = [
  { label: 'NUP Tala (MC)', username: 'NUP Tala', role: 'MC', section: null },
  { label: 'PMSG Foncardas (MC)', username: 'PMSG Foncardas', role: 'MC', section: null },
  { label: 'NUP Tala (INVES)', username: 'NUP Tala - INVES', role: 'SECTION', section: 'INVES' },
  { label: 'NUP San Pedro (ADM)', username: 'NUP San Pedro', role: 'SECTION', section: 'ADM' },
  { label: 'PMSG Foncardas (ADM)', username: 'PMSG Foncardas - ADM', role: 'SECTION', section: 'ADM' },
  { label: 'NUP Aldrin (OPN)', username: 'NUP Aldrin', role: 'SECTION', section: 'OPN' },
  { label: 'PCPL Bueno (OPN)', username: 'PCPL Bueno', role: 'SECTION', section: 'OPN' },
  { label: 'PAT Duyag (OPN)', username: 'PAT Duyag', role: 'SECTION', section: 'OPN' },
  { label: 'NUP Joyce (INTEL)', username: 'NUP Joyce', role: 'SECTION', section: 'INTEL' },
  { label: 'PCPL Jose (INTEL)', username: 'PCPL Jose', role: 'SECTION', section: 'INTEL' },
];

export const SECTIONS = ['INVES', 'INTEL', 'ADM', 'OPN'];

export const SECTION_LABELS = {
  INVES: 'Investigation Section',
  INTEL: 'Intelligence Section',
  ADM: 'Admin Section',
  OPN: 'Operation Section',
};

export const DEFAULT_FROM = {
  INVES: 'IND',
  OPN: 'OMD',
  INTEL: 'ID',
  ADM: 'ARMD',
};

export const RECEIVED_BY = {
  INVES: ['NUP Tala'],
  OPN: ['NUP Aldrin', 'PCPL Bueno', 'PAT Duyag'],
  INTEL: ['NUP Joyce', 'PCPL Jose'],
  ADM: ['NUP San Pedro', 'PMSG Foncardas'],
};

export const TABLE_COLUMNS = [
  'MC Ctrl No.',
  'Section Ctrl No.',
  'Section',
  'Date Received',
  'Subject',
  'From',
  'Target Date',
  'Received By',
  'Action Taken',
  'Remarks',
  'Concerned Units',
  'Date Sent',
  'Status',
];

export const REPORT_SIGNATORIES = [
  { name: '', position: 'Admin PNCO' },
  { name: '', position: 'Chief, Admin Section' },
  { name: '', position: 'Regional Chief' },
];

export const MC_NAV_ITEMS = [
  'MC Master List',
  ...SECTIONS.map((s) => SECTION_LABELS[s]),
  'Activity Log',
  'User Management',
];

export const INITIAL_RECORD = {
  mcCtrlNo: '',
  sectionCtrlNo: '',
  section: 'INVES',
  dateReceived: '',
  subjectText: '',
  subjectFile: null,
  fromValue: 'IND',
  fromCustom: '',
  fromType: 'DEFAULT',
  targetDateMode: 'DATE',
  targetDate: '',
  receivedBy: '',
  receivedByCustom: '',
  actionTaken: 'DRAFTED',
  actionTakenCustom: '',
  remarksEmail: false,
  remarksViber: false,
  remarksHardCopy: false,
  remarksCustom: false,
  remarksCustomText: '',
  concernedUnits: 'IND',
  concernedUnitsCustom: '',
  dateSentMode: 'DATE',
  dateSent: '',
  status: 'Pending',
};

const FROM_OPTIONS_EXTRA = [
  'PFU (CAVITE)',
  'PFU (LAGUNA)',
  'PFU (RIZAL)',
  'PFU (BATANGAS)',
  'PFU (QUEZON)',
  'User Input',
];

export function getFromOptions(section) {
  return [DEFAULT_FROM[section] || 'PFU', ...FROM_OPTIONS_EXTRA];
}
