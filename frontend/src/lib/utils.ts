import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TN_DISTRICTS = [
  'Tirunelveli',
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Thoothukudi',
  'Kanyakumari',
  'Dindigul',
  'Tiruppur',
  'Cuddalore',
  'Kanchipuram',
  'Chengalpattu',
  'Tiruvallur',
  'Dharmapuri',
  'Krishnagiri',
  'Namakkal',
  'Nilgiris',
  'Karur',
  'Perambalur',
  'Ariyalur',
  'Nagapattinam',
  'Tiruvarur',
  'Pudukkottai',
  'Sivaganga',
  'Ramanathapuram',
  'Virudhunagar',
  'Tenkasi',
  'Ranipet',
  'Tirupathur',
  'Kallakurichi',
  'Mayiladuthurai',
];

export const DISTRICT_COORDS: Record<string, { lat: number; lng: number; code: string }> = {
  Tirunelveli: { lat: 8.7139, lng: 77.7567, code: 'TIR' },
  Chennai: { lat: 13.0827, lng: 80.2707, code: 'CHE' },
  Coimbatore: { lat: 11.0168, lng: 76.9558, code: 'CBE' },
  Madurai: { lat: 9.9252, lng: 78.1198, code: 'MDU' },
  Tiruchirappalli: { lat: 10.7905, lng: 78.7047, code: 'TPJ' },
  Salem: { lat: 11.6643, lng: 78.146, code: 'SLM' },
  Erode: { lat: 11.341, lng: 77.7172, code: 'ERD' },
  Vellore: { lat: 12.9165, lng: 79.1325, code: 'VEL' },
  Thanjavur: { lat: 10.787, lng: 79.1378, code: 'TNJ' },
  Thoothukudi: { lat: 8.7642, lng: 78.1348, code: 'TUT' },
  Kanyakumari: { lat: 8.0883, lng: 77.5385, code: 'KNY' },
  Dindigul: { lat: 10.3673, lng: 77.9803, code: 'DGL' },
  Tiruppur: { lat: 11.1085, lng: 77.3411, code: 'TPR' },
  Cuddalore: { lat: 11.748, lng: 79.7714, code: 'CUD' },
  Kanchipuram: { lat: 12.8342, lng: 79.7036, code: 'KCH' },
};

export const CATEGORY_INFO: Record<
  string,
  { labelEn: string; labelTa: string; icon: string; color: string; badgeBg: string }
> = {
  ROAD_DAMAGE: {
    labelEn: 'Road Damage',
    labelTa: 'சாலை சேதம்',
    icon: 'add_road',
    color: '#004ac6',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  STREET_LIGHT: {
    labelEn: 'Street Light',
    labelTa: 'தெரு விளக்கு',
    icon: 'lightbulb',
    color: '#f59e0b',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  ELECTRICAL_WIRE: {
    labelEn: 'Electrical Wire',
    labelTa: 'மின் கம்பி',
    icon: 'bolt',
    color: '#ef4444',
    badgeBg: 'bg-red-100 text-red-800 border-red-200',
  },
  GARBAGE_WASTE: {
    labelEn: 'Garbage & Waste',
    labelTa: 'குப்பை கழிவு',
    icon: 'delete',
    color: '#10b981',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  STORM_WATER_DRAIN: {
    labelEn: 'Storm Water Drain',
    labelTa: 'மழைநீர் வடிகால்',
    icon: 'water_drop',
    color: '#0284c7',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  PUBLIC_SPACE: {
    labelEn: 'Public Space',
    labelTa: 'பொது இடம்',
    icon: 'park',
    color: '#8b5cf6',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

export const STATUS_INFO: Record<
  string,
  { labelEn: string; labelTa: string; color: string; bg: string; text: string; pinColor: string }
> = {
  SUBMITTED: {
    labelEn: 'Submitted',
    labelTa: 'சமர்ப்பிக்கப்பட்டது',
    color: '#ef4444',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    pinColor: '#ef4444', // Red
  },
  ACCEPTED: {
    labelEn: 'Accepted',
    labelTa: 'ஏற்றுக்கொள்ளப்பட்டது',
    color: '#3b82f6',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    pinColor: '#3b82f6', // Blue
  },
  ASSIGNED: {
    labelEn: 'Assigned',
    labelTa: 'ஒதுக்கப்பட்டது',
    color: '#f59e0b',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    pinColor: '#f59e0b', // Yellow/Amber
  },
  VIEWED: {
    labelEn: 'Viewed',
    labelTa: 'பார்க்கப்பட்டது',
    color: '#6366f1',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    pinColor: '#6366f1',
  },
  SITE_VISIT_COMPLETED: {
    labelEn: 'Site Visit Completed',
    labelTa: 'தள பரிசோதனை முடிந்தது',
    color: '#8b5cf6',
    bg: 'bg-violet-50 border-violet-200',
    text: 'text-violet-700',
    pinColor: '#8b5cf6',
  },
  WORK_STARTED: {
    labelEn: 'Work Started',
    labelTa: 'பணி தொடங்கியது',
    color: '#0ea5e9',
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-sky-700',
    pinColor: '#0ea5e9',
  },
  WORK_IN_PROGRESS: {
    labelEn: 'Work In Progress',
    labelTa: 'பணி நடைபெறுகிறது',
    color: '#eab308',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    pinColor: '#eab308',
  },
  IN_PROGRESS: {
    labelEn: 'In Progress',
    labelTa: 'செயலில் உள்ளது',
    color: '#eab308',
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    pinColor: '#eab308', // Yellow
  },
  RESOLVED: {
    labelEn: 'Resolved',
    labelTa: 'தீர்க்கப்பட்டது',
    color: '#10b981',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    pinColor: '#10b981', // Green
  },
  REJECTED: {
    labelEn: 'Rejected',
    labelTa: 'நிராகரிக்கப்பட்டது',
    color: '#6b7280',
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-gray-700',
    pinColor: '#6b7280', // Grey
  },
};

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && days === 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0m';
}

export function formatDurationLong(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  return parts.join(' ') || '—';
}
