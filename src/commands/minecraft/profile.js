const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { findTier } = require("../../utilities/findRank.js");
const { ranked_api } = require("mcsr-ranked-api");

async function run(interaction, user, collection) {
  await interaction.deferReply();
  const api = new ranked_api();

  let data;
  try {
    data = await api.getUserStats(user);
  } catch (err) {
    interaction.editReply({ ephemeral: true, content: "", embeds: [new EmbedBuilder().setColor("Purple").setDescription(`${err}`)] });
    return;
  }

  const avatar_url = `https://crafatar.com/avatars/${data.uuid}.png?overlay`;
  const username = data.nickname;
  let curr_elo = data.elo_rate;
  if (curr_elo == -1) {
    curr_elo = 0;
  }

  const elo_tier = findTier(curr_elo);
  const curr_tier = elo_tier.tier;
  const curr_emote = elo_tier.emote;

  const next_tier = elo_tier.nextTier;
  const next_emote = elo_tier.nextEmote;

  const elo_needed = elo_tier.eloNeeded;

  let curr_rank = data.elo_rank;
  if (curr_rank == null) {
    curr_rank = "-";
  }

  const total_plays = data.total_played?.toLocaleString();
  const season_plays = data.season_played?.toLocaleString();

  const highest_streak = data.highest_winstreak?.toLocaleString();
  const curr_streak = data.current_winstreak?.toLocaleString();

  const elo_best = data.best_elo_rate?.toLocaleString();
  const elo_last_season = data.prev_elo_rate?.toLocaleString();

  const total_seconds = data.best_record_time / 1000;
  let minutes = Math.floor(total_seconds / 60)
    .toFixed()
    .toString();
  let seconds = (total_seconds % 60).toFixed().toString().padStart(2, "0");
  let pb_time = `${minutes}:${seconds}`;
  if (data.best_record_time == 0) {
    pb_time = `None`;
  }

  const last_played_time = new Date(data.latest_time).getTime();

  const records = data.records;
  let combined_records = { win: 0, lose: 0, draw: 0 };

  for (const record of Object.values(records)) {
    combined_records.win += record.win;
    combined_records.lose += record.lose;
    combined_records.draw += record.draw;
  }
  const winrate = (combined_records.win / (combined_records.win + combined_records.draw + combined_records.lose)) * 100;

  const discord_ID = data.connections.discord?.id;
  const discord_row = discord_ID ? `<:discord:1095835124018458634> **Discord:** <@${discord_ID}>` : "<:discord:1095835124018458634> **Discord:** **Not linked**";

  const youtube_ID = data.connections.youtube;
  const youtube_row = youtube_ID ? `<:youtube:1095835069031141416> **Youtube:** [**${data.connections.youtube.name}**](https://www.youtube.com/channel/${data.connections.youtube.id})` : "<:youtube:1095835069031141416> **Youtube:** **Not linked**";

  const twitch_ID = data.connections.twitch;
  const twitch_row = twitch_ID ? `<:twitch:1095835065356910662> **Twitch:** [**${data.connections.twitch.name}**](https://www.twitch.tv/${data.connections.twitch.name})` : "<:twitch:1095835065356910662> **Twitch:** **Not linked**";

  const ranked_stats = `**Ranked**\n\`${data.records[2].win}\`/\`${data.records[2].lose}\`/\`${data.records[2].draw}\``;
  const casual_stats = `**Casual**\n\`${data.records[1].win}\`/\`${data.records[1].lose}\`/\`${data.records[1].draw}\``;

  const first_row = `**Personal best time:** \`${pb_time}\` • **Winrate:** \`${winrate.toFixed(2)}%\`\n`;
  const second_row = `**Highest winstreak:** \`${highest_streak}\` • **Current winstreak:** \`${curr_streak}\`\n`;
  const third_row = `**Best elo:** \`${elo_best}\` • **Elo last season:** \`${elo_last_season}\`\n`;
  const fourth_row = `**Total plays:** \`${total_plays}\` • **This season:** \`${season_plays}\`\n`;
  const fifth_row = `**Last played:** <t:${last_played_time}:R>`;

  let fields = [
    {
      name: ":bar_chart: User Statistics",
      value: `${first_row}${second_row}${third_row}${fourth_row}${fifth_row}`,
      inline: false,
    },
    {
      name: ":construction_site: Tiers",
      value: `**Current tier:**\n\`${curr_tier}\`${curr_emote}\n**Next tier:**\n\`${next_tier}\`${next_emote} **(in ${elo_needed} elo)**`,
      inline: true,
    },
    {
      name: ":video_game: S1 Stats",
      value: `${ranked_stats}\n${casual_stats}`,
      inline: true,
    },
    {
      name: ":loudspeaker: Socials",
      value: `${discord_row}\n${youtube_row}\n${twitch_row}`,
      inline: false,
    },
  ];
  const embed = new EmbedBuilder()
    .setColor("Purple")
    .setAuthor({
      name: `${username} - ${curr_elo} elo (#${curr_rank})`,
      url: `https://disrespec.tech/elo/?username=${username}`,
    })
    .setThumbnail(avatar_url)
    .setFields(fields)
    .setFooter({ text: `Stats from mcsrranked.com`, iconURL: "https://media.discordapp.net/attachments/1074302646883733554/1083683972661379122/icon_x512.png" });
  interaction.editReply({ content: "", embeds: [embed] });
}

async function getUser(interaction, collection) {
  let user = interaction.options.getString("user");
  const regex = /^<@\d+>$/;
  if (regex.test(user)) {
    const userID = user.match(/\d+/)[0];
    try {
      const users = (await collection.findOne({})).users;
      user =
        users[userID].MinecraftUserID ??
        (() => {
          throw new Error("no userarg");
        })();
    } catch (err) {
      await interaction.reply({ ephmeral: true, content: "The discord user you have provided does not have an account linked." });
      return false;
    }
    user = user.replace(/!{ENCRYPTED}$/, "");
  }
  if (!user) {
    try {
      const users = (await collection.findOne({})).users;
      user =
        users[interaction.user.id].MinecraftUserID ??
        (() => {
          throw new Error("no userarg");
        })();
    } catch (err) {
      await interaction.reply({ ephmeral: true, content: "Either specify a username, or connect your account with /link" });
      return false;
    }
    user = user.replace(/!{ENCRYPTED}$/, "");
  }
  return user;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Get a user's mcsr ranked profile and stats")
    .addStringOption((option) => option.setName("user").setDescription("get a profile by username").setRequired(false)),
  run: async (client, interaction, db) => {
    const collection = db.collection("user_data");

    const username = await getUser(interaction, collection);
    if (!username) return;

    await run(interaction, username, collection);
  },
};
