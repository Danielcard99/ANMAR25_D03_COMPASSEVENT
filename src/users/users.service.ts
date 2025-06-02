import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { CreateUserDto } from './dto/create-user.dto';
import { v4 as uuid } from 'uuid';
import { User } from './entities/user.entity';
import { hashPassword } from './utils/hash.util';

@Injectable()
export class UsersService {
  private readonly ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION }),
  );

  constructor(private readonly s3Service: S3Service) {}

  async create(file: Express.Multer.File, data: CreateUserDto) {
    if (!file) {
      throw new BadRequestException('Profile image is mandatory');
    }

    const emailExists = await this.findByEmail(data.email);
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    const id = uuid();
    const createdAt = new Date().toISOString();
    const hashed = await hashPassword(data.password);
    const profileImageUrl = await this.s3Service.uploadImage(file);

    const user: User = {
      id,
      createdAt,
      profileImageUrl,
      name: data.name,
      email: data.email,
      password: hashed,
      phone: data.phone,
      role: data.role,
      isActive: true,
    };

    await this.ddb.send(
      new PutCommand({
        TableName: process.env.USERS_TABLE_NAME,
        Item: user,
      }),
    );

    return { user };
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const response = await this.ddb.send(
      new QueryCommand({
        TableName: process.env.USERS_TABLE_NAME,
        IndexName: 'emailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      }),
    );

    return response.Items?.[0] as User | undefined;
  }
}
