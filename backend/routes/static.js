module.exports = async function staticRoutes(server) {

    await server.register(require('@fastify/static'), {
        root: path.join(__dirname, '../../frontend/build'),
        index: false
    });

    await server.get('/',  {
        handler(req, rep) {
            rep.sendFile('index.html', path.join(__dirname, '../../frontend/dev'));
        }
    });
};