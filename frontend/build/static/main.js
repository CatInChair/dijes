var { createApp, ref } = Vue;
var env = {};

function changeRegister() {
    document.getElementById('mode').innerText = 'Register';
    document.getElementById('register').classList.remove('d-none');
    document.getElementById('login').classList.add('d-none');
    document.getElementsByClassName('body__auth')[0].style.setProperty('height', '65vh');
}

function changeLogin() {
    document.getElementById('mode').innerText = 'Login First';
    document.getElementById('login').classList.remove('d-none');
    document.getElementById('register').classList.add('d-none');
    document.getElementsByClassName('body__auth')[0].style.setProperty('height', '50vh');
}

function hideAuth() {
    document.getElementsByClassName('body__modal')[0].classList.add('d-none');
}

function switchChannelModal() {
    document.getElementById('createModal').classList.toggle('d-none')
}

async function loadMessages() {
    let messages = (await axios.get('/api/channels/' + env.channel + '/messages?page=1', {
        headers: { 'Authorization': 'Bearer '+ localStorage.getItem('token')},
        repsonseType: 'json',
        responseEncoding: 'utf8'
    })).data;

    let messageContainer = document.getElementById('messages')

    messageContainer.innerHTML = ''

    messages.forEach(m => {
        if( m.created_by == env.user._id ) messageContainer.innerHTML = `<div class="media w-50 ml-auto mb-3">
                    <div class="media-body">
                        <div class="bg-primary rounded py-2 px-3 mb-2">
                            <p class="text-small mb-0 text-white">${m.content}</p>
                        </div>
                        <p class="small text-muted">${(new Date(m.created_at)).toLocaleString('ru-RU')}</p>
                    </div>
                </div>` + messageContainer.innerHTML
    })
}

(async function(){

    if( localStorage.getItem('token') ) {
        let body = {};
        try {
        body = (await axios.get('/api/users/@me', {
            headers: { 'Authorization': 'Bearer '+ localStorage.getItem('token')},
            repsonseType: 'json',
            responseEncoding: 'utf8'
        })).data;
        } catch(e) {}

        if( !body.name && localStorage.getItem('login') && localStorage.getItem('password')) {
            try {
                body = (await axios({
                    url: '/auth', method: 'POST',
                    data: {
                        login: localStorage.getItem('login'),
                        password: localStorage.getItem('password'),
                        aud: 'dijes',
                        scopes: 7
                    },
                    repsonseType: 'json',
                    responseEncoding: 'utf8'
                })).data;
            } catch(e) {}
            if (!body.token) {
                localStorage.removeItem('login');
                localStorage.removeItem('password');
                localStorage.removeItem('token');
            } else {
                localStorage.setItem('token', body.token);
            };
            window.location.reload();
        }

        env.user=body

        let channels = (await axios.get('/api/users/@me/channels', {
            headers: { 'Authorization': 'Bearer '+ localStorage.getItem('token')},
            repsonseType: 'json',
            responseEncoding: 'utf8'
        })).data;

        let channelContainer = document.getElementById('channels')

        channels.forEach((c,i) => {
            if( i == 0 ) env.channel = c._id
            channelContainer.innerHTML = `
                    <a @click="changeChannel" id="${c._id}" class="list-group-item list-group-item-action ${i==0 ? 'text-white active' : 'list-group-item-light'} rounded-0"> <!-- or 'text-white active' -->
                        <div class="media">
                            <div class="media-body ml-4">
                                 <div class="d-flex align-items-center justify-content-start mb-1 p-2">
                                     <img src="/icons/channel/${c.icon}" alt="user" class="w-20">
                                     <h4 class="mb-0 p-4">${c.name}</h4>
                                 </div>
                           </div>
                        </div>
                    </a>
                ` + channelContainer.innerHTML
        });

        env.channel = channels[0]._id

        await loadMessages()

        hideAuth();
    }

/*
<!-- Sender Message-->
                <div class="media w-50 mb-3"><img src="/icons/user/default.png" alt="user" class="rounded-circle w-20">
                    <div class="media-body ml-3 p-2">
                        <div class="bg-light rounded py-2 px-3 mb-2">
                            <p class="text-small mb-0 text-muted">Test message in this chat</p>
                        </div>
                        <p class="small text-muted">8:12 PM | Apr 9</p>
                    </div>
                </div>

<!-- Reciever Message-->
                <div class="media w-50 ml-auto mb-3">
                    <div class="media-body">
                        <div class="bg-primary rounded py-2 px-3 mb-2">
                            <p class="text-small mb-0 text-white">Hello, Lorem Ipsum</p>
                        </div>
                        <p class="small text-muted">11:57 PM | Apr 13</p>
                    </div>
                </div>

<!-- Channel -->
                <a class="list-group-item list-group-item-action list-group-item-light rounded-0"> <!-- or 'text-white active' -->
                      <div class="media"><img src="/icons/channel/default.png" alt="user" class="w-20">
                            <div class="media-body ml-4">
                                 <div class="d-flex align-items-center justify-content-between mb-1 p-2">
                                     <h6 class="mb-0">Global</h6><small class="small font-weight-bold">13 Apr</small>
                                 </div>
                           </div>
                     </div>
                </a>
*/

var app = createApp({
    data: () => {
        return {
            changeChannel: function(d) {
                let el = document.getElementById(d.srcElement.offsetParent.id)
                let e = Array.from(document.getElementById('channels').children).find( l => l.classList.contains('active') )
                if( el.classList.contains('active') ) return;

                e.classList.toggle('active')
                e.classList.toggle('text-white')
                e.classList.toggle('list-group-item-light')

                el.classList.toggle('active')
                el.classList.toggle('text-white')
                el.classList.toggle('list-group-item-light')

                env.channel = el.id

                loadMessages()
            },


            createChannel: async function() {
                let name = document.getElementById('createChannel').elements['name'].value;
                let body = (await axios({url:'/api/channels/', method: 'POST',
                    data: { name },
                    headers: { 'Authorization': 'Bearer '+ localStorage.getItem('token')},
                    repsonseType: 'json',
                    responseEncoding: 'utf8'
                })).data;

                window.location.reload()
            },


            send: async function() {
                if(localStorage.getItem('token')) {
                    let content = document.getElementById('send').elements['message'].value;
                    let body = (await axios({url:'/api/channels/' + env.channel + '/messages', method: 'POST',
                        data: { content },
                        headers: { 'Authorization': 'Bearer '+ localStorage.getItem('token')},
                        repsonseType: 'json',
                        responseEncoding: 'utf8'
                    })).data;

                    window.location.reload()
                }
            },


            register: async function() {
                let data = document.getElementById('register').elements;
                let name = data['name'].value;
                let login = (new Hashes.SHA256).hex(data['login'].value);
                let password = (new Hashes.SHA256).hex(data['password'].value);
                let bio = data['bio'].value;

                let body = (await axios({
                    url: '/api/users',
                    method: 'POST',
                    data: {login, password, name, bio},
                    repsonseType: 'json',
                    responseEncoding: 'utf8'
                })).data;
                if(!body.name) return;

                body = (await axios.post('/auth', {
                    data: {login, password, aud:'dijes', scopes:7},
                    repsonseType: 'json',
                    responseEncoding: 'utf8'
                })).data;
                if (!body.token) return;

                let remember = data['remember'].checked;

                if (remember) {
                    localStorage.setItem('login', login);
                    localStorage.setItem('password', password);
                }

                localStorage.setItem('token', body.token);
                window.location.reload();
            },


            login: async function() {
                let data = document.getElementById('login').elements;
                let login = (new Hashes.SHA256).hex(data['login'].value);
                let password = (new Hashes.SHA256).hex(data['password'].value);

                    let body = (await axios({
                        url: '/auth',
                        method: 'POST',
                        data: {login, password, aud:'dijes', scopes:7},
                        repsonseType: 'json',
                        responseEncoding: 'utf8'
                    })).data;
                    if (!body.token) return;

                let remember = data['remember'].checked;

                if (remember) {
                    localStorage.setItem('login', login);
                    localStorage.setItem('password', password);
                }
                localStorage.setItem('token', body.token);
                window.location.reload();
            }
        }
    }
}).mount('#app');
}())