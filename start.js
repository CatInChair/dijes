const Fastify = require('fastify');
global.fs = require('node:fs');
global.path = require('node:path');



/* Server initializing */

const server = Fastify({
    logger: true,
    http2: true,
    https: {
        key: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-cert.pem'))
    },
    ignoreTrailingSlash: true,
    disableRequestLogging: true,
    requestTimeout: 1000
});



/*  Plugins registration */

server.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'PATCH', 'EDIT', 'POST', 'DELETE']
});



/*  Routes and controllers registration */

require('./backend/routes/static')(server);
require('./backend/controllers/database')(server);
require('./backend/controllers/auth')(server);
require('./backend/controllers/api')(server);


/* Listening :| */

try {
    server.listen({ port: 3000 });
} catch(e) {
    console.error(e);
};