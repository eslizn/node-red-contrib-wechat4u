const Wechat = require('wechat4u');

const instances = {};
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

		this.refresh = () => {
			if (instances[config.id].state === instances[config.id].CONF.STATE.login) {
				this.status({fill: 'green', shape: 'dot', text: 'online'});
			} else {
				this.status({fill: 'red', shape: 'ring', text: 'offline'});
				if (instances[config.id].PROP.uin) {
					instances[config.id].restart();
				} else {
					instances[config.id].start();
				}
			}
		}

		if (!(config.id in instances)) {
			console.log(this.context().get('session'));
			instances[config.id] = new Wechat(this.context().get('session') || []);
		}

		this.on('close', async (removed, done) => {
			if (removed) {
				await instances[config.id].stop();
			}
			done();
		});

		this.on('input', async (msg) => {
			if (typeof(msg.payload) === 'function') {
				await msg.payload(instances[config.id]);
			} else {
				await instances[config.id].sendMsg(msg.payload);
			}
		});

		//uuid
		instances[config.id].on('uuid', (uuid) => {
			this.context().set('qrcode', 'https://login.weixin.qq.com/qrcode/' + uuid);
		});

		//login
		instances[config.id].on('login', async () => {
			this.refresh();
			const uid = instances[config.id].user.UserName;
			if (!uid) {
				this.error('login event can not found selfId');
				return;
			}
			this.context().set('qrcode', '');
			this.context().set('session', instances[config.id].botData);
		});

		//logout
		instances[config.id].on('logout', async () => {
			this.refresh();
		});

		//message
		instances[config.id].on('message', async (msg) => {
			this.refresh();
			if (msg.MsgType in types) {
				this.send({topic: msg.MsgType, payload: msg});
			}
		});

		//error
		instances[config.id].on('error', async (err) => {
			this.refresh();
			this.error(err);
		});

		//refresh
		this.refresh();
	});
}
