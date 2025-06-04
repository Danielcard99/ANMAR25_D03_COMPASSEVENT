import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class InfraStack extends Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly registrationsTable: dynamodb.Table;
  public readonly profileBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'emailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'emailConfirmationTokenIndex',
      partitionKey: {
        name: 'emailConfirmationToken',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'events',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.eventsTable.addGlobalSecondaryIndex({
      indexName: 'eventName-index',
      partitionKey: { name: 'name', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.registrationsTable = new dynamodb.Table(this, 'RegistrationsTable', {
      tableName: 'registrations',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    this.registrationsTable.addGlobalSecondaryIndex({
      indexName: 'participantId-eventId-index',
      partitionKey: {
        name: 'participantId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    this.profileBucket = new s3.Bucket(this, 'ProfileBucket', {
      bucketName: 'compass-reservation-profile',
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole',
      ),
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      }),
    );

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
        resources: [
          this.profileBucket.bucketArn,
          `${this.profileBucket.bucketArn}/*`,
        ],
      }),
    );

    const resizeLambda = new lambda.Function(this, 'ResizeProfileImageLambda', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
    });

    this.profileBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(resizeLambda),
      { prefix: 'profiles/' },
    );
  }
}
