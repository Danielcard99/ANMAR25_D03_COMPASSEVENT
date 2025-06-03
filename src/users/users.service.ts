import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { CreateUserDto } from './dto/create-user.dto';
import { v4 as uuid } from 'uuid';
import { User } from './entities/user.entity';
import { hashPassword } from './utils/hash.util';
import { UpdatePatchUserDto } from './dto/update-user.dto';
import { FilterUsersDto } from './dto/filter-users.dto';

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

  async update(data: UpdatePatchUserDto, userId: string) {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Request body is empty');
    }

    const result = await this.ddb.send(
      new GetCommand({
        TableName: process.env.USERS_TABLE_NAME,
        Key: { id: userId },
      }),
    );

    const existingUser = result.Item as User;

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (data.email && data.email !== existingUser.email) {
      const userWithSameEmail = await this.findByEmail(data.email);
      if (userWithSameEmail && userWithSameEmail.id !== userId) {
        throw new ConflictException('Email already exists');
      }
    }

    let password = existingUser.password;
    if (data.password) {
      password = await hashPassword(data.password);
    }

    const updatedUser: User = {
      ...existingUser,
      ...data,
      password,
      updatedAt: new Date().toISOString(),
    };

    await this.ddb.send(
      new PutCommand({
        TableName: process.env.USERS_TABLE_NAME,
        Item: updatedUser,
      }),
    );

    return { user: updatedUser };
  }

  async findAll(filter: FilterUsersDto) {
    const { name, email, role, page = 1, limit = 10 } = filter;

    const result = await this.ddb.send(
      new ScanCommand({
        TableName: process.env.USERS_TABLE_NAME,
      }),
    );

    const allUsers = result.Items as User[];

    const filteredUsers = allUsers.filter((user) => {
      const nameMatch = name
        ? user.name.toLowerCase().includes(name.toLowerCase())
        : true;
      const emailMatch = email
        ? user.email.toLowerCase().includes(email.toLowerCase())
        : true;
      const roleMatch = role ? user.role === role : true;

      return nameMatch && emailMatch && roleMatch;
    });

    const paginated = filteredUsers.slice((page - 1) * limit, page * limit);
    const withoutPassword = paginated.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ password, ...rest }) => rest,
    );

    return {
      total: filteredUsers.length,
      page,
      limit,
      data: withoutPassword,
    };
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
