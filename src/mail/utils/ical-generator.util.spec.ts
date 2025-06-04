import { generateICalEvent } from './ical-generator.util';
import { Event } from '../../events/entities/event.entity';
import { EventStatus } from '../../events/dto/create-event.dto';

// Mock ical-generator
jest.mock('ical-generator', () => {
  const mockEvent = {
    summary: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    start: jest.fn().mockReturnThis(),
    url: jest.fn().mockReturnThis(),
  };
  
  const mockCalendar = {
    createEvent: jest.fn().mockReturnValue(mockEvent),
    toString: jest.fn().mockReturnValue('mock-ical-data'),
  };
  
  return jest.fn().mockReturnValue(mockCalendar);
});

describe('generateICalEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate iCal event data', () => {
    const mockEvent: Event = {
      id: 'event-id',
      name: 'Test Event',
      description: 'Test Description',
      date: '2023-12-31T00:00:00.000Z',
      imageUrl: 'https://example.com/event.jpg',
      organizerId: 'organizer-id',
      status: EventStatus.ACTIVE,
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    
    const result = generateICalEvent(mockEvent);
    
    const icalGenerator = require('ical-generator');
    const mockCalendar = icalGenerator();
    
    expect(icalGenerator).toHaveBeenCalled();
    expect(mockCalendar.createEvent).toHaveBeenCalled();
    expect(mockCalendar.toString).toHaveBeenCalled();
    
    expect(result).toBe('mock-ical-data');
  });

  it('should handle events without description', () => {
    const mockEvent: Event = {
      id: 'event-id',
      name: 'Test Event',
      description: '',
      date: '2023-12-31T00:00:00.000Z',
      imageUrl: 'https://example.com/event.jpg',
      organizerId: 'organizer-id',
      status: EventStatus.ACTIVE,
      createdAt: '2023-01-01T00:00:00.000Z',
    };
    
    const result = generateICalEvent(mockEvent);
    
    const icalGenerator = require('ical-generator');
    const mockCalendar = icalGenerator();
    const mockCreateEvent = mockCalendar.createEvent;
    
    expect(mockCreateEvent).toHaveBeenCalled();
    expect(result).toBe('mock-ical-data');
  });
});