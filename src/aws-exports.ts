// src/aws-exports.ts
import type { ResourcesConfig } from 'aws-amplify';

const awsconfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string,
      // identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID as string, // optional
      // signUpVerificationMethod: 'code', // optional
    },
  },
  // region is optional for Auth; it can be inferred from the pool ID.
  // If you want to be explicit across categories, you can add:
  // region: import.meta.env.VITE_COGNITO_REGION as string,
};

export default awsconfig;
