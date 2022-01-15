module.exports = async function (RED) {
	RED.nodes.registerType('wechat4u', function (config) {
		RED.nodes.createNode(this, config);
	});
}
