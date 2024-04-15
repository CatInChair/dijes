const Fastify = require('fastify');
global.fs = require('node:fs');
global.path = require('node:path');



/* Server initializing */

(async () => {

    const server = Fastify({
        logger: true,
        http2: true,
        https: {
            allowHTTP1: true,
            key: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-privkey.pem')),
            cert: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-cert.pem'))
        },
        ignoreTrailingSlash: true,
        disableRequestLogging: true,
        requestTimeout: 1000
    });



/*  Plugins registration */

    await server.register(require('@fastify/cors'), {
        origin: [ 'https://unpkg.com/vue@3/dist/vue.global.js', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.csshttps://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js', 'https://127.0.0.1:3000' ],
        methods: ['GET', 'POST', 'DELETE']
    });

    await server.register(require('@fastify/websocket'));

   /* server.register(require('@fastify/swagger'), {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'Dijes dev-branch',
                description: 'Booooo',
                version: '0.0.0-dev'
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Development server'
                }
            ],
            tags: [
                { name: 'users', description: 'Users end-points' },
                { name: 'channels', description: 'Channels end-points' },
                { name: 'messages', description: 'Messages end-points' }
            ]
        }
    })*/



/*  Routes and controllers registration */

    await require('./backend/routes/static')(server);
    await require('./backend/controllers/database')(server);
    await require('./backend/controllers/auth')(server);
    await require('./backend/routes/user_routes')(server);
    await require('./backend/routes/channel_routes')(server);
    await require('./backend/routes/message_routes')(server);
    await require('./backend/controllers/socket')(server);



/* Listening :| */

    server.listen({ port: 3000 }, (err) => {
        console.error(err);
    });

})();