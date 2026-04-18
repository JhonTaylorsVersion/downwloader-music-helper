export interface TemplateData {
    title?: string;
    artist?: string;
    album?: string;
    album_artist?: string;
    track?: number;
    disc?: number;
    year?: string;
    isrc?: string;
    date?: string;
    playlist?: string;
}

export function parseTemplate(template: string, data: TemplateData): string {
    if (!template) return "";
    let result = template;
    result = result.replace(/\{title\}/g, data.title || "Unknown Title");
    result = result.replace(/\{artist\}/g, data.artist || "Unknown Artist");
    result = result.replace(/\{album\}/g, data.album || "Unknown Album");
    result = result.replace(/\{album_artist\}/g, data.album_artist || data.artist || "Unknown Artist");
    result = result.replace(/\{isrc\}/g, data.isrc || "");
    result = result.replace(/\{track\}/g, data.track ? String(data.track).padStart(2, "0") : "00");
    result = result.replace(/\{disc\}/g, data.disc ? String(data.disc) : "1");
    result = result.replace(/\{year\}/g, data.year || "0000");
    result = result.replace(/\{date\}/g, data.date || "0000-00-00");
    result = result.replace(/\{playlist\}/g, data.playlist || "");
    return result;
}
