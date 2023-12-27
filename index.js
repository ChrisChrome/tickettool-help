const config = require("./config.json");
const Discord = require("discord.js");
const client = new Discord.Client({intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"]})
const colors = require("colors")
var staffChannel;
client.on("ready", () => {
	console.log(`${colors.cyan("[Info]")} Logged in as ${client.user.username}`)
	staffChannel = client.channels.cache.get(config.staff_channel);
})

client.on("messageCreate", async (msg) => {
	if( !msg.author.id === config.ticket_bot ) return;
	if( !msg.content.includes(config.ticket_detect_phrase)) return;
	if( !msg.channel.name.startsWith(config.ticket_channel_prefix) ) return;
	let user = msg.mentions.users.first();
	if( !user ) return;
	staffChannel.send(`${config.staff_ping ? config.staff_ping : ""} Ticket ${msg.channel} created by ${user} (${user.tag})`).then(m => {
		m.react("✅");
		m.react("❌");
	})
})

client.login(config.token)