import { WagmiConfig } from "wagmi";
import { chains, wagmiConfig } from "./config";
import { RainbowKitAuthenticationProvider, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { authenticationAdapter } from "./adapter";
import { useStore } from '@nanostores/react'
import { authStatus } from "../store/auth";

export function Web3Wrapper({ children }) {
    const $authStatus = useStore(authStatus);

    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitAuthenticationProvider
                adapter={authenticationAdapter}
                status={$authStatus}
            >
                <RainbowKitProvider chains={chains}  locale="en">
                    {children}
                </RainbowKitProvider>
            </RainbowKitAuthenticationProvider>
        </WagmiConfig>
    )
}