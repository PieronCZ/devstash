// Maps a filename to a lucide icon component based on its extension, so the
// file list rows show a type-appropriate glyph (archive, code, image, …).
// Pure logic — unit-tested; the extension lookup is the interesting part.

import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

// Extension → icon. Grouped by kind; extend as new formats show up.
const extensionIcons: Record<string, LucideIcon> = {
  // Documents / text
  txt: FileText,
  md: FileText,
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  rtf: FileText,
  // Spreadsheets
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  // Archives
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  // Images
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  bmp: FileImage,
  ico: FileImage,
  // Audio
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  flac: FileAudio,
  // Video
  mp4: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
  avi: FileVideo,
  mkv: FileVideo,
  // Code
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  json: FileCode,
  html: FileCode,
  css: FileCode,
  py: FileCode,
  rb: FileCode,
  go: FileCode,
  rs: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  sh: FileCode,
  yml: FileCode,
  yaml: FileCode,
};

// Lowercased extension (no dot) for a filename, or "" when there isn't one.
// Handles dotfiles (".env" → "") and multi-dot names ("a.tar.gz" → "gz").
export function fileExtension(fileName: string | null | undefined): string {
  if (!fileName) return "";
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

// Resolve a filename to its icon component, falling back to a generic File.
export function getFileIcon(fileName: string | null | undefined): LucideIcon {
  return extensionIcons[fileExtension(fileName)] ?? File;
}
