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
  /** Hall document id — matched exactly, so two halls may share a name. */
  roomId: string;
  roomName: string;
  benchNumber: number;
  seatNumber: number;
  seatsPerBench: number;
  floor: string;
}
