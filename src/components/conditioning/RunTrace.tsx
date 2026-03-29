import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GpsPoint } from '@/hooks/useGpsTracking';

interface RunTraceProps {
  points: GpsPoint[];
}

function simplifyPath(points: { lat: number; lng: number }[], tolerance: number): { lat: number; lng: number }[] {
  if (points.length < 3) return points;

  const sqDist = (p: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    let dx = b.lat - a.lat;
    let dy = b.lng - a.lng;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.lat - a.lat) * dx + (p.lng - a.lng) * dy) / (dx * dx + dy * dy);
      if (t > 1) { dx = p.lat - b.lat; dy = p.lng - b.lng; }
      else if (t > 0) { dx = p.lat - (a.lat + dx * t); dy = p.lng - (a.lng + dy * t); }
      else { dx = p.lat - a.lat; dy = p.lng - a.lng; }
    } else { dx = p.lat - a.lat; dy = p.lng - a.lng; }
    return dx * dx + dy * dy;
  };

  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = sqDist(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > tolerance * tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

export function RunTrace({ points }: RunTraceProps) {
  const svgPath = useMemo(() => {
    if (points.length < 2) return null;

    const coords = points.map(p => ({ lat: p.lat, lng: p.lng }));
    const simplified = simplifyPath(coords, 0.00005);

    const lats = simplified.map(p => p.lat);
    const lngs = simplified.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    const padding = 20;
    const width = 280;
    const height = 160;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const rangeX = maxLng - minLng || 0.001;
    const rangeY = maxLat - minLat || 0.001;
    const scale = Math.min(innerW / rangeX, innerH / rangeY);

    const normalized = simplified.map(p => ({
      x: padding + (p.lng - minLng) * scale + (innerW - rangeX * scale) / 2,
      y: padding + (maxLat - p.lat) * scale + (innerH - rangeY * scale) / 2,
    }));

    const pathStr = normalized.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const start = normalized[0];
    const end = normalized[normalized.length - 1];

    return { pathStr, start, end, width, height };
  }, [points]);

  if (!svgPath) return null;

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-zinc-900 rounded-lg">
          <svg
            viewBox={`0 0 ${svgPath.width} ${svgPath.height}`}
            className="w-full"
            style={{ height: 160 }}
          >
            {/* Route line */}
            <path
              d={svgPath.pathStr}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Glow */}
            <path
              d={svgPath.pathStr}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.15"
            />
            {/* Start dot */}
            <circle cx={svgPath.start.x} cy={svgPath.start.y} r="4" fill="#22c55e" />
            <circle cx={svgPath.start.x} cy={svgPath.start.y} r="7" fill="#22c55e" opacity="0.2" />
            {/* End dot */}
            <circle cx={svgPath.end.x} cy={svgPath.end.y} r="4" fill="hsl(var(--primary))" />
            <circle cx={svgPath.end.x} cy={svgPath.end.y} r="7" fill="hsl(var(--primary))" opacity="0.2" />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
