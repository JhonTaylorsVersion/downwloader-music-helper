export interface TemplateData {
  artist?: string;
  album?: string;
  album_artist?: string;
  title?: string;
  track?: string;
  disc?: string;
  year?: string;
  date?: string;
  isrc?: string;
  playlist?: string;
}

export function parseTemplate(template: string, data: TemplateData): string {
  if (!template) return '';
  return template
    .replace(/\{artist\}/g, data.artist ?? "")
    .replace(/\{album\}/g, data.album ?? "")
    .replace(/\{album_artist\}/g, data.album_artist ?? data.artist ?? "")
    .replace(/\{title\}/g, data.title ?? "")
    .replace(/\{track\}/g, data.track ?? "")
    .replace(/\{disc\}/g, data.disc ?? "")
    .replace(/\{year\}/g, data.year ?? "")
    .replace(/\{date\}/g, data.date ?? "")
    .replace(/\{isrc\}/g, data.isrc ?? "")
    .replace(/\{playlist\}/g, data.playlist ?? "");
}
