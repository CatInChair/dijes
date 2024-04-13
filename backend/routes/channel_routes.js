const { readdir } = require('node:fs/promises');
const screen = require('sanitize-html');

module.exports = function APIController(server) {
    server.post('/api/channels', {
        schema: {
            title: 'Create channel',
            description: 'Create new channel.',
            body: {
                required: [ 'name' ],
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 5, maxLength: 25 },
                    icon: { type: 'string' },
                }
            },
            tags: [ 'users' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let data = req.body;

            if ( data.icon && !data.icon in await readdir('../../frontend/build/icons/channel') ) return server.httpErrors.badRequest('Incorrect icon');

            if ( data.name ) data.name = screen(data.name, {
                allowedTags: []
            });

            data.uid = new server.mongo.ObjectId(req.auth.user._id);

            try {
                await (new server.db.channels.schema(data)).create()
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    server.post('/api/channels/:id', {
        schema: {
            title: 'Edit Channel',
            description: 'Edit channel info.',
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 5, maxLength: 25 },
                    icon: { type: 'string' }
                }
            },
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let data = new Object(req.body);

            if ( Object.keys(req.params).length == 0 ) return server.httpErrors.badRequest();
            if ( data.icon && !data.icon in await readdir('../../frontend/build/icons/channel') ) return server.httpErrors.badRequest('Incorrect icon');

            let channel = await server.db.channels.searchById(req.params.id);

            if ( !channel ) return server.httpErrors.notFound();
            if ( !(req.auth.user._id in channel.members.map(a => a._id) && channel.members.find(a => a._id == req.auth.user._id).permissions == 1) && !(req.auth.user.access & 0b100 ) == 0 ) return server.httpErrors.forbidden();

            try {
                await server.db.channels.raw.update({ _id: new server.mongo.ObjectId(req.params.id) }, { '$set': data });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });

    server.get('/api/channels/:id/leave', {
        schema: {
            title: 'Leave Channel',
            description: 'Leave this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);

            if ( !channel || !channel.members.find( a => a._id.toString() == req.auth.user._id.toString()) ) return server.httpErrors.notFound();

            channel.members = channel.members.filter( a => a._id.toString() != req.auth.user._id.toString() )

            try {
                await server.db.channels.raw.update({ _id: new server.mongo.ObjectId(req.params.id) }, { '$set': { members: channel.members } });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    server.post('/api/channels/:id/invite', {
        schema: {
            title: 'Invite user',
            description: 'Invite user to this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);

            if( !(await server.db.users.searchById(req.body.id)) ) return server.httpErrors.notFound();

            if ( !channel || !channel.members.find( a => a._id.toString() == req.auth.user._id.toString()) ) return server.httpErrors.notFound();
            if ( !(req.auth.user._id in channel.members.map(a => a._id) && channel.members.find(a => a._id.toString() == req.auth.user._id.toString()).permissions == 1) && !(req.auth.user.access & 0b100 ) == 0 ) return server.httpErrors.forbidden();

            console.log(req.body.id in channel.members.map( a => a._id.toString()))

            if( channel.members.find( a => a._id.toString() == req.body.id ) ) return server.httpErrors.badRequest('User already be a member');

            channel.members.push({ _id: new server.mongo.ObjectId(req.body.id), permissions: -1 });

            try {
                await server.db.channels.raw.update({ _id: new server.mongo.ObjectId(req.params.id) }, { '$set': { members: channel.members } });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    server.get('/api/channels/:id/join', {
        schema: {
            title: 'Join Channel',
            description: 'Join to this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);

            if ( !channel || !channel.members.find( a => a._id.toString() == req.auth.user._id.toString()) ) return server.httpErrors.notFound();
            if ( !(channel.members.find(a => a._id.toString() == req.auth.user._id.toString()) && channel.members.find(a => a._id.toString() == req.auth.user._id.toString()).permissions == -1) ) return server.httpErrors.forbidden();

            channel.members[channel.members.indexOf(channel.members.find(a => a._id.toString() == req.auth.user._id.toString()))] = { _id: req.auth.user._id, permissions: 0 }

            try {
                await server.db.channels.raw.update({ _id: new server.mongo.ObjectId(req.params.id) }, { '$set': { members: channel.members } });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    server.delete('/api/channels/:id', {
        schema: {
            title: 'Delete channel',
            description: 'Delete channel entry.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);

            if ( !channel ) return server.httpErrors.notFound();
            if ( !(req.auth.user._id in channel.members.map(a => a._id) && channel.members.find(a => a._id.toString() == req.auth.user._id.toString()).permissions == 1) && !(req.auth.user.access & 0b100 ) == 0 ) return server.httpErrors.forbidden();

            try {
                await server.db.channels.delete(req.params.id);
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code: 200};
        }
    });
}