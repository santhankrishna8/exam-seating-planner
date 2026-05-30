export interface Student {
  hallTicketNo: string;
  name: string;
  department?: string;
  section?: string;
  assignedRoom?: string;
  assignedBench?: number;
  assignedSeat?: number;
  isSeated: boolean;
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
