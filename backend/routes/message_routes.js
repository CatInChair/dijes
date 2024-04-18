const screen = require('sanitize-html');

module.exports = function APIController(server) {
    server.get('/api/channels/:id/messages', {
        schema: {
            title: 'Get Messages',
            description: 'Read messages in this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            query: {
                type: 'object',
                required: [ 'page' ],
                properties: {
                    page: { type: 'number', minimum: 1 }
                }
            },
            tags: [ 'channels', 'messages' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_0
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);

            if ( !channel ) return server.httpErrors.notFound();
            if ( !(channel.members.find(a => a._id.toString() == req.auth.user._id.toString()) && channel.members.find(a => a._id.toString() == req.auth.user._id.toString()).permissions >= 0) ) return server.httpErrors.forbidden();

            return await server.db.channels.searchMessages(req.params.id, req.query.page-1).toArray();
        }
    });

    server.post('/api/channels/:id/messages', {
        schema: {
            title: 'Send Message',
            description: 'Send message in this channel.',
            body: {
                type: 'object',
                required: [ 'content' ],
                properties: {
                    content: { type: 'string', minLength: 5, maxLength: 100 },
                }
            },
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels', 'messages' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_1
        ]),
        async handler(req, rep) {
            let data = { content: screen(req.body.content, { allowedTags: [] }), created_by: req.auth.user._id }
            console.log(data)

            let channel = await server.db.channels.searchById(req.params.id);

            data.channel = channel._id;

            if ( !channel ) return server.httpErrors.notFound();
            if ( !(channel.members.find(a => a._id.toString() == req.auth.user._id ) && channel.members.find(a => a._id.toString() == req.auth.user._id.toString()).permissions >= 0) ) return server.httpErrors.forbidden();

            try {
                await (new server.db.messages.schema(data)).send();
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    server.delete('/api/channels/:id/messages/:mid', {
        schema: {
            title: 'Send Message',
            description: 'Send message in this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            tags: [ 'channels', 'messages' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);
            let message = await server.db.messages.searchById(req.params.mid);

            if ( !channel || !message ) return server.httpErrors.notFound();
            if ( req.auth.user._id.toString() != message.created_by.toString() && (req.auth.user.access & 0b100 ) == 0 ) return server.httpErrors.forbidden();

            try {
                await server.db.messages.delete(req.params.mid)
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return {code:200};
        }
    });

    /*server.post('/api/channels/:id/messages/:mid', {
        schema: {
            title: 'Send Message',
            description: 'Send message in this channel.',
            params: {
                type: 'object',
                required: [ 'id' ],
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                required: [ 'content' ],
                properties: {
                    content: { type: 'string', minLength: 5, maxLength: 100 },
                }
            },
            tags: [ 'channels', 'messages' ]
        },
        preHandler: server.auth([
            server.verifyBearerAuth,
            server.scope_2
        ]),
        async handler(req, rep) {
            let channel = await server.db.channels.searchById(req.params.id);
            let message = await server.db.messages.searchById(req.params.mid);

            if ( !channel || !message ) return server.httpErrors.notFound();
            if ( req.auth.user._id.toString() != message.created_by.toString() && (req.auth.user.access & 0b100 ) == 0) return server.httpErrors.forbidden();

            try {
                await server.db.messages.raw.update({ _id: req.params.mid }, { '$set': { content: req.body.content } });
            } catch(e) {
                return server.httpErrors.internalServerError();
            };

            return data;
        }
    });*/
}