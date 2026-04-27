const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognito = new CognitoIdentityProviderClient({});

const ADMIN_USERNAME = process.env.BOOTSTRAP_ADMIN_USERNAME || 'jeanluc.ishimwe@amalitech.com';
const ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL || 'jeanluc.ishimwe@amalitech.com';
const MEMBER_GROUP_NAME = process.env.MEMBER_GROUP_NAME || 'Member';

exports.handler = async (event) => {
  const userPoolId = event.userPoolId;
  const username = event.userName;
  const email = event.request?.userAttributes?.email;

  if (!userPoolId || !username) {
    return event;
  }

  if (username === ADMIN_USERNAME || email === ADMIN_EMAIL) {
    return event;
  }

  await cognito.send(new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: username,
    GroupName: MEMBER_GROUP_NAME
  }));

  return event;
};
