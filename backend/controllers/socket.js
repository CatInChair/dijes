const { createSigner, createDecoder, createVerifier, TOKEN_ERROR_CODES } = require('fast-jwt');

async function auth(key, socket) {
    let data = await createDecoder(key, { checkTyp: 'JWT' })(key);
    let user = data.sub ? (await server.db.users.searchById( data.sub )) : null;
    if( !user ) return false;

    let ver;

    try {
        ver = await createVerifier({
            key: user.secret,
            algorithms: ['HS256'],
            allowedJti: user.token.filter(a => a.type == data.type && Math.abs(a.exp - data.exp) < 100000).map(a => a.jti.toString()),
            allowedAud: user.token.find(a => a.jti.toString() == data.jti).aud,
            allowedIss: hostname,
            requiredClaims: data.type == 'access' ?
                [ 'type', 'sub', 'jti', 'scopes', 'exp', 'iss', 'aud' ]
                :
                [ 'type', 'sub', 'jti', 'scopes', 'exp', 'iss', 'aud', 'lt' ],
            maxAge: 86400000,
            ignoreNotBefore: true
        })(key);
    } catch(e) {
        return false
    }

    if( ver.sub ) {
        socket.auth = { user: user, scopes: ver.scopes }
        return true;
    };

    return false;
}

module.exports = function SocketController(server) {
    server.get('/ws',
        {
            websocket: true
        },
    async (socket, req) => {
        socket.on('open', () => {
           socket.send(JSON.stringify({ code: 0, message: 'Need authorization' }));
           socket.once('message', async event => {
               let data = JSON.parse(event.data);

               if ( data.act != 0 || !data.token || !await auth(data.token, socket) ) socket.close(100, 'Unauthorized');

               socket.auth.user.channels = (await server.db.channels.searchForUser().toArray()).map( a => a._id );

               let str = { messages: server.db.messages.collection.watch([{'$match': { channel: { '$in': socket.auth.user.channels }}}])/*, channels: server.db.channels.collection.watch(), users: server.db.users.collection.watch()*/ }

               str.messages.on('insert', event => {
                    if ( req.socket.readyState != 1 ) {
                        str.messages.close();
                        socket.close(101, 'Already closed')
                        return
                    }
                    socket.send(JSON.stringify({data:event.documentKey, type: 'insert'}))
               });

               str.messages.on('delete', event => {
                   if ( req.socket.readyState != 1 ) {
                       str.messages.close();
                       socket.close(101, 'Already closed')
                       return
                   }
                   socket.send(JSON.stringify({data:event.documentKey, type: 'delete'}))
               });
           });
        });
    })
};