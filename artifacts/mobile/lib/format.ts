export function formatDate(iso?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", opts ?? { day: "numeric", month: "long" });
  } catch {
    return "—";
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatRelative(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = d.getTime() - Date.now();
    const abs = Math.abs(diff);
    const sign = diff < 0 ? "-" : "+";
    if (abs < 60000) return "maintenant";
    if (abs < 3600000) {
      const min = Math.round(abs / 60000);
      return diff < 0 ? `il y a ${min} min` : `dans ${min} min`;
    }
    if (abs < 86400000) {
      const h = Math.round(abs / 3600000);
      return diff < 0 ? `il y a ${h} h` : `dans ${h} h`;
    }
    const days = Math.ceil(abs / 86400000);
    return diff < 0 ? `il y a ${days} j` : `dans ${days} j`;
  } catch {
    return "—";
  }
}

const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6",
  "Red Bull": "#3671C6",
  Ferrari: "#E8002D",
  Mercedes: "#27F4D2",
  McLaren: "#FF8000",
  "Aston Martin": "#229971",
  Alpine: "#FF87BC",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  "Kick Sauber": "#52E252",
  Haas: "#B6BABD",
  Sauber: "#52E252",
  "Alpine F1 Team": "#FF87BC",
};

export function teamColor(team?: string): string {
  if (!team) return "#888888";
  return TEAM_COLORS[team] ?? "#888888";
}

export function positionColor(pos: number): string {
  if (pos === 1) return "#FFD700";
  if (pos === 2) return "#C0C0C0";
  if (pos === 3) return "#CD7F32";
  if (pos <= 10) return "#22c55e";
  return "#8888aa";
}
