module.exports = async function databaseController(server) {
    const random = require("randomstring");

    await server.register(require('@fastify/mongodb'), {
        forceClose: true,
        url: 'mongodb://localhost:27017/App'
    });

    /** DB Schemas
     *      Users(Col):
     *          _id: ObjectId(PreGenerated)
     *          name: String(Required)
     *          login: String(Required) {Hashed}
     *          password: String(Required) {Hashed}
     *          icon: String(Optional)
     *          secret: String(PreGenerated, 32hex symbols)
     *          token: [ Token ](default: [])
     *          access: Number(default: 3)
     *          bio: String(default: null)
     *
     *      Token(Sch):
     *          jti: ObjectId(PreGenerated)
     *          scopes: Number(default: 3)
     *          aud: String
     *          type: String
     *          exp: Timestamp
     *          linked_token: ObjectId -> Users.token[linked_access_token]._id // only 'refresh' tokens
     *
     *      Channels(Col):
     *          _id: ObjectId(PreGenerated)
     *          name: String(Optional, default: String -> Users.name)
     *          members: [ Member ]
     *          icon: String(Optional)
     *          s_pkey: String(PreGenerated) // to encrypt new messages
     *          s_skey: String(Pregenerated)
     *          r_pkey: String(PreGenerated) // to decrypt by users recieved messages
     *          r_skey: String(Pregenerated)
     *
     *      Member(Sch):
     *          _id: ObjectId -> Users._id
     *          permissions: Number(default: -1)
     *
     *      Messages(Col):
     *          _id: ObjectId(PreGenerated)
     *          content: String(Required)
     *          created_at: Timestamp(PreGenerated),
     *          created_by: ObjectId -> Users._id(PreGenerated)
     *          channel: ObjectId -> Channels._id
     *
     */


    /** Other info
     *      Users.access:
     *          0b1 - read messages, channels and users, manage invites
     *          0b10 - create, edit, delete own messages and channels
     *          0b100 - all endpoints access
     *
     *      Member.permissions:
     *          -1 - invited
     *          0 - none
     *          1 - manage all members and messages in channel
     *
     *      Token.scopes:
     *          { Users.access } // token scopes provided to auditor
     *          & 0b1000 - refresh tokens
     *
     *      Token.type:
     *          'refresh'
     *          'access'
     */

    class User {
        constructor( data ) {
            this._id = data._id || new server.mongo.ObjectId();
            this.name = data.name;
            this.login = data.login;
            this.password = data.password;
            this.icon = data.icon || 'default.png';
            this.secret = data.secret || random.generate({ charset: 'hex' });
            this.access = data.access || 3;
            this.token = data.token || [];
            this.bio = data.bio || null;

            this.publicData = {
                name: this.name,
                icon: this.icon,
                bio: this.bio,
                id: this._id
            };
            this.data = {
                name: this.name,
                icon: this.icon,
                login: this.login,
                password: this.password,
                _id: this._id,
                access: this.access,
                bio: this.bio,
                token: this.token,
                secret: this.secret
            };
        }

        register() {
            return server.db.users.raw.insert( this.data );
        }

        edit(filter, data) {
            return server.db.users.edit( filter, data );
        }

        delete() {
            return server.db.users.delete( this._id );
        }
    };

    class Message {
        constructor(data) {
            this._id = data._id || new server.mongo.ObjectId();
            this.content = data.content;
            this.created_at = data.created_at || Date.now();
            this.created_by = data.created_by;
            this.channel = data.channel;

            this.data = {
                _id: this._id,
                content: this.content,
                created_at: this.created_at,
                created_by: this.created_by,
                channel: this.channel
            };
        }

        send() {
            return server.db.messages.create( this.data );
        }

        edit(filter, data) {
            return server.db.messages.edit( filter, data );
        }

        delete() {
            return server.db.messages.delete( this._id );
        }
    };

    class Channel {
        constructor(data) {
            this._id = data._id || new server.mongo.ObjectId();
            this.name = data.name;
            this.icon = data.icon || 'default.png';
            this.members = data.members || [{ _id: data.uid, permissions: 1 }];
            this.s_pkey = data.s_pkey || random.generate({ charset: 'hex' });
            this.s_skey = data.s_pkey || random.generate({ charset: 'hex' });
            this.r_pkey = data.s_pkey || random.generate({ charset: 'hex' });
            this.r_skey = data.s_pkey || random.generate({ charset: 'hex' });

            this.data = {
                name: this.name,
                icon: this.icon,
                _id: this._id,
                members: this.members,
                s_pkey: this.s_pkey,
                s_skey: this.s_skey,
                r_pkey: this.r_pkey,
                r_skey: this.r_skey
            };
            this.publicData = {
                name: this.name,
                _id: this._id,
                icon: this.icon,
                members: this.members
            }
            this.memberData = {
                name: this.name,
                _id: this._id,
                icon: this.icon,
                members: this.members,
                s_pkey: this.s_pkey,
                r_pkey: this.r_pkey,
            };
        }

        /**
         * sends message in this channel
         * @param {object_id} uid
         * @param {string} content
         */
        sendMessage({ uid, content }) {
            return (new server.db.messages.schema({ channel: this._id, created_by: uid, content: content })).send()
        }

        create() {
            return server.db.channels.raw.insert( this.data );
        }

        edit(filter, data) {
            return server.db.channels.edit( filter, data );
        }

        delete() {
            return server.db.channels.delete( this._id );
        }
    };


    server.decorate('db', {
        mongo: server.mongo,
        client: server.mongo.client,
        users: {
            schema: User,
            collection: server.mongo.db.collection('Users'),
            raw: {
                find: function(filter) {
                    return server.db.users.collection.find( filter )
                },
                insert: function(data) {
                    return server.db.users.collection.insertOne( data )
                },
                update: function(query,data,options) {
                    return server.db.users.collection.updateMany( query, data, options )
                },
                delete: function(filter) {
                    return server.db.users.collection.deleteMany( filter )
                },
            },
            searchById: function(uid) {
                return server.db.users.collection.findOne({ _id: new server.mongo.ObjectId(uid) })
            },
            searchChannels: function(uid) {
                return server.db.channels.raw.find({ 'members._id': new server.mongo.ObjectId(uid) })
            },
            delete: function(uid) {
                return server.db.users.raw.delete({ _id: uid })
            }
        },
        messages: {
            schema: Message,
            collection: server.mongo.db.collection('Messages'),
            raw: {
                find: function(filter) {
                    return server.db.messages.collection.find( filter )
                },
                insert: function(data) {
                    return server.db.messages.collection.insertOne( data )
                },
                update: function(query) {
                    return server.db.messages.collection.updateMany( query.filter, query.data, query.options || null )
                },
                delete: function(filter) {
                    return server.db.messages.collection.deleteMany( filter )
                },
            },
            delete: function(mid) {
                return server.db.messages.raw.delete({ _id: mid })
            }
        },
        channels: {
            schema: Channel,
            collection: server.mongo.db.collection('Channels'),
            raw: {
                find: function(filter) {
                    return server.db.channels.collection.find( filter )
                },
                insert: function(data) {
                    return server.db.channels.collection.insertOne( data )
                },
                update: function(query, data, options) {
                    return server.db.channels.collection.updateMany( query, data, options )
                },
                delete: function(filter) {
                    return server.db.channels.collection.deleteMany( filter )
                },
            },
            searchById: function(uid) {
                return server.db.channels.collection.findOne({ _id: new server.mongo.ObjectId(uid) })
            },
            searchForUser: function(uid) {
                return server.db.clannels.raw.find({ 'members._id': uid })
            },
            searchMessages: function(cid, page) {
                return server.db.messages.raw.find({ channel: cid }).sort({ created_at: -1 }).skip(20*page)
            },
            delete: function(cid) {
                return server.db.channels.raw.delete({ _id: new server.mongo.ObjectId(cid) })
            }
        }
    });
};