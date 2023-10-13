# Debuging server

## Extend package.json

To debug server we need to add inspect flag to our dev command in package.json. It will let us to use our IDE or chrome dev tools to pause on breakpoint on or error. 

```
   "scripts": {
        "build": "rpgjs build",
        "dev": "NODE_OPTIONS='--inspect' rpgjs dev",
        "start": "node dist/server/main.mjs"
    },
```


## Debugging with visual studio code

To debug server with VSC we need to run command `npm run dev` and then attach to node process. 

### Add vsc configuration

By clicking on gear we are able to add new debuging config to launch.json

![Alt text](/assets/vsc-config.png)

Visual Studio code
```
  {
        "name": "Attach",
        "port": 9229,
        "request": "attach",
        "skipFiles": [
            "<node_internals>/**"
        ],
        "type": "node"
    }
```

### Start debugger
Then we can attach to process by clicking green play button

![Alt text](/assets/started-debug.png)

## Debuging with chrome

Instead of using IDE we can use chrome dev tools event to debug server. To do this we have to go to url:
- `chrome://inspect`

If we have running server and we added inspect flag we should have inspect button what will lead us to chrome dev tools connected to our server
![Alt text](/assets/chrome-inspect.png)

Hit `ctrl + p`` to browse your server side code :)

### If we have error but don't know excatly where

Two options are very usefull during debugging process. If we have some error, but we don't have stack trace (from websockets for instance). We can turn on two options both in VSC and Chrome dev tools

- Caught Exceptions
- Uncaught Exceptions

If you turn them on, debugger automagicly will stop on line where problem is.

![Alt text](/assets/exceptions-options-vsc.png)
![Alt text](/assets/exceptions-options-devtools.png)

Then we can go back with call stack and find a problem
![Alt text](/assets/callstack-vsc.png)
![Alt text](/assets/callstack-devtools.png)


## Server problem outputs
Errors usually appear in that places:

### Server standard CLI output
![Alt text](/assets/cli-errors.png)


### Websockets response
![websocketsDevTools](/assets/websockets-in-chrome-dev-tools.png)