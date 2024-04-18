# How to start this 'App'?

- Replace with your MongoDB Server connect URL in /backend/controllers/database.js:6
- Insert your TLS Certificate and Private key in dir /tls with names 'localhost-cert.pem' and 'localhost-privkey.pem'
- Initialize app with 'npm init' and start with 'npm start' script on 'node start.js' in main directory

> You can edit TLS Cert and Privkey pathes in start.js:16-17
> ```js
> key: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-privkey.pem')),
> cert: fs.readFileSync(path.join(__dirname, 'tls', 'localhost-cert.pem'))
> ```
> Else you can disable a HTTPS by delet' strings 13-18
