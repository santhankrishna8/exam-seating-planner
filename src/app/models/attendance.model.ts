// One attendance sheet per exam + hall. Its document id is a long random token
// that doubles as the invigilator's private link: /duty/<id>. No accounts.
export interface Attendance {
  id: string;              // secret token
  ownerUid: string;
  examId: string;
  examName: string;
  roomId: string;
  roomName: string;
  collegeName: string;
  date: Date | null;
  startTime: string;
  endTime: string;
  invigilators: string[];  // names, for display only
  absentHallTickets: string[];
  submitted: boolean;
}
