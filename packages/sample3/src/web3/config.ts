import '@rainbow-me/rainbowkit/styles.css';

import {
    getDefaultWallets
} from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import {
    polygonMumbai,
} from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

export const { chains, publicClient } = configureChains(
    [polygonMumbai],
    [
        publicProvider()
    ]
);

const { connectors } = getDefaultWallets({
    appName: 'My RainbowKit App',
    projectId: 'YOUR_PROJECT_ID',
    chains
});

export const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
})