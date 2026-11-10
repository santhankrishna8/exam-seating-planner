// Two states only: a draft is private, a published exam is visible to students.
export type ExamStatus = 'draft' | 'published';
export type ShuffleMode = 'sequential' | 'random' | 'department';

export interface Exam {
  id: string;
  name: string;
  subjectCode: string;
  department?: string;     // conducting department — invigilators of this dept are avoided
  date: Date;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  shuffleMode: ShuffleMode;
  spacing: boolean;        // leave alternate seat empty per bench (anti-malpractice gap)
  selectedRooms: string[];
  teachersPerRoom: number;                  // invigilators wanted per room
  invigilators: Record<string, string[]>;   // roomId -> teacherIds on duty
  createdAt: Date;
}

export interface RoomAssignment {
  roomId: string;
  roomName: string;
  assignedCount: number;
  totalCapacity: number;
}
