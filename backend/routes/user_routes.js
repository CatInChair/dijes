const { readdir } = require('node:fs/promises');
const screen = require('sanitize-html');

module.exports = function APIController(server) {
    server.get('/api/users/@me', {
        schema: {
            title: 'Get User Self Data',
            description: 'Get self user info.',
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {
            return (new server.db.users.schema(req.auth.user)).publicData;
        }
    });

    server.post('/api/users/@me', {
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
            },
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let data = new Object(req.body)

            if ( (data.password || data.login) && req.auth.user.password == data.password && req.auth.user.login == data.login ) return server.httpErrors.badRequest('Pass or login without changes');

            if ( (data.password || data.login) && (await server.db.users.collection.findOne({ password: req.body.password, login: req.body.login })) ) return server.httpErrors.badRequest('Change another password or login');

            if ( Object.keys(data).length == 0 ) return server.httpErrors.badRequest();
            if ( data.icon && !data.icon in await readdir('../../frontend/build/icons') ) return server.httpErrors.badRequest('Incorrect icon');

            if ( data.name ) data.name = screen(data.name, {
                allowedTags: []
            });
            if ( data.bio ) data.bio = screen(data.bio, {
                allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b']
            });

            try {
                await server.db.users.raw.update({ _id: req.auth.user._id }, { '$set': data });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });

    server.delete('/api/users/@me', {
        schema: {
            title: 'Delete self',
            description: 'Delete self user entry.',
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            try {
                await (new server.db.users.schema(req.auth.user)).delete();
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            rep.code(200);
            return {code: 200};
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
            },
            tags: [ 'users' ]
        },
        async handler(req, rep) {
            let data = req.body;

            if ( data.icon && !data.icon in await readdir('../../frontend/build/icons') ) return server.httpErrors.badRequest('Incorrect icon');

            if ( data.name ) data.name = screen(data.name, {
                allowedTags: []
            });
            if ( data.bio ) data.bio = screen(data.bio, {
                allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b']
            });

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
                    id: { type: 'string' }
                }
            },
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {
            if( !(await server.db.users.searchById(req.params.id)) ) return server.httpErrors.notFound();

            return (new server.db.users.schema(await server.db.users.searchById(req.params.id))).publicData;
        }
    });

    server.post('/api/users/:id', {
        schema: {
            title: 'Edit User',
            description: 'Edit user info.',
            body: {
                type: 'object',
                properties: {
                    password: { type: 'string' },
                    login: { type: 'string' },
                    name: { type: 'string', minLength: 5, maxLength: 20 },
                    icon: { type: 'string' },
                    bio: { type: 'string', minLength: 5, maxLength: 80 }
                }
            },
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2,
            server.admin
        ]),
        async handler(req, rep) {
            let data = new Object(req.body)

            if( !(await server.db.users.searchById(req.params.id)) ) return server.httpErrors.notFound();

            if ( (data.password || data.login) && (await server.db.users.collection.findOne({ password: req.body.password, login: req.body.login }))._id ) return server.httpErrors.badRequest('Change another password or login');

            if ( Object.keys(req.params).length == 0 ) return server.httpErrors.badRequest();
            if ( data.icon && !data.icon in await readdir('../../frontend/build/icons') ) return server.httpErrors.badRequest('Incorrect icon');

            if ( data.name ) data.name = screen(data.name, { allowedTags: [] });
            if ( data.bio ) data.bio = screen(data.bio, {
                allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b']
            });

            if( !(await server.db.users.searchById(req.params.id)) ) return server.httpErrors.notFound();

            try {
                await server.db.users.raw.update({ _id: new server.mongo.ObjectId(req.params.id) }, { '$set': data });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });

    server.delete('/api/users/:id', {
        schema: {
            title: 'Delete user',
            description: 'Delete user entry.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2,
            server.admin
        ]),
        async handler(req, rep) {
            if( !(await server.db.users.searchById(req.params.id)) ) return server.httpErrors.notFound();

            try {
                await (new server.db.users.schema(req.auth.user)).delete();
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code: 200};
        }
    });
};
