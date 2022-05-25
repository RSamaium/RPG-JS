import * as k8s from '@kubernetes/client-node'

const KUBECONFIG = process.env.KUBECONFIG

if (!KUBECONFIG) {
    console.error('Please set the environment variable KUBECONFIG')
    process.exit(0)
}
 
export class AgonesApi {
    k8sAgones: k8s.CustomObjectsApi
    k8sApi: k8s.CoreV1Api
    namespace: string = 'default'

    constructor() {
        const kc = new k8s.KubeConfig()
        if (KUBECONFIG?.endsWith('yml') || KUBECONFIG?.endsWith('yaml')) {
            kc.loadFromFile(KUBECONFIG)
        }
        else {
            const config = JSON.parse(KUBECONFIG as any)
            const { clusters, users } = config
            const { cluster } = clusters[0]
            const { user } = users[0]
            const clusterConfig = {
                caData: cluster['certificate-authority-data'],
                caFile: cluster['certificate-authority'],
                name: clusters[0].name,
                server: cluster.server,
                skipTLSVerify: false
              }
            const userConfig = {
                keyData: user['client-key-data'],
                keyFile: user['client-key'],
                certData: user['client-certificate-data'],
                certFile: user['client-certificate'],
                name: users[0].name,
                token: user.token,
                username: user.username,
                password: user.password,
                exec: user.exec,
                authProvider: user['auth-provider']
            }
            kc.loadFromClusterAndUser(clusterConfig, userConfig)
        }
        this.k8sAgones = kc.makeApiClient(k8s.CustomObjectsApi)
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    }

    getGameServers(): Promise<any> {
        return this.k8sAgones.listNamespacedCustomObject('agones.dev', 'v1', this.namespace, 'gameservers')
            .then(res => res.body['items'])
    }
}