# Authentification Integrating Web3 into RPGJS

::: warning
The module is not complete. Further developments are in progress
:::

## Overview

By following this guide, you'll be able to connect to a digital wallet like MetaMask and implement Web3 capabilities both on the client and server sides.

### Prerequisites
- Basic knowledge of RPGJS
- Familiarity with Web3 concepts
- MetaMask or similar digital wallet installed

## Frontend Integration

### Customization
You are free to customize the frontend as per your needs. However, an example is provided here for guidance.

### Example:

https://github.com/RSamaium/RPG-JS/tree/v4/packages/sample3

## Server-Side Integration

### Installation

Install the `@rpgjs/web3` plugin:

```bash
npx rpgjs add @rpgjs/web3
```

Ensure that the `@rpgjs/web3` module is the first in the list:

Example:
```toml
modules = [
    '@rpgjs/web3',
    './main',
    '@rpgjs/default-gui',
]
```

### Setting up Configuration

Add the following configurations:

```toml
[auth]
    jwtSecret = 'mysecret'

[express.cors]
    origin = '$ENV:VITE_GAME_URL'
    credentials = true

[express.socketIo.cors]
    origin = '$ENV:VITE_GAME_URL'
    credentials = true

[socketIoClient]
    withCredentials = true
```

## Usage

### Endpoints
The integration introduces two endpoints:

- `SERVER_URL + '/nonce'`
- `SERVER_URL + '/verify'`

These endpoints help in creating an HTTP-only cookie containing a JWT (JSON Web Token).

### API Utilization
This integration extends the `RpgPlayer` type with Web3 functionalities:

- `player.web3.walletAddress`: Allows access to the player's wallet address.
