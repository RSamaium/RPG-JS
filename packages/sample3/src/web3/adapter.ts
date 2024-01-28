import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { setAuthStatus } from '../store/auth';

const SERVER_URL = import.meta.env.VITE_SERVER_URL + '/players/web3'

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const response = await fetch(SERVER_URL + '/nonce');
    return await response.text();
  },

  createMessage: ({ nonce, address, chainId }) => {
    return new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in with Ethereum to the app.',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
    });
  },

  getMessageBody: ({ message }) => {
    return message.prepareMessage();
  },

  verify: async ({ message, signature }) => {
    const verifyRes = await fetch(SERVER_URL + '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature }),
      credentials: "include"
    });

    setAuthStatus(verifyRes.ok ? 'authenticated' : 'unauthenticated');

    return Boolean(verifyRes.ok);
  },

  signOut: async () => {
    await fetch('/api/logout');
  },
});