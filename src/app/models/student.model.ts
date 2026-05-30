export interface Student {
  hallTicketNo: string;
  name: string;
  department?: string;
  section?: string;
  assignedRoom?: string;
  assignedBench?: number;
  assignedSeat?: number;
  isSeated: boolean;
  absent?: boolean;        // attendance: true = marked absent for this exam
}

export interface PublicSeat {
  hallTicketNo: string;
  name: string;
  roomName: string;
  benchNumber: number;
  seatNumber: number;
  seatsPerBench: number;
  floor: string;
}
