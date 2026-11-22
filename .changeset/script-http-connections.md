---
"@rpgjs/script": patch
---

`$http.request(connection, { method, path, query, body })`: scripts reach outside services through the connections the host declares with `provideScripts({ http })`. The package never does networking: it checks each request (a declared connection, an allowed method, a path that stays in the connection, a flat query, a plain body), bounds the requests of a handler (`httpPerHandler`), the size of an answer (`httpBodyMax`) and the wait (`httpTimeout`, through an `AbortSignal`), and gives the answer as data (`{ ok, status, json, text, error }`). What the transport throws never reaches the script. `$http` is refused in `map.tick`. Without connections it does not exist. `simulate()` and `runTests()` take fake answers by connection.
