const config = require("./config.json");
const Discord = require("discord.js");
const client = new Discord.Client({ intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent", "GuildMessageReactions", "DirectMessageReactions"] })
const colors = require("colors")
var staffChannel;
client.on("ready", () => {
	console.log(`${colors.cyan("[Info]")} Logged in as ${client.user.username}`)
	staffChannel = client.channels.cache.get(config.staff_channel);
})

var activeTickets = {};

client.on("messageCreate", async (msg) => {
	if (!msg.author.id === config.ticket_bot) return;
	if (!msg.content.includes(config.ticket_detect_phrase)) return;
	if (!msg.channel.name.startsWith(config.ticket_channel_prefix)) return;
	let user = msg.mentions.users.first();
	if (!user) return;
	staffChannel.send({
		content: `${config.staff_ping ? config.staff_ping : ""} Ticket ${msg.channel} created by ${user} (${user.tag})`,
		components: [
			{
				type: 1,
				components: [
					{
						type: 2,
						label: "Accept (0)",
						style: 3,
						custom_id: "accept",
						emoji: {
							name: "✅"
						}
					},
					{
						type: 2,
						label: "Deny (0)",
						style: 4,
						custom_id: "deny",
						emoji: {
							name: "❌"
						}
					},
					{
						type: 2,
						label: "Question (0)",
						style: 1,
						custom_id: "question",
						emoji: {
							name: "❓"
						}
					},
					{
						type: 2,
						label: "Coven (0)",
						style: 2,
						custom_id: "coven",
						emoji: {
							name: "🔮"
						}
					}
				]
			}
		]
	}).then((m) => {
		activeTickets[m.id] = {
			user: user,
			adminMessage: m,
			counts: {
				accept: [],
				deny: [],
				question: [],
				coven: []
			},
		}
	});
})

client.on("interactionCreate", async (interaction) => {
	// Check if its a button event
	if (!interaction.isButton()) return;
	// Check if the button is on an active ticket (if not, just ignore it, it should never happen)
	if (!activeTickets[interaction.message.id]) return interaction.reply({
		content: "Something went wrong, this ticket is not seen as active/monitored. Please revert to using reactions.",
		ephemeral: true
	});
	msg = activeTickets[interaction.message.id].adminMessage;
	switch (interaction.customId) {
		case "accept":
			// If the user is already in the array, tell them with ephemeral message
			if (activeTickets[interaction.message.id].counts.accept.includes(interaction.user.id)) {
				return await interaction.reply({
					content: "You already accepted this ticket!",
					ephemeral: true
				});
			}
			// Remove the other counts if the user is in them
			if (activeTickets[interaction.message.id].counts.deny.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.deny = activeTickets[interaction.message.id].counts.deny.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.question.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.question = activeTickets[interaction.message.id].counts.question.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.coven.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.coven = activeTickets[interaction.message.id].counts.coven.filter((id) => id !== interaction.user.id);
			}
			// Add the interaction user to the accepts array
			activeTickets[interaction.message.id].counts.accept.push(interaction.user.id);
			// if statement, check if that makes the accepts go over the threshold for auto accept
			if (activeTickets[interaction.message.id].counts.accept.length >= config.auto_accept.threshold) {
				// Remove roles from config.auto_accept.remove_roles array
				config.auto_accept.remove_roles.forEach((role) => {
					interaction.guild.members.cache.get(activeTickets[interaction.message.id].user.id).roles.remove(role);
				});
				// Add roles from config.auto_accept.add_roles array
				config.auto_accept.add_roles.forEach((role) => {
					interaction.guild.members.cache.get(activeTickets[interaction.message.id].user.id).roles.add(role);
				});

				// Send the welcome message to the welcome channel, replace %user% with the user
				interaction.guild.channels.cache.get(config.auto_accept.welcome_channel).send({
					content: config.auto_accept.welcome_message.replace("%user%", activeTickets[interaction.message.id].user)
				});

				return await msg.edit({
					content: `${activeTickets[interaction.message.id].user} has been auto accepted, roles given, message sent!\nDont forget to close the ticket!`,
					components: []
				}).then(() => {
					interaction.reply({
						content: "You have accepted the ticket",
						ephemeral: true
					});
				});
			}

			// Update the message
			msg.edit({
				content: msg.content,
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								label: `Accept (${activeTickets[interaction.message.id].counts.accept.length})`,
								style: 3,
								custom_id: "accept",
								emoji: {
									name: "✅"
								}
							},
							{
								type: 2,
								label: `Deny (${activeTickets[interaction.message.id].counts.deny.length})`,
								style: 4,
								custom_id: "deny",
								emoji: {
									name: "❌"
								}
							},
							{
								type: 2,
								label: `Question (${activeTickets[interaction.message.id].counts.question.length})`,
								style: 1,
								custom_id: "question",
								emoji: {
									name: "❓"
								}
							},
							{
								type: 2,
								label: `Coven (${activeTickets[interaction.message.id].counts.coven.length})`,
								style: 2,
								custom_id: "coven",
								emoji: {
									name: "🔮"
								}
							}
						]
					}
				]
			}).then(() => {
				interaction.reply({
					content: "You have accepted the ticket",
					ephemeral: true
				})
			});

			break;

		case "deny": // This one doesnt automatically do anything, its just a counter
			// If the user is already in the array, tell them with ephemeral message
			if (activeTickets[interaction.message.id].counts.deny.includes(interaction.user.id)) {
				return await interaction.reply({
					content: "You already denied this ticket!",
					ephemeral: true
				});
			}
			// Remove the other counts if the user is in them
			if (activeTickets[interaction.message.id].counts.accept.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.accept = activeTickets[interaction.message.id].counts.accept.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.question.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.question = activeTickets[interaction.message.id].counts.question.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.coven.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.coven = activeTickets[interaction.message.id].counts.coven.filter((id) => id !== interaction.user.id);
			}

			// Add the interaction user to the denies array
			activeTickets[interaction.message.id].counts.deny.push(interaction.user.id);
			// Update the message
			msg.edit({
				content: msg.content,
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								label: `Accept (${activeTickets[interaction.message.id].counts.accept.length})`,
								style: 3,
								custom_id: "accept",
								emoji: {
									name: "✅"
								}
							},
							{
								type: 2,
								label: `Deny (${activeTickets[interaction.message.id].counts.deny.length})`,
								style: 4,
								custom_id: "deny",
								emoji: {
									name: "❌"
								}
							},
							{
								type: 2,
								label: `Question (${activeTickets[interaction.message.id].counts.question.length})`,
								style: 1,
								custom_id: "question",
								emoji: {
									name: "❓"
								}
							},
							{
								type: 2,
								label: `Coven (${activeTickets[interaction.message.id].counts.coven.length})`,
								style: 2,
								custom_id: "coven",
								emoji: {
									name: "🔮"
								}
							}
						]
					}
				]
			}).then(() => {
				interaction.reply({
					content: "You have denied the ticket",
					ephemeral: true
				})
			});
			break;
		case "question": // This one doesnt automatically do anything, its just a counter
			// If the user is already in the array, tell them with ephemeral message
			if (activeTickets[interaction.message.id].counts.question.includes(interaction.user.id)) {
				return await interaction.reply({
					content: "You already questioned this ticket!",
					ephemeral: true
				});
			}
			// Remove the other counts if the user is in them
			if (activeTickets[interaction.message.id].counts.accept.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.accept = activeTickets[interaction.message.id].counts.accept.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.deny.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.deny = activeTickets[interaction.message.id].counts.deny.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.coven.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.coven = activeTickets[interaction.message.id].counts.coven.filter((id) => id !== interaction.user.id);
			}

			// Add the interaction user to the questions array
			activeTickets[interaction.message.id].counts.question.push(interaction.user.id);
			// Update the message
			msg.edit({
				content: msg.content,
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								label: `Accept (${activeTickets[interaction.message.id].counts.accept.length})`,
								style: 3,
								custom_id: "accept",
								emoji: {
									name: "✅"
								}
							},
							{
								type: 2,
								label: `Deny (${activeTickets[interaction.message.id].counts.deny.length})`,
								style: 4,
								custom_id: "deny",
								emoji: {
									name: "❌"
								}
							},
							{
								type: 2,
								label: `Question (${activeTickets[interaction.message.id].counts.question.length})`,
								style: 1,
								custom_id: "question",
								emoji: {
									name: "❓"
								}
							},
							{
								type: 2,
								label: `Coven (${activeTickets[interaction.message.id].counts.coven.length})`,
								style: 2,
								custom_id: "coven",
								emoji: {
									name: "🔮"
								}
							}
						]
					}
				]
			}).then(() => {
				interaction.reply({
					content: "You have questioned the ticket",
					ephemeral: true
				})
			});
			break;
		case "coven": // This one doesnt automatically do anything, its just a counter
			// If the user is already in the array, tell them with ephemeral message
			if (activeTickets[interaction.message.id].counts.coven.includes(interaction.user.id)) {
				return await interaction.reply({
					content: "You already coven'd this ticket!",
					ephemeral: true
				});
			}
			// Remove the other counts if the user is in them
			if (activeTickets[interaction.message.id].counts.accept.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.accept = activeTickets[interaction.message.id].counts.accept.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.deny.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.deny = activeTickets[interaction.message.id].counts.deny.filter((id) => id !== interaction.user.id);
			}
			if (activeTickets[interaction.message.id].counts.question.includes(interaction.user.id)) {
				activeTickets[interaction.message.id].counts.question = activeTickets[interaction.message.id].counts.question.filter((id) => id !== interaction.user.id);
			}
			// Add the interaction user to the covens array
			activeTickets[interaction.message.id].counts.coven.push(interaction.user.id);
			// Update the message
			msg.edit({
				content: msg.content,
				components: [
					{
						type: 1,
						components: [
							{
								type: 2,
								label: `Accept (${activeTickets[interaction.message.id].counts.accept.length})`,
								style: 3,
								custom_id: "accept",
								emoji: {
									name: "✅"
								}
							},
							{
								type: 2,
								label: `Deny (${activeTickets[interaction.message.id].counts.deny.length})`,
								style: 4,
								custom_id: "deny",
								emoji: {
									name: "❌"
								}
							},
							{
								type: 2,
								label: `Question (${activeTickets[interaction.message.id].counts.question.length})`,
								style: 1,
								custom_id: "question",
								emoji: {
									name: "❓"
								}
							},
							{
								type: 2,
								label: `Coven (${activeTickets[interaction.message.id].counts.coven.length})`,
								style: 2,
								custom_id: "coven",
								emoji: {
									name: "🔮"
								}
							}
						]
					}
				]
			});
			interaction.reply({
				content: "You suggested to send this ticket to the coven",
				ephemeral: true
			});
			break;

	}

});

// Lets actually handle exceptions now
process.on('unhandledRejection', (error) => {
	// Log a full error with line number
	console.log(`${colors.red("[ERROR]")} ${error}`);
	// If config.ntfyUrl is set, Send the exception to ntfy
	if (config.ntfyUrl) fetch(config.ntfyUrl, {
		method: 'POST', // PUT works too
		body: error,
		headers: {
			'Title': 'TicketTool Watcher Bot Rejection',
			'Priority': 5,
			'Tags': 'warning,inbox_tray,TicketTool Watcher'
		}
	});
});

process.on('uncaughtException', (error) => {
	// Log a full error with line number
	console.log(`${colors.red("[ERROR]")} ${error}`);
	// If config.ntfyUrl is set, Send the exception to ntfy
	if (config.ntfyUrl) fetch(config.ntfyUrl, {
		method: 'POST', // PUT works too
		body: error,
		headers: {
			'Title': 'TicketTool Watcher Bot Exception',
			'Priority': 5,
			'Tags': 'warning,inbox_tray,TicketTool Watcher'
		}
	});
});

client.login(config.token)