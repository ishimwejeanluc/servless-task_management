/**
 * Cleans an email or Cognito username to a readable format.
 * Example: jeanluc.ishimwe@amalitech.com -> jeanluc.ishimwe
 */
export const formatUsername = (name) => {
    if (!name) return 'Unknown';
    return name.split('@')[0];
};
