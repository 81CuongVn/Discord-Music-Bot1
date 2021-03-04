module.exports.callback = async ({ client, message }) => {
	// Check voice channel
	const channel = message.member.voice.channel;
	if (!channel) {
		return message.reply(
			'Please join a voice channel to use this command.',
		);
	}

	// Get the server queue
	const serverQueue = client.queue.get(message.guild.id);

	// Check queue and toggle loop
	if (!serverQueue) return message.reply('There is nothing playing.');
	serverQueue.loop = !serverQueue.loop;

	return message.reply(
		`Loop has been **${serverQueue.loop ? 'enabled' : 'disabled'}**`,
	);
};

module.exports.config = {
	name: 'loop',
	aliases: [],
	category: 'music',
};
