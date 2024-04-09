const { createDecoder, createVerifier } = require('fast-jwt')


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
 *          exp: Timestamp ( 30h expiration )
 *          iat: Timestamp ( At moment of generation )
 *          iss: String (Hostname) // Token Provider
 *          aud: String // Agregator-App
 *          lt: ObjectId -> DBColl.Users.token[linked_access_token]._id
 *
 * */

module.exports = function authController(server) {
    server.register(require('@fastify/bearer-auth'), {
        auth: async function(key, req) {
            data = createDecoder(key, { checkTyp: 'JWT'})
        },
        addHook: false
    });


};