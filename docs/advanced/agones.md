# Horizontal scaling of the game 

::: warning
This module still has some limitations, developments are not finished
:::

## What is the problem?

When there are many worlds in the game, the CPU and RAM will be heavily used. At some point, the server will not keep up and will slow down the game

So you have to do horizontal scaling but, it's more complex for a game because

1. You must not lose states on a server
2. Keep the states if you switch from one server to another
3. Do not stop an instance if it contains players
4. Group the players of a map on the same server
5. Do not use a classic load balancer because it will increase latency

## Stack

A module has been created to manage the scaling, it uses for that:

1. [Kubernetes](https://kubernetes.io) & [Agones](https://agones.dev/site/)
2. Redis

## Architecture

![diagram](/assets/agones-diagram.jpg)

1. First, the client makes a request with a service called MatchMaker Service. The purpose of this service is to retrieve an IP address and a port from a server
2. The client connecting to the server makes the first connection. When the player arrives on the map, then this is what happens (and this at each change of map)
    a. Player states (positions, objects, money amount, etc.) are stored in Redis
    b. The Matchmaker service is called to retrieve the instance that handles the requested map
    c. The server sends the new IP and port to the client, and the client connects to the new instance and retrieves the states stored in Redis

Note the following points:

- If the map has never been loaded, an instance is created and the game server is allocated (i.e. it cannot be deleted by scaling)
- If the map has already been loaded, then the player will go to the existing instance
- If the player leaves the map, then the map is deleted from the RAM of the instance. If there are more people on the instance then the instance is left

## Limitation

1. Even if it is scalable, you are limited by a number of players per map (= instance). It can have an side effect. For example, if you think (based on the server capacity) that the limit of a physical server is 1000 players. If on the instance we have 200 players, then the system thinks that the server is not fully loaded, it can have a second instance with 100 players. but here it is - for some reason the first instance contains the 1000 players so the server will contain a total of 1200 players. There might be some disturbances
2. All dynamic elements and especially maps will not work because if server creates a dynamic map, it will be anchored to server. We will lose the notion of scaling in this case. This is a point that is being considered
3. If you set a custom property on the player, you must pass through the [props parameter](/classes/player.html#props). This way, the state will be kept in memory when the player switches from one server to another

## Above all

You must know Docker and docker must be installed on your server

1. [Install Kubernetes and Agones](https://agones.dev/site/docs/installation/)
2. [Install Redis](https://redis.io/docs/getting-started/)
3. Install Matchmaker Service:

Locally:

`docker run -e KUBECONFIG='<JSON CONFIG>' -e SECRET_TOKEN=<RANDOM SECRET TOKEN> -v /path/to/.minikube:/path/to/.minikube --net=host --name rpgjs-matchmaker rpgjs/agones-matchmaker:beta.1`

> Note that KUBECONFIG is a JSON format and not YAML. 
> The SECRET_TOKEN allows your game to interact with the matchmaker. You have to generate a token which must not be public ! (Example of a token generation:: `openssl rand -base64 16`)

::: tip In production
In production, the command is different, you do not use the network mode in host and it should not be necessary to use a volume

`docker run -e KUBECONFIG='<JSON CONFIG>' -e SECRET_TOKEN=<RANDOM SECRET TOKEN> --name rpgjs-matchmaker rpgjs/agones-matchmaker:beta.1`
:::

>  By default, the webservcie runs on port 3010 (you can change the port by specifying the PORT environment variable)

## Install Agones Plugin in your game

Set up in your game:

`npx rpgjs add @rpgjs/agones`

Next, add in `rpg.toml`

```ts
matchMakerService = '<URL TO MATCHMAKER SERVICE>'
```

> From now on, if you launch the game locally, you must indicate the secret token and the url of match maker service
> `MATCH_MAKER_SECRET_TOKEN=<SECRET TOKEN> MATCH_MAKER_URL=<URL TO MATCHMAKER SERVICE> REDIS_URL=<URL (is optional)> npm run dev`

### Build Image of your game

1. [Build the image of your game](/guide/production.html#build-with-docker)
2. Push it on a registry

## Deployment of a game server

`fleet.yml` file:

```yml
apiVersion: "agones.dev/v1"
kind: Fleet
metadata:
  name: rpg-game-server
spec:
  replicas: 2
  template:
    spec:
      ports:
      - name: default
        portPolicy: Dynamic
        containerPort: 3000
        protocol: TCP
      health:
        initialDelaySeconds: 30
        periodSeconds: 25
      template:
        spec:
          containers:
          - name: rpg
            image: $(IMAGE)
            env:
              - name: MATCH_MAKER_URL
                value: "$(URL)"
              - name: MATCH_MAKER_SECRET_TOKEN
                value: "$(SECRET_TOKEN)"
              - name: REDIS_URL
                value: "$(REDIS_URL)"
```

Put the 
- The url to the image in the registry
- match maker url et le secret token
- and the url to redis

> in production, use secrets

Then launch the fleet:

`kubectl apply -f fleet.yml`

## SSL

The game server may need an SSL certificate.

The solution is to use Cert-Manager with a DNS01 resolver to obtain a free SSL certificate from Let's Encrypt.

1. Install [Cert-Manager](https://cert-manager.io/docs/installation/)

2. Next, create a certificate (the resolver depends on the platform chosen), but here's an example using Scaleway:

  a. Follow: https://github.com/scaleway/cert-manager-webhook-scaleway

  b. Then, create the certificate

  ```yml
  apiVersion: cert-manager.io/v1
  kind: Issuer
  metadata:
    name: letsencrypt
  spec:
    acme:
      email: <EMAIL>
      server: https://acme-v02.api.letsencrypt.org/directory
      privateKeySecretRef:
        name: letsencrypt-secret
      solvers:
      - dns01:
          webhook:
            groupName: acme.scaleway.com
            solverName: scaleway
            config:
              accessKeySecretRef:
                key: SCW_ACCESS_KEY
                name: scaleway-secret
              secretKeySecretRef:
                key: SCW_SECRET_KEY
                name: scaleway-secret
  ```

> Note that the email address is required to generate the certificate.

3. When you launch a Game Server, you also need to point a DNS to the IP. For example: `game.example.com`. You need to create the DNS before requesting the certificate, otherwise it won't work. So you need to build a logic on your side that  :
   1. reads game servers with the kubernetes API
   2. retrieves an IP and adds it to the DNS configuration
4. Then ask for a certificate:

```yml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: game-server-certificate
spec:
  secretName: game-server-tls
  dnsNames:
    - "game.example.com"
  issuerRef:
    name: letsencrypt
```

5. Finally, the certificate and key must be sent to the game server. For this, you must use a volume:

```yml
apiVersion: "agones.dev/v1"
kind: Fleet
metadata:
  name: rpg-game-server
spec:
  replicas: 2
  template:
    spec:
      ports:
      - name: default
        portPolicy: Dynamic
        containerPort: 3000
        protocol: TCP
      health:
        initialDelaySeconds: 30
        periodSeconds: 25
      template:
        spec:
          containers:
          - name: rpg
            image: $(IMAGE)
            volumeMounts:
            - name: cert-volume
              mountPath: /app/certs
            env:
              - name: MATCH_MAKER_URL
                value: "$(URL)"
              - name: MATCH_MAKER_SECRET_TOKEN
                value: "$(SECRET_TOKEN)"
              - name: REDIS_URL
                value: "$(REDIS_URL)"
          volumes:
            - name: cert-volume
              secret:
                secretName: game-server-tls
```