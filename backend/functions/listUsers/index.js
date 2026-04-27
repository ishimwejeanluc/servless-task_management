// Lambda handler to list users and their tasks
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

async function getAllUsers() {
  const params = {
    UserPoolId: USER_POOL_ID,
    Limit: 60 // adjust as needed
  };
  let users = [];
  let paginationToken;
  do {
    if (paginationToken) params.PaginationToken = paginationToken;
    const resp = await cognito.listUsers(params).promise();
    users = users.concat(resp.Users);
    paginationToken = resp.PaginationToken;
  } while (paginationToken);
  return users;
}

function getUserAttribute(user, attributeName) {
  return user.Attributes.find((a) => a.Name === attributeName)?.Value;
}

async function getAllTasksForTenant(tenantId) {
  const tasks = [];
  let lastEvaluatedKey;

  do {
    const params = {
      TableName: DYNAMODB_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':skPrefix': 'TASK#'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const result = await dynamodb.query(params).promise();
    tasks.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return tasks;
}

function isTaskAssignedToUser(task, identifiers) {
  if (!Array.isArray(task.assigneeIds) || task.assigneeIds.length === 0) {
    return false;
  }

  return task.assigneeIds.some((assigneeId) => identifiers.has(assigneeId));
}

exports.handler = async (event) => {
  try {
    const claims = event?.requestContext?.authorizer?.claims || {};
    const tenantId = claims['custom:tenantId'] || 'DEFAULT_TENANT';

    const users = await getAllUsers();
    const tenantTasks = await getAllTasksForTenant(tenantId);

    const usersWithTasks = await Promise.all(users.map(async (user) => {
      const username = user.Username;
      const sub = getUserAttribute(user, 'sub');
      const email = getUserAttribute(user, 'email');
      const identifiers = new Set([username, sub, email].filter(Boolean));

      const tasks = tenantTasks.filter((task) => isTaskAssignedToUser(task, identifiers));

      return {
        username,
        email,
        enabled: user.Enabled,
        status: user.UserStatus,
        tasks
      };
    }));
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ users: usersWithTasks })
    };
  } catch (err) {
    console.error('Error listing users:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: 'Failed to list users' })
    };
  }
};
