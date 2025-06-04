import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserRole } from '../users/dto/create-user.dto';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const usersService = appContext.get(UsersService);

  const defaultUserName = process.env.DEFAULT_USER_NAME;
  const defaultUserEmail = process.env.DEFAULT_USER_EMAIL;
  const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD;

  if (!defaultUserName || !defaultUserEmail || !defaultUserPassword) {
    console.error('Default user environment variables are not set.');
    await appContext.close();
    process.exit(1);
  }

  const existingUser = await usersService.findByEmail(defaultUserEmail);

  if (existingUser) {
    console.log(`User with email ${defaultUserEmail} already exists.`);
    await appContext.close();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(defaultUserPassword, 10);

  const userToCreate: CreateUserDto = {
    name: defaultUserName,
    email: defaultUserEmail,
    password: hashedPassword,
    phone: '71555555555',
    role: UserRole.ADMIN,
  };

  await usersService.createUserWithoutImage(userToCreate);

  console.log(`Default user ${defaultUserEmail} created successfully.`);

  await appContext.close();
  process.exit(0);
}

bootstrap();
