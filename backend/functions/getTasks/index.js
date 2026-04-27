const { requireRole } = require('./shared/middleware/auth');
const logger = require('./shared/utils/logger');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

const getTasksHandler = async (event) => {
    logger.info('GetTasks invoked', { userId: event.user.id, groups: event.user.groups, tenantId: event.user.tenantId });

    try {
        const isAdmin = event.user.groups.includes('Admin');
        let commandInput;
        let data;

        if (isAdmin) {
            // Admin: fetch all tasks for tenant
            commandInput = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': `TENANT#${event.user.tenantId}`,
                    ':skPrefix': 'TASK#'
                },
                Limit: 100
            };
            data = await ddbDocClient.send(new QueryCommand(commandInput));
        } else {
            // Member: only tasks assigned to them
            // Note: the current table schema does not expose a dedicated assignee GSI,
            // so we query tenant tasks and filter by assigneeIds membership.
            const identityCandidates = [event.user.id, event.user.username, event.user.email].filter(Boolean);
            const filterParts = [];
            const exprValues = {
                ':pk': `TENANT#${event.user.tenantId}`,
                ':skPrefix': 'TASK#'
            };

            identityCandidates.forEach((value, index) => {
                const key = `:id${index}`;
                filterParts.push(`contains(assigneeIds, ${key})`);
                exprValues[key] = value;
            });

            commandInput = {
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                FilterExpression: filterParts.join(' OR '),
                ExpressionAttributeValues: exprValues,
                Limit: 100
            };
            data = await ddbDocClient.send(new QueryCommand(commandInput));
        }

        logger.info('Tasks retrieved successfully', { count: data.Items.length });
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify(data.Items)
        };

    } catch (error) {
        logger.error('DynamoDB query failed for getTasks', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify({ error: 'Failed to retrieve tasks from database' })
        };
    }
};

exports.handler = requireRole(['Admin', 'Member'])(getTasksHandler);
