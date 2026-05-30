export type ExamStatus = 'draft' | 'published' | 'archived';
export type ShuffleMode = 'sequential' | 'random' | 'department';

export interface Exam {
  id: string;
  name: string;
  subjectCode: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  shuffleMode: ShuffleMode;
  spacing: boolean;        // leave alternate seat empty per bench (anti-malpractice gap)
  selectedRooms: string[];
  createdAt: Date;
}

export interface RoomAssignment {
  roomId: string;
  roomName: string;
  assignedCount: number;
  totalCapacity: number;
}
