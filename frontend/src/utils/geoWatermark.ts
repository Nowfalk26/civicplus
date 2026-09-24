/**
 * Utility for drawing professional, tamper-evident geo-watermarks onto canvas images
 * and calculating distances/coordinates for Civic+ Work Evidence.
 */

export interface GeoWatermarkMetadata {
  stageTitle: string; // e.g., 'SITE INSPECTION', 'WORK STARTED', 'WORK COMPLETED'
  dateStr: string;    // e.g., '24 Sep 2026'
  timeStr: string;    // e.g., '11:35:42 AM'
  latitude: number;
  longitude: number;
  employeeName?: string;
  employeeId?: string;
  isLocationConfirmed?: boolean;
  distanceMeters?: number | null;
}

/**
 * Format decimal coordinates to readable GPS string (e.g., 9.9252° N, 78.1198° E)
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Draws a clean, professional semi-transparent watermark badge onto a canvas.
 * Positioned in the bottom-left corner with gradient backdrop, Civic+ emblem,
 * stage tag, timestamp, and GPS coordinates.
 */
export function drawGeoWatermark(ctx: CanvasRenderingContext2D, width: number, height: number, meta: GeoWatermarkMetadata): void {
  const padding = Math.max(16, Math.round(width * 0.02));
  const badgeWidth = Math.min(width - padding * 2, Math.max(340, Math.round(width * 0.42)));
  const badgeHeight = Math.min(height * 0.35, 130);
  const x = padding;
  const y = height - badgeHeight - padding;
  const radius = 14;

  ctx.save();

  // 1. Draw rounded frosted dark pill backdrop
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + badgeWidth - radius, y);
  ctx.quadraticCurveTo(x + badgeWidth, y, x + badgeWidth, y + radius);
  ctx.lineTo(x + badgeWidth, y + badgeHeight - radius);
  ctx.quadraticCurveTo(x + badgeWidth, y + badgeHeight, x + badgeWidth - radius, y + badgeHeight);
  ctx.lineTo(x + radius, y + badgeHeight);
  ctx.quadraticCurveTo(x, y + badgeHeight, x, y + badgeHeight - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  // Dark gradient fill
  const gradient = ctx.createLinearGradient(x, y, x, y + badgeHeight);
  gradient.addColorStop(0, 'rgba(10, 25, 47, 0.88)');
  gradient.addColorStop(1, 'rgba(5, 15, 30, 0.95)');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Subtle border outline
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = meta.isLocationConfirmed ? 'rgba(52, 211, 153, 0.6)' : 'rgba(251, 191, 36, 0.6)';
  ctx.stroke();

  // 2. Draw Header: "CIVIC+ | [STAGE TITLE]"
  const innerX = x + 16;
  let textY = y + 26;

  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#60a5fa'; // Blue accent
  ctx.fillText('CIVIC+', innerX, textY);

  const civicPlusWidth = ctx.measureText('CIVIC+').width;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(' | ', innerX + civicPlusWidth, textY);

  const dividerWidth = ctx.measureText(' | ').width;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(meta.stageTitle.toUpperCase(), innerX + civicPlusWidth + dividerWidth, textY);

  // Status tag on top right of badge
  if (meta.isLocationConfirmed !== undefined) {
    const statusText = meta.isLocationConfirmed ? '✓ GPS CONFIRMED' : '⚠ OFF-SITE';
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    const statusWidth = ctx.measureText(statusText).width;
    const tagX = x + badgeWidth - statusWidth - 22;
    const tagY = y + 15;

    ctx.fillStyle = meta.isLocationConfirmed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.roundRect(tagX - 4, tagY - 2, statusWidth + 12, 18, 4);
    ctx.fill();

    ctx.fillStyle = meta.isLocationConfirmed ? '#34d399' : '#fbbf24';
    ctx.fillText(statusText, tagX + 2, tagY + 11);
  }

  // 3. Draw Date & Time
  textY += 24;
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Date: ${meta.dateStr}  •  Time: ${meta.timeStr}`, innerX, textY);

  // 4. Draw GPS coordinates
  textY += 22;
  const gpsFormatted = formatCoordinates(meta.latitude, meta.longitude);
  ctx.font = 'bold 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`GPS: ${gpsFormatted}`, innerX, textY);

  // 5. Draw Inspector info & distance
  textY += 20;
  ctx.font = '400 11px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  let footer = `Staff: ${meta.employeeName || 'Field Employee'}`;
  if (meta.employeeId) footer += ` (${meta.employeeId})`;
  if (meta.distanceMeters !== undefined && meta.distanceMeters !== null) {
    footer += ` • ${Math.round(meta.distanceMeters)}m from ticket`;
  }
  ctx.fillText(footer, innerX, textY);

  ctx.restore();
}
