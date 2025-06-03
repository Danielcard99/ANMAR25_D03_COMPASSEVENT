import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { CreateEventDto } from './dto/create-event.dto';
import { v4 as uuid } from 'uuid';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  private readonly ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION }),
  );

  constructor(private readonly s3Service: S3Service) {}

  async create(
    data: CreateEventDto,
    file: Express.Multer.File,
    organizerId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Event image is mandatory');
    }

    const exists = await this.checkIfEventNameExists(data.name);
    if (exists) {
      throw new BadRequestException('Event name already exists');
    }

    const imageUrl = await this.s3Service.uploadImage(file, 'events');

    if (!imageUrl) {
      throw new InternalServerErrorException('Failed to upload image to S3');
    }

    const eventId = uuid();
    const newEvent = {
      id: eventId,
      name: data.name,
      description: data.description,
      date: data.date,
      imageUrl,
      organizerId,
      createdAt: new Date().toISOString(),
    };

    await this.ddb.send(
      new PutCommand({
        TableName: process.env.EVENTS_TABLE_NAME,
        Item: newEvent,
      }),
    );

    return newEvent;
  }

  async update(
    eventId: string,
    data: UpdateEventDto,
    requesterId: string,
    isAdmin: boolean,
  ) {
    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('Request body cannot be empty');
    }

    const { Item: event } = await this.ddb.send(
      new GetCommand({
        TableName: process.env.EVENTS_TABLE_NAME,
        Key: { id: eventId },
      }),
    );

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isOwner = event.organizerId === requesterId;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You cannot edit this event');
    }

    if (data.name && data.name !== event.name) {
      const nameExists = await this.checkIfEventNameExists(data.name);
      if (nameExists) {
        throw new BadRequestException('Event name already exists');
      }
    }

    const updatedEvent = {
      ...event,
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.date && { date: data.date }),
      ...(isAdmin && data.organizerId && { organizerId: data.organizerId }),
      updatedAt: new Date().toISOString(),
    };

    await this.ddb.send(
      new PutCommand({
        TableName: process.env.EVENTS_TABLE_NAME,
        Item: updatedEvent,
      }),
    );

    return updatedEvent;
  }

  async checkIfEventNameExists(name: string): Promise<boolean> {
    const response = await this.ddb.send(
      new QueryCommand({
        TableName: process.env.EVENTS_TABLE_NAME,
        IndexName: 'eventName-index',
        KeyConditionExpression: '#name = :name',
        ExpressionAttributeNames: {
          '#name': 'name',
        },
        ExpressionAttributeValues: {
          ':name': name,
        },
      }),
    );

    return response.Count !== undefined && response.Count > 0;
  }
}
