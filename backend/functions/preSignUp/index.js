/**
 * Cognito Pre Sign-up Trigger
 * 
 * Purpose: Restrict registration to allowed corporate domains.
 * Security Boundary: Fails the sign-up transaction immediately if the user email
 * does not match allowed domains, preventing unauthorized entities from existing
 * within the User Pool entirely.
 */

const ALLOWED_DOMAINS = ['amalitech.com', 'amalitechtraining.org', 'gmail.com'];

module.exports.handler = async (event) => {
    console.log(`Received Pre Sign-up Event: ${JSON.stringify(event)}`);

    const email = event.request.userAttributes.email;
    if (!email) {
        throw new Error('Email attribute is missing');
    }

    const domain = email.split('@')[1];

    if (!ALLOWED_DOMAINS.includes(domain)) {
        console.error(`Rejected registration for unauthorized domain: ${domain}`);
        // Throwing an error stops the Cognito sign-up process
        throw new Error(`Unauthorized email domain: @${domain}. Only corporate domains are allowed.`);
    }


    event.response.autoConfirmUser = false; 
    event.response.autoVerifyEmail = false; 

    // Return the modified (or unmodified) event back to Cognito to proceed
    return event;
};
