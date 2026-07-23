import { describe, expect, it } from "vitest";
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react";

import { fileExtension, getFileIcon } from "@/lib/file-icons";

describe("fileExtension", () => {
  it("returns the lowercased extension", () => {
    expect(fileExtension("report.PDF")).toBe("pdf");
    expect(fileExtension("photo.JPeG")).toBe("jpeg");
  });

  it("uses only the last segment of a multi-dot name", () => {
    expect(fileExtension("archive.tar.gz")).toBe("gz");
  });

  it("ignores directory segments in a path", () => {
    expect(fileExtension("uploads/2026/notes.md")).toBe("md");
    expect(fileExtension("C:\\docs\\sheet.xlsx")).toBe("xlsx");
  });

  it("returns empty string for dotfiles and extensionless names", () => {
    expect(fileExtension(".env")).toBe("");
    expect(fileExtension("Makefile")).toBe("");
    expect(fileExtension("trailingdot.")).toBe("");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(fileExtension(null)).toBe("");
    expect(fileExtension(undefined)).toBe("");
    expect(fileExtension("")).toBe("");
  });
});

describe("getFileIcon", () => {
  it("maps known extensions to their kind icon", () => {
    expect(getFileIcon("notes.txt")).toBe(FileText);
    expect(getFileIcon("data.csv")).toBe(FileSpreadsheet);
    expect(getFileIcon("bundle.zip")).toBe(FileArchive);
    expect(getFileIcon("logo.svg")).toBe(FileImage);
    expect(getFileIcon("index.ts")).toBe(FileCode);
  });

  it("is case-insensitive", () => {
    expect(getFileIcon("REPORT.PDF")).toBe(FileText);
  });

  it("falls back to a generic File for unknown or missing extensions", () => {
    expect(getFileIcon("mystery.xyz")).toBe(File);
    expect(getFileIcon("Makefile")).toBe(File);
    expect(getFileIcon(null)).toBe(File);
  });
});
