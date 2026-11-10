import { FileUploadService } from './file-upload.service';

/**
 * `parseFile` reads through FileReader + xlsx, so the header heuristic is
 * exercised directly — it is the piece that silently ate a candidate row.
 */
describe('FileUploadService header detection', () => {
  const svc = new FileUploadService();
  const hasHeader = (row: any[]) => (svc as any).hasHeader(row) as boolean;

  it('treats a wordy first cell as a header', () => {
    expect(hasHeader(['Hall Ticket No', 'Name'])).toBe(true);
    expect(hasHeader(['HTNO', 'Name'])).toBe(true);
    expect(hasHeader(['Roll Number'])).toBe(true);
  });

  it('never mistakes a hall ticket for a header', () => {
    // The old substring rule matched "no" inside this ticket and dropped it.
    expect(hasHeader(['21NO1A0501', 'A. Kumar'])).toBe(false);
    expect(hasHeader(['21WH1A0501', 'B. Rao'])).toBe(false);
  });

  it('handles empty and missing rows', () => {
    expect(hasHeader([])).toBe(false);
    expect(hasHeader([null])).toBe(false);
    expect(hasHeader(['   '])).toBe(false);
  });
});
