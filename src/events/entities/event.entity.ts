import { EventStatus } from '../dto/create-event.dto';

export class Event {
  id: string;
  name: string;
  description: string;
  date: string;
  imageUrl: string;
  organizerId: string;
  createdAt: string;
  status: EventStatus;
}
