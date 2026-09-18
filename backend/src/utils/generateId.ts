// Format: TN-[DISTRICT]-2026-[RANDOM_NUMBERS] e.g. TN-TIR-2026-48291
const DISTRICT_CODES: Record<string, string> = {
  tirunelveli: 'TIR',
  chennai: 'CHE',
  coimbatore: 'CBE',
  madurai: 'MDU',
  salem: 'SLM',
  tiruchirappalli: 'TPJ',
  trichy: 'TPJ',
  vellore: 'VEL',
  thanjavur: 'TNJ',
  thoothukudi: 'TUT',
  kanyakumari: 'KNY',
  dindigul: 'DGL',
  erode: 'ERD',
};

export function generateComplaintId(locationOrDistrict?: string): string {
  let districtCode = 'TIR';
  if (locationOrDistrict) {
    const lower = locationOrDistrict.toLowerCase();
    for (const [district, code] of Object.entries(DISTRICT_CODES)) {
      if (lower.includes(district)) {
        districtCode = code;
        break;
      }
    }
  }

  const randomPart = Math.floor(10000 + Math.random() * 90000); // 5 digits
  return `TN-${districtCode}-2026-${randomPart}`;
}
