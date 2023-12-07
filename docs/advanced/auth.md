# `auth` Hook Documentation

## Overview

The `auth` hook in RPGJS is a authenticating players in your game. This document provides a comprehensive guide on how to implement and use the `auth` hook in the RPGJS project.

::: tip Info
Authentication in RPGJS is agnostic, in the sense that you can make it work with any authentication system. It's not tied to any database or third-party system. You're free to implement your own logic. This is useful for MMORPGs.
Below is an example with a JWT.
:::

## Implementation

In your `main/server.ts` file, follow these steps to set up the `auth` hook:

### Step 1: Import Required Modules

Import the necessary modules from `@rpgjs/server`:

```typescript
import { RpgServerEngineHooks, RpgServerEngine } from '@rpgjs/server';
```

### Step 2: Define the `auth` Hook

Implement the `auth` hook within the `RpgServerEngineHooks`:

```typescript
const server: RpgServerEngineHooks = {
    auth(server: RpgServerEngine, socket) {
        // Authentication logic goes here
    }
};

export default server;
```

#### Functionality

- The `auth` hook must return a `Promise<string>`, a `string`, or throw an error.
- If a `string` is returned, and the ID **public** matches, the player is considered connected.
- If the hook throws an error, it indicates that the player is not authenticated.

#### Parameters

- `server`: An instance of `RpgServerEngine`.
- `socket`: The `socket.io` object. You can access various request headers using `socket.handshake.headers`.

## Client-Side Error Handling

To handle errors on the client side, such as those thrown during the authentication process, implement the `onConnectError` hook in your `main/client.ts` file.

### Step 1: Import Required Modules

Import the necessary modules from `@rpgjs/client`:

```typescript
import { RpgClientEngineHooks, RpgClientEngine } from "@rpgjs/client";
```

### Step 2: Define the `onConnectError` Hook

Implement the `onConnectError` hook within the `RpgClientEngineHooks` to handle connection errors:

```typescript
const client: RpgClientEngineHooks = {
    onConnectError(engine: RpgClientEngine, err: Error) {
        console.log("Connection Error:", err.message);
    }
};

export default client;
```

## JWT Example

### Step 1: Import Required Modules

Import necessary modules from `@rpgjs/server` and any other required libraries (like `jsonwebtoken` for decoding JWT):

```typescript
import { RpgServerEngineHooks, RpgServerEngine } from '@rpgjs/server';
import jwt from 'jsonwebtoken';
```

> Install `jsonwebtoken` using `npm install jsonwebtoken`.

### Step 2: Define the `auth` Hook with JWT Logic

Implement the `auth` hook to handle JWT verification:

```typescript
const server: RpgServerEngineHooks = {
    auth(server: RpgServerEngine, socket) {
        const token = socket.handshake.headers.authorization;
        if (!token) {
            throw 'No token provided';
        }

        // Replace 'YOUR_SECRET_KEY' with your actual secret key used to sign the JWT
        const decoded = jwt.verify(token, 'YOUR_SECRET_KEY');
        if (!decoded) {
            throw 'Invalid token';
        }

        // Assuming 'decoded' contains a property 'id' representing the user ID
        return decoded.id;
    }
};

export default server;
```

::: tip Notes
- Ensure you replace `'YOUR_SECRET_KEY'` with the secret key you used to sign your JWTs.
- The JWT is expected to be in the `authorization` header of the socket handshake. Make sure this aligns with how your client is sending the token.
- The example assumes the JWT contains an `id` field representing the user ID. Adjust this according to your JWT structure.
- Proper error handling is crucial to inform the client about authentication failures.
:::