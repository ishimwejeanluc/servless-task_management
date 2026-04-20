/**
 * UNIT TEST: Create Task Lambda
 * 
 * Purpose: Validate input sanitation, role injection, and correct 
 * DynamoDB SDK interactions without hitting real AWS environments.
 */

const { handler } = require('../functions/createTask/index');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Create Task Lambda', () => {
    beforeEach(() => {
        ddbMock.reset();
        process.env.DYNAMODB_TABLE_NAME = 'TestTable';
    });

    // Mock API Gateway Event structure populated with our custom Middleware Auth logic
    const buildEvent = (body, groups = ['Admin'], tenantId = 'TENANT123') => ({
        body: JSON.stringify(body),
        requestContext: {
            authorizer: {
                claims: {
                    sub: 'admin-user-001',
                    email: 'admin@amalitech.com',
                    'cognito:groups': groups,
                    'custom:tenantId': tenantId
                }
            }
        }
    });

    test('should successfully create a task when user is Admin', async () => {
        ddbMock.on(PutCommand).resolves({});

        const event = buildEvent({
            title: 'Fix Database',
            description: 'Apply index optimizations',
            assigneeId: 'user-005'
        });

        const response = await handler(event, {});
        
        expect(response.statusCode).toBe(201);
        const responseBody = JSON.parse(response.body);
        
        expect(responseBody.title).toBe('Fix Database');
        expect(responseBody.PK).toBe('TENANT#TENANT123'); // Confirms Multitenant Logic
        expect(responseBody.GSI1PK).toBe('ASSIGNEE#user-005'); // Confirms assignment mapping
        
        // Verify we passed the correct Idempotency conditions to AWS
        const ddbCalls = ddbMock.calls();
        expect(ddbCalls.length).toBe(1);
        expect(ddbCalls[0].args[0].input.ConditionExpression).toBe('attribute_not_exists(PK) AND attribute_not_exists(SK)');
    });

    test('should reject request when title is missing (Input Validation)', async () => {
        const event = buildEvent({
            description: 'Missing title request'
        });

        const response = await handler(event, {});
        
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toContain('Invalid or missing title');
        
        // Ensure database wasn't called
        expect(ddbMock.calls().length).toBe(0);
    });

    test('should reject request when user is only a Member (RBAC Test)', async () => {
        const event = buildEvent({ title: 'Hack Database' }, ['Member']);

        const response = await handler(event, {});
        
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).error).toBe('Forbidden: Insufficient privileges');
        
        expect(ddbMock.calls().length).toBe(0);
    });
});
