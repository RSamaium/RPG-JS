import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AuthButton() {
    const { isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected) {
        return <button onClick={disconnect}>Disconnect</button>;
    } else {
        return <ConnectButton />;
    }
}