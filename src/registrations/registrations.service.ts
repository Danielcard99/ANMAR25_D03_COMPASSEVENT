import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { EventsService } from '../events/events.service';
import { v4 as uuid } from 'uuid';
import { RegistrationStatus } from './enums/registration-status.enum';
import { Registration } from './entities/registration.entity';
import { FilterRegistrationDto } from './dto/filter-registration.dto';

@Injectable()
export class RegistrationsService {
  private readonly ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION }),
  );

  constructor(private readonly eventService: EventsService) {}

  async createRegistration(participantId: string, data: CreateRegistrationDto) {
    const event = await this.eventService.findOne(data.eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'active') {
      throw new BadRequestException('Event is not active');
    }

    if (typeof event.date === 'string' && new Date(event.date) < new Date()) {
      throw new BadRequestException('Event has already occurred');
    }

    const existing = await this.checkExistingRegistration(
      participantId,
      data.eventId,
    );

    if (existing && existing.status === 'active') {
      throw new BadRequestException('Registration already exists');
    }

    const newRegistration: Registration = {
      id: uuid(),
      participantId,
      eventId: data.eventId,
      status: RegistrationStatus.ACTIVE,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.ddb.send(
        new PutCommand({
          TableName: process.env.REGISTRATIONS_TABLE_NAME,
          Item: newRegistration,
          ConditionExpression: 'attribute_not_exists(id)',
        }),
      );
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Erro ao criar inscrição');
    }

    return newRegistration;
  }

  async listRegistrations(
    participantId: string,
    filter: FilterRegistrationDto,
  ) {
    const { page = 1, limit = 10 } = filter;

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Invalid page or limit');
    }

    try {
      const response = await this.ddb.send(
        new QueryCommand({
          TableName: process.env.REGISTRATIONS_TABLE_NAME,
          IndexName: 'participantId-eventId-index',
          KeyConditionExpression: 'participantId = :participantId',
          ExpressionAttributeValues: {
            ':participantId': participantId,
          },
        }),
      );

      const items = response.Items || [];

      const start = (page - 1) * limit;
      const paginatedItems = items.slice(start, start + limit);

      return {
        total: items.length,
        page,
        limit,
        data: paginatedItems,
      };
    } catch (error) {
      console.error('Error listing registrations:', error);
      throw new InternalServerErrorException('Failed to list registrations');
    }
  }

  private async checkExistingRegistration(
    participantId: string,
    eventId: string,
  ) {
    const response = await this.ddb.send(
      new QueryCommand({
        TableName: process.env.REGISTRATIONS_TABLE_NAME,
        IndexName: 'participantId-eventId-index',
        KeyConditionExpression:
          'participantId = :participantId and eventId = :eventId',
        ExpressionAttributeValues: {
          ':participantId': participantId,
          ':eventId': eventId,
        },
      }),
    );

    return response.Items?.[0] ?? null;
  }
}
