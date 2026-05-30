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

  private hasHeader(row: any[]): boolean {
    if (!row || !row[0]) return false;
    const first = String(row[0]).toLowerCase();
    return first.includes('hall') || first.includes('ticket') || first.includes('no') || first.includes('id');
  }
}
