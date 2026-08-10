# Passcode Auth Specification

## Purpose
Enforces single-owner passcode authentication to protect application routes and endpoints when deployed.

## Requirements

### Requirement: Single-Owner Passcode Verification
The system MUST restrict access to all application routes unless a valid passcode session cookie is present.

#### Scenario: Successful Passcode Verification
- GIVEN the user provides a passcode matching `APP_PASSWORD`
- WHEN the user submits the login form
- THEN the system MUST issue an HTTPOnly session cookie
- AND redirect the user to the main bookmark dashboard

#### Scenario: Invalid Passcode Submission
- GIVEN the user provides a passcode that does NOT match `APP_PASSWORD`
- WHEN the user submits the login form
- THEN the system MUST reject the request with a 401 Unauthorized status
- AND display an invalid passcode error message

#### Scenario: Unauthenticated Protected Route Access
- GIVEN no valid passcode session cookie is set
- WHEN a user requests a protected route
- THEN the system MUST redirect the user to `/login`
