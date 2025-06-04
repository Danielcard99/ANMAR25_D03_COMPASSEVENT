import ical from 'ical-generator';
import { Event } from '../../events/entities/event.entity';

export function generateICalEvent(event: Event): string {
  const cal = ical({ name: 'Eventos da Plataforma' });

  cal.createEvent({
    start: new Date(event.date),
    end: new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000),
    summary: event.name,
    description: event.description,
    url: `https://your-app.com/events/${event.id}`,
  });

  return cal.toString();
}
