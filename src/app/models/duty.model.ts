// One invigilation duty, published to a teacher-readable location so an
// invigilator can sign in (with the email the admin recorded) and see / mark it.
export interface Duty {
  id: string;            // `${examId}__${roomId}__${teacherId}`
  ownerUid: string;      // college admin uid (for rules)
  examId: string;
  examName: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherEmail: string;
  teacherName: string;
  collegeName: string;
  date: Date | null;
  startTime: string;
  endTime: string;
  absentHallTickets: string[];   // submitted by the invigilator
  submitted: boolean;
}
