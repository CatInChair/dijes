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

module.exports = async function authController(server) {
    server.decorateRequest('auth', null)

    await server.register(require('@fastify/sensible'));
    await server.register(require('@fastify/auth'), { defaultRelation: 'and' }).register(require('@fastify/bearer-auth'), {
        auth: async function(key, req) {
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
                req.auth = { user: user, scopes: ver.scopes }
                return true;
            };

            return false;
        },
        addHook: false,
        verifyErrorLogLevel: 'debug'
    }).decorate('scope_0', function(req, reply, done) {
        if( (req.auth.scopes & 0b1) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('scope_1', function(req, reply, done) {
        if( (req.auth.scopes & 0b10) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('scope_2', function(req, reply, done) {
        if( (req.auth.scopes & 0b100) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('scope_3', function(req, reply, done) {
        if( (req.auth.scopes & 0b1000) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('admin', function(req, reply, done) {
        if( (req.auth.user.access & 0b100) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('edit', function(req, reply, done) {
        if( (req.auth.user.access & 0b10) > 0 ) return done();
        done(server.httpErrors.forbidden());
    }).decorate('read', function(req, reply, done) {
        if( (req.auth.user.access & 0b1) > 0 ) return done();
        done(server.httpErrors.forbidden());
    });

    server.route({
        method: 'POST',
        url: '/auth',
        schema: {
            title: 'User auth',
            description: 'Generating access token',
            body: {
                type: 'object',
                required: ['password', 'login', 'aud', 'scopes'],
                properties: {
                    password: { type: 'string' },
                    login: { type: 'string' },
                    aud: { type: 'string' },
                    scopes: { type: 'number' }
                }
            }
        },
        async handler( req, rep ) {
            let user = (await server.db.users.collection.findOne({
                password: req.body.password,
                login: req.body.login
            }));

            if( !user ) {
                return server.httpErrors.forbidden();
            }

            let data = user.token.find( a => a.aud == req.body.aud );

            if ( !data ) {
                data = { jti: new server.mongo.ObjectId(), scopes: req.body.scopes, aud: req.body.aud, type: 'access', exp: Date.now() + access_exp };
                user.token.push( data );
            } else {
                let index = user.token.indexOf(data)
                user.token[index] = { jti: new server.mongo.ObjectId(), scopes: req.body.scopes, aud: data.aud, type: 'access', exp: Date.now() + access_exp }
                data = new Object(user.token[index])
            };

            try {
                await server.db.users.raw.update({_id: user._id}, {'$set': {token: user.token}});
            } catch(e) {
                rep.code(500);
                return server.httpErrors.internalServerError();
            }
            data.sub = user._id.toString();
            data.iss = hostname;

            return await createSigner({ noTimestamp: true, key: user.secret, algorithm: 'HS256', expiresIn: data.exp*999, jti: data.jti.toString(), aud: data.aud, iss: data.iss, sub: data.sub, notBefore: 0 })({ type: 'access', scopes: req.body.scopes });
        }
    });
};