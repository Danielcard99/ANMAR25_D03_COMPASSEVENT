import { RegistrationStatus } from '../enums/registration-status.enum';

export class Registration {
  id: string;
  eventId: string;
  participantId: string;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt?: string;
}
