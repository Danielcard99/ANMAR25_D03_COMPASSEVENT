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
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { CreateEventDto } from './dto/create-event.dto';
import { v4 as uuid } from 'uuid';

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
