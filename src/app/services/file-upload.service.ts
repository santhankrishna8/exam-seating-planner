import { Injectable } from '@angular/core';
import { Student } from '../models/student.model';
import { normalizeHallTicket } from '../utils/hall-ticket';

@Injectable({ providedIn: 'root' })
export class FileUploadService {

  parseFile(file: File): Promise<Student[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const students: Student[] = [];
          const seen = new Set<string>();
          const startRow = this.hasHeader(rows[0]) ? 1 : 0;

          for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[0]) continue;
            const hallTicket = normalizeHallTicket(String(row[0]));
            const name = String(row[1] ?? '').trim();
            if (!hallTicket || !name || seen.has(hallTicket)) continue;
            seen.add(hallTicket);
            students.push({
              hallTicketNo: hallTicket,
              name,
              department: row[2] ? String(row[2]).trim() : undefined,
              section: row[3] ? String(row[3]).trim() : undefined,
              isSeated: false
            });
          }
          if (students.length === 0) {
            reject(new Error('No valid student rows found. Expected columns: Hall Ticket, Name.'));
            return;
          }
          resolve(students);
        } catch (err) {
          reject(new Error('Failed to parse file. Please check the format.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsBinaryString(file);
    });
  }

  /**
   * The first row is a header when its first cell carries no digit. Every hall
   * ticket contains digits; every column label ("Hall Ticket No", "HTNO",
   * "Roll Number") does not. Matching on substrings instead would drop the
   * first candidate whenever a ticket happened to read "21NO1A0501".
   */
  private hasHeader(row: any[]): boolean {
    if (!row || row[0] === undefined || row[0] === null) return false;
    const cell = String(row[0]).trim();
    return cell.length > 0 && !/\d/.test(cell);
  }
}
