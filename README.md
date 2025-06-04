# CompassEvent - Event Management System

## About the Project

CompassEvent is a complete application for event management, allowing organizers to create and manage events, while participants can register and track their registrations. The system is built with NestJS in the backend and uses AWS services for data storage and image processing.

## Technologies Used

### Backend
- **NestJS**: Node.js framework for building efficient and scalable server-side applications
- **TypeScript**: Typed programming language that compiles to JavaScript
- **Passport/JWT**: Token-based authentication and authorization
- **AWS SDK**: Integration with AWS services
- **Nodemailer**: Email sending
- **ical-generator**: iCal calendar generation for events
- **Swagger**: API documentation

### Infrastructure (AWS)
- **DynamoDB**: NoSQL database for storing users, events, and registrations
- **S3**: Storage for profile and event images
- **Lambda**: Image processing (resizing)
- **AWS CDK**: Infrastructure as code for AWS resource provisioning

## Main Features

### Users
- User registration and authentication
- Email confirmation
- Profiles with different access levels (administrator, organizer, participant)
- Profile image upload with automatic resizing

### Events
- Creation and management of events
- Image upload for events
- Event filters and search
- Different event statuses (active, canceled, etc.)

### Registrations
- Event registration
- Registration status management (active, canceled)
- Filters for viewing registrations

### Email
- Email confirmation sending
- Event notifications
- iCal calendar generation for events

## Project Structure

```
├── src/                      # Application source code
│   ├── auth/                 # Authentication module
│   ├── common/               # Common decorators, guards, and interfaces
│   ├── config/               # Application configurations
│   ├── events/               # Events module
│   ├── mail/                 # Email sending module
│   ├── registrations/        # Registrations module
│   ├── s3/                   # Service for AWS S3 interaction
│   ├── seed/                 # Data seed scripts
│   └── users/                # Users module
├── infra/                    # AWS CDK infrastructure
│   ├── bin/                  # CDK entry point
│   ├── lib/                  # Stack definitions
│   └── lambda/               # Lambda function code
├── test/                     # e2e tests
└── coverage/                 # Test coverage reports
```

## Data Models

### User
- id: string
- name: string
- email: string
- password: string (hash)
- phone: string
- role: UserRole (ADMIN, ORGANIZER, PARTICIPANT)
- profileImageUrl: string
- createdAt: string
- updatedAt: string
- isActive: boolean
- emailConfirmed: boolean
- emailConfirmationToken: string

### Event
- id: string
- name: string
- description: string
- date: string
- imageUrl: string
- organizerId: string
- createdAt: string
- status: EventStatus (ACTIVE, CANCELED)

### Registration
- id: string
- eventId: string
- participantId: string
- status: RegistrationStatus (ACTIVE, CANCELED)
- createdAt: string
- updatedAt: string

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- AWS Account (for infrastructure deployment)
- Configured AWS CLI

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/compassevent.git
cd compassevent
```

2. Install dependencies
```bash
npm install
```

3. Configure your environment variables
   - Copy the .env.example file to .env
   ```bash
   cp .env.example .env
   ```
   - Edit the .env file with your specific configuration values

4. Run the seed to create the default admin user
```bash
npm run seed
```

5. Start the application in development mode
```bash
npm run start:dev
```

### AWS Infrastructure Deployment

1. Navigate to the infrastructure folder
```bash
cd infra
```

2. Install CDK dependencies
```bash
npm install
```

3. Deploy the infrastructure
```bash
npx cdk deploy
```

## API Documentation

The API documentation is available through Swagger UI. After starting the application, access:

```
http://localhost:3000/api
```

## Tests

### Running unit tests
```bash
npm run test
```

### Running tests with coverage
```bash
npm run test:cov
```

### Running end-to-end tests
```bash
npm run test:e2e
```

## License

This project is licensed under the [UNLICENSED] license.

## Author

Developed as part of the ANMAR25_D03_COMPASSEVENT project.