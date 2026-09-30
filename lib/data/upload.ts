import { NOT_CSV, type ReadResult, readCsv } from "./parse";

// Checks on an uploaded file (D-041): its name and size before it is read,
// then its contents with readCsv.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function checkFile(file: { name: string; size: number }): string | null {
  if (!/\.csv$/i.test(file.name)) return NOT_CSV;
  if (file.size > MAX_UPLOAD_BYTES) {
    // Rounded up, so a file just over the limit never reads as "5.0 MB".
    const mb = (Math.ceil((file.size / (1024 * 1024)) * 10) / 10).toFixed(1);
    return `This file is ${mb} MB; the limit is 5 MB.`;
  }
  return null;
}

// A File, or anything shaped like one.
export async function readUpload(file: { name: string; size: number; text: () => Promise<string> }): Promise<ReadResult> {
  const problem = checkFile(file);
  if (problem) return { ok: false, message: problem };
  return readCsv(await file.text());
}
