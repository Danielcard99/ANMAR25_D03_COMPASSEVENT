import { generateICalEvent } from './ical-generator.util';
import { Event } from '../../events/entities/event.entity';
import { EventStatus } from '../../events/dto/create-event.dto';
import { createMockEvent } from '../../common/testing/mock-factory';

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
  
  const mockIcal = jest.fn().mockReturnValue(mockCalendar);
  mockIcal.createEvent = jest.fn().mockReturnValue(mockEvent);
  mockIcal.createCalendar = jest.fn().mockReturnValue(mockCalendar);
  
  return mockIcal;
});

describe('generateICalEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate iCal event data', () => {
    const mockEvent = createMockEvent();
    
    const result = generateICalEvent(mockEvent);
    
    const icalGenerator = require('ical-generator');
    
    expect(icalGenerator).toHaveBeenCalled();
    expect(icalGenerator().createEvent).toHaveBeenCalled();
    expect(icalGenerator().toString).toHaveBeenCalled();
    
    expect(result).toBe('mock-ical-data');
  });

  it('should handle events without description', () => {
    const mockEvent = createMockEvent({ description: '' });
    
    const result = generateICalEvent(mockEvent);
    
    const icalGenerator = require('ical-generator');
    
    expect(icalGenerator().createEvent).toHaveBeenCalled();
    expect(result).toBe('mock-ical-data');
  });
});