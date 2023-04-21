const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { ranked_api } = require("mcsr-ranked-api");
const { getMatchesList } = require("../../../utilities/functions/getMatchesList.js");
const fs = require("fs");

async function run(interaction, username, opponentname, ENCRYPTED, match_type, page) {
  const api = new ranked_api();

  let ranked_data;
  try {
    ranked_data = await api.getRecentMatch(username, { match_type: match_type, opponent: opponentname });
  } catch (err) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor("Purple").setDescription(`${err}`)] });
    return;
  }

  const nextPage = new ButtonBuilder().setCustomId("next").setLabel("Next match").setStyle(ButtonStyle.Secondary);
  const prevPage = new ButtonBuilder().setCustomId("prev").setLabel("Previous match").setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(prevPage, nextPage);

  const embed = await getMatchesList(ranked_data, ENCRYPTED, username, page);
  const response = await interaction.editReply({ embeds: [embed], components: [row] });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = response.createMessageComponentCollector({ time: 60000, filter: filter });

  collector.on("collect", async (i) => {
    if (i.customId === "next") {
      page++;

      if (page > ranked_data.length) {
        page--;
      }
      const embed = await getMatchesList(ranked_data, ENCRYPTED, username, page);

      await response.edit({ embeds: [embed], components: [row] });
    } else if (i.customId === "prev") {
      page--;

      if (0 >= page) {
        page++;
      }
      const embed = await getMatchesList(ranked_data, ENCRYPTED, username, page);

      await response.edit({ embeds: [embed], components: [row] });
    }
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("matchlist")
    .setDescription("Get a user's selected match list")
    .addStringOption((option) => option.setName("user").setDescription("get a match by username").setRequired(false))
    .addStringOption((option) => option.setName("opponent").setDescription("get a profile by username").setRequired(false))
    .addIntegerOption((option) => option.setName("page").setDescription("Page of the list").setMinValue(1).setMaxValue(5).setRequired(false))
    .addStringOption((option) => option.setName("type").setDescription("Select a match type").setRequired(false).addChoices({ name: "ranked", value: "2" }, { name: "casual", value: "1" }, { name: "private", value: "3" })),
  run: async (client, interaction) => {
    let ENCRYPTED = false;
    const opponent = interaction.options.getString("opponent") ?? undefined;
    let username = interaction.options.getString("user");
    if (!username) {
      const userData = JSON.parse(await fs.promises.readFile("./src/db/user-data.json"));
      try {
        username =
          userData[interaction.user.id].MinecraftUserID ??
          (() => {
            throw new Error("no userarg");
          })();
      } catch (err) {
        interaction.reply({ ephmeral: true, content: "Set your minecraft username using /link" });
        return;
      }
      username = username.replace(/!{ENCRYPTED}$/, "");
      ENCRYPTED = true;
    }
    const match_type = interaction.options.getString("type") ?? undefined;
    let page = interaction.options.getInteger("page") ?? 1;

    await run(interaction, username, opponent, ENCRYPTED, match_type, page);
  },
};
