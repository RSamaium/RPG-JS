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
            kc.loadFromOptions(JSON.parse(process.env.KUBECONFIG as any))
        }
        this.k8sAgones = kc.makeApiClient(k8s.CustomObjectsApi)
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    }

    getGameServers(): Promise<any> {
        return this.k8sAgones.listNamespacedCustomObject('agones.dev', 'v1', this.namespace, 'gameservers')
            .then(res => res.body['items'])
    }
}