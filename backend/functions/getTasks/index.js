const { requireRole } = require('../../shared/middleware/auth');
const logger = require('../../shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

const getTasksHandler = async (event) => {
    logger.info('GetTasks invoked', { userId: event.user.id, groups: event.user.groups, tenantId: event.user.tenantId });

    try {
        const isAdmin = event.user.groups.includes('Admin');
        let commandInput;

        // Role-based filtering logic
        // Decision: We query Dynamo differently depending on who the authenticated caller is
        if (isAdmin) {
            // Admins fetch ALL tasks belonging to their tenant, bypassing assigned limitations
            // Trade-off: Could result in a slow query if there are 1M+ tasks per tenant. 
            // In a real-world scenario, we'd add 'Limit' and 'ExclusiveStartKey' pagination.
            commandInput = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': `TENANT#${event.user.tenantId}`,
                    ':skPrefix': 'TASK#'
                },
                // Fetch up to 100 items by default for safety
                Limit: 100
            };
        } else {
            // Members only see tasks specifically assigned to them
            // They query the Global Secondary Index (GSI) based on their identity
            commandInput = {
                TableName: TABLE_NAME,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': `ASSIGNEE#${event.user.id}` // GSI Partition mapping to user uuid
                }
            };
        }

        const data = await ddbDocClient.send(new QueryCommand(commandInput));

        logger.info('Tasks retrieved successfully', { count: data.Items.length });
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data.Items)
        };

    } catch (error) {
        logger.error('DynamoDB query failed for getTasks', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to retrieve tasks from database' })
        };
    }
};

// Both Admin and Member can hit this API endpoint, but the Handler filters their view implicitly.
exports.handler = requireRole(['Admin', 'Member'])(getTasksHandler);
