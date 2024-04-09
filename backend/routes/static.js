module.exports = function staticRoutes(server) {

    server.register(require('@fastify/static'), {
        root: path.join(__dirname, '../../frontend/build')
    });



    server.get('/', function (request, reply) {
        return 'Hello world!'
    });
};