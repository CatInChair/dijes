const { createSigner, createDecoder, createVerifier, TOKEN_ERROR_CODES } = require('fast-jwt')

var hostname = 'dijes.glitch.me';
var access_exp = 21600000;

/** access JWT spec
 *      Header:
 *          alg: HS256
 *          typ: 'JWT'
 *
 *      Body:
 *          type: 'access'
 *          sub: ObjectId -> DBColl.Users._id // User
 *          jti: ObjectId -> DBColl.Users.token[]._id
 *          scopes: Number -> DBColl.Users.token[].scopes
 *          exp: Timestamp ( 6h expiration )
 *          iat: Timestamp ( At moment of generation )
 *          iss: String (Hostname) // Token Provider
 *          aud: String // Agregator-App
 *
 * */

/** refresh JWT spec
 *      Header:
 *          alg: HS256
 *          typ: 'JWT'
 *
 *      Body:
 *          type: 'refresh'
 *          sub: ObjectId -> DBColl.Users._id // User
 *          jti: ObjectId -> DBColl.Users.token[]._id
 *          scopes: Number -> DBColl.Users.token[].scopes
 *          exp: Timestamp ( 24h expiration )
 *          iat: Timestamp ( At moment of generation )
 *          iss: String (Hostname) // Token Provider
 *          aud: String // Aggregator-App
 *          lt: ObjectId -> DBColl.Users.token[linked_access_token]._id
 *
 * */

module.exports = function authController(server) {
    server.decorateRequest('auth', null)

    fastify.register(require('@fastify/sensible'));
    server.register(require('@fastify/auth')).register(require('@fastify/bearer-auth'), {
        auth: async function(key, req) {
            let data = createDecoder(key, { checkTyp: 'JWT', complete: true });

            let user = data.payload.sub ? (await server.db.users.searchById( data.payload.sub ))[0] : null;
            if( !user ) return false;

            let ver = await createVerifier({
                key: user.secret,
                algorithms: ['HS256'],
                allowedJti: user.token.filter(a => a.type == data.payload.type && a.exp == data.payload.exp).map(a => a._id),
                allowedAud: user.token.find(a => a._id == data.payload.jti && a.aud == data.payload.aud).aud,
                allowedIss: hostname,
                requiredClaims: data.payload.type == 'access' ?
                    [ 'type', 'sub', 'jti', 'scopes', 'exp', 'iat', 'iss', 'aud' ]
                    :
                    [ 'type', 'sub', 'jti', 'scopes', 'exp', 'iat', 'iss', 'aud', 'lt' ],
                maxAge: 86400000
            });

            if( ver.sub ) {
                req.auth = { user, scopes: ver.scopes }
                return true;
            };

            return false;
        },
        addHook: false,
        verifyErrorLogLevel: 'debug'
    }).decorate('scope_0', function(req, reply, done) {
        if( req.auth.scopes & 0b1 > 0 ) return done();
        return done( server.httpErrors.forbidden() );
    }).decorate('scope_1', function(req, reply, done) {
        if( req.auth.scopes & 0b10 > 0 ) return done();
        return done( server.httpErrors.forbidden() );
    }).decorate('scope_2', function(req, reply, done) {
        if( req.auth.scopes & 0b100 > 0 ) return done();
        return done( server.httpErrors.forbidden() );
    }).decorate('scope_3', function(req, reply, done) {
        if( req.auth.scopes & 0b1000 > 0 ) return done();
        return done( server.httpErrors.forbidden() );
    });

    server.route({
        method: 'POST',
        url: '/auth',
        schema: {
            body: {
                type: 'object',
                required: ['pass', 'log'],
                properties: {
                    pass: { type: 'string' },
                    log: { type: 'string' },
                    aud: { type: 'string' },
                    scopes: { type: 'number' }
                }
            }
        },
        async handler( req, rep ) {
            let user = (await server.db.users.raw.find({
                password: req.body.pass,
                login: req.body.log
            }))[0];

            if( !user ) {
                return server.httpErrors.forbidden();
            }

            let data = user.token.find( a => a.aud == req.body.aud )[0];

            if ( !data ) {
                data = { jti: new server.mongo.ObjectId(), scopes: req.body.scopes, aud: req.body.aud, type: 'access', exp: Date.now() + access_exp };
                user.token.append( data );
            } else {
                user.token[user.token.indexOf(data)] = { jti: new server.mongo.ObjectId(), scopes: req.body.scopes, aud: req.body.aud, type: 'access', exp: Date.now() + access_exp }
            };
            try {
                await server.db.users.raw.update({filter: {_id: user._id}, data: {'$set': {token: user.token}}});
            } catch(e) {
                rep.code(500);
                return server.httpErrors.internalServerError();
            }
            data.sub = user._id.toString();
            data.iss = hostname;


            rep.code(200);
            return { token: await createSigner({ key: user.secret, algorithm: 'HS256', expiresIn: data.exp, jti: data.jti, aud: data.aud, iss: data.iss, sub: data.sub, notBefore: Date.now() }) };
        }
    });
};