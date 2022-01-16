import Wechat from 'wechat4u'

const instances = {};

module.exports = async function (RED) {
	RED.nodes.registerType('wechat4u', function (config) {
		RED.nodes.createNode(this, config);

		this.refresh = () => {
			if (this.offline()) {
				this.status({fill: 'red', shape: 'ring', text: 'offline'});
			} else {
				this.status({fill: 'green', shape: 'dot', text: 'online'});
			}
		}

		this.offline = () => {
			return instances[config.id].state === instances[config.id].CONF.STATE.logout;
		}

		this.online = () => {
			return !this.offline();
		}

		this.start = () => {
			if (this.offline()) {
				if (instances[config.id].PROP.uin) {
					instances[config.id].restart();
				} else {
					instances[config.id].start();
				}
			}
		}

		if (!(config.id in instances)) {
			instances[config.id] = new Wechat();
		}

		instances[config.id].on('uuid', (uuid) => {
			this.refresh();
			this.context().set('qrcode', 'https://login.weixin.qq.com/qrcode/' + uuid);
		});

		this.on('close', async (removed, done) => {
			if (removed) {
				instances[config.id].stop();
			}
		});

		this.on('input', async (msg) => {
			if (typeof(msg.payload) === 'function') {
				await msg.payload(instances[config.id]);
			} else {
				await instances[config.id].sendMsg(msg.payload);
			}
		});

		//login
		instances[config.id].on('login', async () => {
			this.refresh();
			const uid = instances[config.id].user.UserName;
			if (!uid) {
				this.error('login event can not found selfId');
				return;
			}
			//storage
		});

		//logout
		instances[config.id].on('logout', async () => {
			this.refresh();
		});

		//message
		instances[config.id].on('message', async (msg) => {
			this.refresh();
			this.send({topic: msg.MsgType, payload: msg});
		});

		this.start();
	});
}
