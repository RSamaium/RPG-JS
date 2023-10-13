# Debuging client

## Chrome dev tools

1. Start game
2. Open dev tools by pressing f12 key
3. Hit ctrl + p to browse your code base
4. Put breakpoints

### If we have error but don't know excatly where

Two options are very usefull during debugging process.

- Caught Exceptions
- Uncaught Exceptions

If you turn them on, debugger automagicly will stop on line where problem is.

![devToolsExceptions](/assets/exceptions-options-devtools.png)

Then we can go back with call stack and find a problem
![devToolsCallstack](/assets/callstack-devtools.png)