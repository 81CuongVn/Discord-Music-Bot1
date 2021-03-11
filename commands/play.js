const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { Util } = require('discord.js');
const scdl = require("soundcloud-downloader").default;

module.exports.callback = async ({ client, args, message }) => {
	// Check voice channel
	const channel = message.member.voice.channel;
	if (!channel) {
		return message.reply(
			'Please join a voice channel to use this command.',
		);
	}

	// Check Permissions
	const permissions = channel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT')) {
		return message.reply('I am unable to connect to your voice channel.');
	}
	if (!permissions.has('SPEAK')) {
		return message.reply('I am unable to speak in your voice channel.');
	}
	// Search
	const search = args.join(' ');
	if (!search) {
		return message.reply('Please provide a song you would like to play');
	}
	const url = args[0] ? args[0].replace(/<(.+)>/g, '$1') : '';
	const serverQueue = client.queue.get(message.guild.id);

	// Get song info and song
	let songInfo = null;
	let song = null;

	// Get song
	// Check if it is a url
	if (
		url.match(
			/^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi,
		)
	) {
		// Manage youtube links
		songInfo = await ytdl.getInfo(url).catch(console.error);
		if (!songInfo) {
			return message.reply('I was unable to find this song on YouTube.');
		}

		song = {
			id: songInfo.videoDetails.videoId,
			title: songInfo.videoDetails.title,
			url: songInfo.videoDetails.video_url,
			img:
				songInfo.player_response.videoDetails.thumbnail.thumbnails[0]
					.url,
			duration: songInfo.videoDetails.lengthSeconds,
			ago: songInfo.videoDetails.publishDate,
			views: String(songInfo.videoDetails.viewCount).padStart(10, ' '),
			req: message.author,
		};
	} else if (url.match(/^https?:\/\/(soundcloud\.com)\/(.*)$/gi)) {
		// Manage soundcloud links
		songInfo = await scdl.getInfo(url).catch(console.error);
		if (!songInfo) {
			return message.reply('I was unable to find information on this song on sound cloud.')
		}
		
		song = {
                    id: songInfo.permalink,
                    title: songInfo.title,
                    url: songInfo.permalink_url,
                    img: songInfo.artwork_url,
                    ago: songInfo.last_modified,
                    views: String(songInfo.playback_count).padStart(10, " "),
                    duration: Math.ceil(songInfo.duration / 1000),
                    req: message.author,
                };
	} else {
		// Search for songs via YouTube if song was not a link.
		const searchResult = await yts.search(search).catch(console.error);
		if (!searchResult.videos.length) {
			return message.reply('I was unable to find the song on youtube');
		}

		songInfo = searchResult.videos[0];
		song = {
			id: songInfo.videoId,
			title: Util.escapeMarkdown(songInfo.title),
			views: String(songInfo.views).padStart(10, ' '),
			url: songInfo.url,
			ago: songInfo.ago,
			duration: songInfo.duration.toString(),
			img: songInfo.image,
			req: message.author,
		};
	}

	// Add song to queue if queue is set
	if (serverQueue) {
		serverQueue.songs.push(song);
		return message.reply(
			`[${song.title}](${song.url}) has been added to the queue. *requested by ${song.req}*`,
		);
	}

	// Construct queue variable
	const queueItem = {
		textChannel: message.channel,
		voiceChannel: channel,
		connection: null,
		songs: [song],
		volume: 50,
		playing: true,
		loop: false,
	};
	client.queue.set(message.guild.id, queueItem);

	// Play the song
	const { play } = require('../utils/play');
	const connection = await channel.join().catch((err) => {
		client.queue.delete(message.guild.id);
		message.reply(`I was unable to join the voice channel: ${err}`);
		return console.error(`Unable to join voice channel: ${err}`);
	});
	if (!connection) return await channel.leave();

	// Set queue
	queueItem.connection = connection;
	play(queueItem);
};

module.exports.config = {
	name: 'play',
	aliases: ['p'],
	category: 'music',
};