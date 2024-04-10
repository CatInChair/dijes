const { readdir } = require('node:fs/promises');
const screen = require('sanitize-html');

module.exports = function APIController(server) {
    server.get('/api/users/@me', {
        schema: {
            title: 'Get User Self Data',
            description: 'Get self user info.'
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {
            return (new server.db.users.schema(req.auth.user)).publicData;
        }
    });

    server.patch('/api/users/@me', {
        schema: {
            title: 'Edit Self Data',
            description: 'Edit self user info.',
            body: {
                type: 'object',
                properties: {
                    password: { type: 'string' },
                    login: { type: 'string' },
                    name: { type: 'string', minLength: 5, maxLength: 20 },
                    icon: { type: 'string' },
                    bio: { type: 'string', minLength: 5, maxLength: 80 }
                }
            }
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let data = new Object(req.body)

            if ( Object.keys(req.params).length == 0 ) return server.httpErrors.badRequest();
            if ( req.body.icon && !req.body.icon in await readdir('../../frontend/build/icons') ) return server.httpErrors.badRequest('Incorrect icon');

            if ( data.name ) data.name = screen(data.name, {
                allowedTags: []
            });
            if ( data.bio ) data.bio = screen(data.bio, {
                allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br']
            });

            try {
                await server.db.users.edit({ _id: req.auth.user._id }, { '$set': data });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });

    server.delete('/api/users/@me', {
        schema: {
            title: 'Delete self',
            description: 'Delete self user entry.'
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {

        }
    });

    server.post('/api/users', {
        schema: {
            title: 'Register',
            description: 'Create new user.',
            body: {
                required: [ 'password', 'login', 'name' ],
                type: 'object',
                properties: {
                    password: { type: 'string' },
                    login: { type: 'string' },
                    name: { type: 'string', minLength: 5, maxLength: 20 },
                    icon: { type: 'string' },
                    bio: { type: 'string', minLength: 5, maxLength: 80 }
                }
            }
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0,
        ]),
        async handler(req, rep) {
            let data = req.body;

            try {
                await (new server.db.users.schema(data)).register()
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });

    server.get('/api/users/:id', {
        schema: {
            title: 'Get User Info',
            description: 'Get public user info.',
            params: {
                required: [ 'id' ],
                properties: {
                    id: { type: String }
                }
            }
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {
            return (new server.db.users.schema(server.db.users.searchById(req.params.id))).publicData;
        }
    });
};
