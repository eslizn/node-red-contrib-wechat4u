const Wechat = require('wechat4u');

const types = {
	1: 'Text',
	3: 'Image',
	34: 'Voice',
	37: 'Verify',
	40: 'PossibleFriend',
	42: 'ShareCard',
	43: 'Video',
	47: 'Emoticon',
	48: 'Location',
	49: 'App',
	62: 'MicroVideo',
	9999: 'Notice',
	10002: 'Recalled',
	1e4: 'Sys',
};

module.exports = async function (RED) {
	RED.nodes.registerType('wechat4u', function (config) {
		RED.nodes.createNode(this, config);
		const wechat = new Wechat();

		this.refresh = () => {
			if (wechat.state === wechat.CONF.STATE.login) {
				this.status({fill: 'green', shape: 'dot', text: 'online'});
			} else {
				this.status({fill: 'red', shape: 'ring', text: 'offline'});
			}
		}

		this.start = () => {
			this.refresh();
			this.context().get('session', (err, data) => {
				if (data) {
					wechat.botData = data;
				}
				if (wechat.PROP.uin) {
					wechat.restart();
				} else {
					wechat.start();
				}
			});
		}

		this.on('close', async (removed, done) => {
			if (removed) {
				await wechat.stop();
			}
			done();
		});

		this.on('input', async (msg) => {
			if (typeof(msg.payload) === 'function') {
				await msg.payload(wechat);
			} else {
				await wechat.sendMsg(msg.payload);
			}
		});

		//uuid
		wechat.on('uuid', (uuid) => {
			this.context().set('qrcode', 'https://login.weixin.qq.com/qrcode/' + uuid);
		});

		//user-avatar
		wechat.on('user-avatar', () => {
			this.refresh();
		});

		//login
		wechat.on('login', async () => {
			this.refresh();
			const uid = wechat.user.UserName;
			if (!uid) {
				this.error('login event can not found selfId');
				return;
			}
			this.context().set('qrcode', '');
			this.context().set('session', wechat.botData);
		});

		//logout
		wechat.on('logout', async () => {
			this.refresh();
			this.start();
		});

		//contacts-updated
		wechat.on('contacts-updated', async () => {
			this.refresh();
		});

		//message
		wechat.on('message', async (msg) => {
			this.refresh();
			if (msg.MsgType in types) {
				msg.Bot = wechat;
				this.send({topic: types[msg.MsgType], payload: msg});
			}
		});

		//error
		wechat.on('error', async (err) => {
			this.error(err);
		});

		//start
		this.start();
	});
}
