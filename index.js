const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");

// مسارات قاعدة البيانات
const DB_PATH = path.join(dirname, "database.json");
const CONFIG_DB_PATH = path.join(dirname, "config_database.json");

// جلب التوكن بشكل آمن (يعمل محلياً ومع Railway)
let token;
try {
  const config = require("./config.json");
  token = config.token;
} catch (error) {
  token = process.env.TOKEN;
}

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
});

let itemsDatabase = {};
let customSystemEmojis = { mutations: {}, traits: {} };
function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, "utf8");
            itemsDatabase = JSON.parse(data);
            console.log(`[الذاكرة] تم تحميل عدد (${Object.keys(itemsDatabase).length}) شخصية بنجاح من قاعدة البيانات المعزولة!`);
        } else {
            itemsDatabase = {
                "Antonio": { basePrice: 85, strawberry: "0.16", dragon: "6 Dragons", garama: "118.06", income: "125M/s", demand: "■■■■■▢▢▢▢▢ `3/10` ▼", obtained: "First Craft Machine", status: "Unstable", type: "SECRET", customEmoji: "", combosData: {} }
            };
            fs.writeFileSync(DB_PATH, JSON.stringify(itemsDatabase, null, 4), "utf8");
        }
        
        if (fs.existsSync(CONFIG_DB_PATH)) {
            const configData = fs.readFileSync(CONFIG_DB_PATH, "utf8");
            customSystemEmojis = JSON.parse(configData);
        } else {
            fs.writeFileSync(CONFIG_DB_PATH, JSON.stringify(customSystemEmojis, null, 4), "utf8");
        }
    } catch (err) { console.error("Error loading databases:", err); }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(itemsDatabase, null, 4), "utf8");
    } catch (err) { console.error("Error saving database:", err); }
}

function saveConfigDatabase() {
    try {
        fs.writeFileSync(CONFIG_DB_PATH, JSON.stringify(customSystemEmojis, null, 4), "utf8");
    } catch (err) { console.error("Error saving config database:", err); }
}

loadDatabase();
const mutationsList = [
    "Gold", "Diamond", "Bloodrot", "Candy", "Lava", "Galaxy", 
    "Yin Yang", "Radioactive", "Cursed", "Rainbow", "Divine", "Cyber", "Phantom"
];

const mutationMultipliers = { 
    "phantom": 10.0, "cyber": 8.5, "rainbow": 7.0, "divine": 6.0, "cursed": 5.0,
    "radioactive": 4.25, "yin yang": 3.5, "galaxy": 3.0, "lava": 2.5, "candy": 2.0,
    "bloodrot": 1.75, "diamond": 1.5, "gold": 1.25 
};

const mutationColors = {
    "gold": "#FFD700", "diamond": "#B9F2FF", "bloodrot": "#8B0000", "candy": "#FF69B4",
    "lava": "#FF4500", "galaxy": "#8A2BE2", "yin yang": "#000000", "radioactive": "#00FF00",
    "cursed": "#4B0082", "rainbow": "#FF00FF", "divine": "#FFFFFF", "cyber": "#00FFFF", "phantom": "#191970"
};
function getEmbedColor(mutName) {
    if (!mutName || mutName === "none" || mutName === "None") return "#FF0000";
    return mutationColors[mutName.toLowerCase()] || "#FF0000";
}

let userSelections = {};
let activeCommandDemands = {}; 
let activeCheckSession = {}; 

function getItemData(name) { 
    return itemsDatabase[name] || { 
        basePrice: 0, 
        strawberry: "—", 
        dragon: "—", 
        garama: "—", 
        income: "Not Set Yet", 
        demand: "▢▢▢▢▢▢▢▢▢▢ `0/10` ▬", 
        obtained: "Not Set Yet", 
        status: "Unknown", 
        type: "SECRET", 
        customEmoji: "", 
        combosData: {}
    }; 
}
function getMutationEmoji(clientInstance, guild, mutName) {
    if (!mutName || mutName === "none") return "";
    const m = mutName.toLowerCase();
    if (customSystemEmojis.mutations[m]) return customSystemEmojis.mutations[m];
    
    const formattedKey = m.replace(/\s+/g, '_');
    if (formattedKey === "diamond") return "<:diamondmutation:1532203097873580133>"; 
    if (formattedKey === "phantom") return "<:phantommutation:1532203093511635114>"; 
    
    const emoji = guild.emojis.cache.find(e => e.name.toLowerCase() === formattedKey || e.name.toLowerCase() === m);
    if (emoji) return `<:${emoji.name}:${emoji.id}>`;
    return "◽";
}

function getTraitCustomEmoji(guild, traitName) {
    if (!traitName || traitName.toLowerCase() === "none") return "";
    const t = traitName.toLowerCase();
    if (customSystemEmojis.traits[t]) return customSystemEmojis.traits[t];
    return "🏷️";
}
function getItemEmoji(guild, name, mutName = "none") {
    const cleanName = name ? name.toLowerCase().replace(/\s+/g, '_') : "";
    if (mutName && mutName.toLowerCase() !== "none") return "";
    
    let baseEmoji = "<:1509485493803290666:1537149336641609788>";
    const boxEmoji = "<:1509485493803290666:1537149336641609788>";
    
    const data = itemsDatabase[name];
    if (data && data.customEmoji) { baseEmoji = data.customEmoji; } else {
        const staticMap = {
            "arcadragon": "<:Arcadragon_Brainrot:1537321826034778112>", "bearito_cabinito": "<:Bearito_Cabinito:1537332844597088286>", 
            "boppin_bunny": "<:Boppin_Bunny:1537334991023906887>", "bunny_and_eggy": "<:Bunny_and_Eggy:1537336497454325831>", 
            "burguro_and_fryuro": "<:BurguroAndFryuro:1537336582674321518>", "capitano_moby": "<:Capitano_Moby:1537336606476730368>", 
            "cash_or_card": "<:Cash_or_Card_New:1537340055612424252>", "caylusaurus": "<:CAYLSERES:1537340080832782376>", 
            "celestial_pegasus": "<:Celestial_Pegasus:1537344826553667604>", "cerberus": "<:Cerberus:1537346078163214376>", 
            "chillin_chili": "<:Chilin:1537346123726069820>", "chipso_and_queso": "<:Chipsoqueso:1537346234770137159>", 
            "cloverat_clapat": "<:Cloverat_Clapat:1537346196782321694>", "cooki_and_milki": "<:Cooki_and_Milki:1537346259226984459>", 
            "dragon_aquanini": "<:Dragon_aquanini_but_high_graphis:1537346331813875712>"
        };
        if (staticMap[cleanName]) baseEmoji = staticMap[cleanName]; else {
            const found = guild.emojis.cache.find(e => e.name.toLowerCase() === cleanName || e.name.toLowerCase() === name.toLowerCase());
            if (found) baseEmoji = `<:${found.name}:${found.id}>`;
        }
    }
    return baseEmoji === boxEmoji ? baseEmoji : `${baseEmoji}${boxEmoji}`;
}
function getItemImageURL(guild, name) {
    if (!name) return null;
    const data = itemsDatabase[name];
    if (data && data.customEmoji && data.customEmoji.includes(":")) {
        try {
            const emojiId = data.customEmoji.split(":").pop().replace(">", "");
            const customEmojiObj = guild.emojis.cache.get(emojiId);
            if (customEmojiObj) return customEmojiObj.imageURL({ extension: "png", size: 512 });
        } catch(e) { console.error(e); }
    }
    const cleanName = name.toLowerCase().replace(/\s+/g, '_');
    const staticIds = {
        "arcadragon": "1537321826034778112", "bearito_cabinito": "1537332844597088286", "boppin_bunny": "1537334991023906887", 
        "bunny_and_eggy": "1537336497454325831", "burguro_and_fryuro": "1537336582674321518", "capitano_moby": "1537336606476730368", 
        "cash_or_card": "1537340055612424252", "caylusaurus": "1537340080832782376", "celestial_pegasus": "1537344826553667604", 
        "cerberus": "1537346078163214376", "chillin_chili": "1537346123726069820", "chipso_and_queso": "1537346234770137159", 
        "cloverat_clapat": "1537346196782321694", "cooki_and_milki": "1537346259226984459", "dragon_aquanini": "1537346331813875712",
        "la_easter_grande": "1537346259226984459", "la_extinct_grande": "1537340080832782376", "la_food_combinasion": "1537336582674321518",
        "la_jolly_grande": "1537334991023906887", "la_romantic_grande": "1537336497454325831", "la_secret_combinasion": "1537340055612424252",
        "la_spooky_grande": "1537346078163214376", "la_supreme_combinasion": "1537344826553667604", "la_taco_combinasion": "1537346234770137159",
        "fragola_la_la_la": "1537336497454325831"
    };
    if (staticIds[cleanName]) {
        const emoji = guild.emojis.cache.get(staticIds[cleanName]);
        if (emoji) return emoji.imageURL({ extension: "png", size: 512 });
    }
    const emo = guild.emojis.cache.find(e => e.name.toLowerCase() === cleanName || e.name.toLowerCase() === name.toLowerCase());
    return emo ? emo.imageURL({ extension: "png", size: 512 }) : null;
}

function getStrawberryElephantEmoji(guild) {
    if (customSystemEmojis.traits["strawberry"]) return customSystemEmojis.traits["strawberry"];
    const e = guild.emojis.cache.find(em => em.name.toLowerCase() === "strawberry_elephant" || em.name.toLowerCase() === "strawberryelephant");
    return e ? `<:${e.name}:${e.id}>` : "🦊";
}

function getDragonCannelloniFieldEmoji(guild) {
    if (customSystemEmojis.traits["dragon"]) return customSystemEmojis.traits["dragon"];
    const e = guild.emojis.cache.find(em => em.name.toLowerCase() === "dragon_cannelloni" || em.name.toLowerCase() === "dragoncannelloni");
    return e ? `<:${e.name}:${e.id}>` : "🐉";
}
function generateMutationMenu(guild, cleanName, userId) {
    if (!userSelections[userId]) userSelections[userId] = { mutation: "none" };
    const data = getItemData(cleanName), sm = userSelections[userId].mutation || "none";
    let cp = String(data.basePrice);
    const comboKey = `${sm.toLowerCase()}_none`;
    
    if (data.combosData && data.combosData[comboKey]) cp = String(data.combosData[comboKey].basePrice);
    else if (sm && sm !== "none") cp = String(data.basePrice * (mutationMultipliers[sm.toLowerCase()] || 1.0));
    
    const priceDisplay = isNaN(parseFloat(cp)) ? cp : `$${parseFloat(cp).toFixed(2)}`;
    const embed = new Discord.EmbedBuilder().setColor(getEmbedColor(sm)).setTitle(`💵 🧸 ${cleanName} • ${sm !== "none" ? getMutationEmoji(client, guild, sm)+sm : "No mutation"}`).setDescription(`**${priceDisplay}**\n\nTap mutations below, or 🔍 **Search**.`);
    const imgUrl = getItemImageURL(guild, cleanName); 
    if (imgUrl) { embed.setThumbnail(imgUrl); embed.setImage(imgUrl); }

    const mOpts = mutationsList.map(m => ({ label: m, value: m })); mOpts.unshift({ label: "🚫 No mutation", value: "none" });
    const mSel = new Discord.StringSelectMenuBuilder().setCustomId(`ms_${cleanName.replace(/\s+/g, '_')}`).setPlaceholder(`Selected: ${sm}`).addOptions(mOpts.slice(0, 25));
    
    const cid = cleanName.replace(/\s+/g, '_');
    const row = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder().setCustomId(`bsrc_${cid}`).setLabel("🔍 Search").setStyle(1), 
        new Discord.ButtonBuilder().setCustomId(`bclr_${cid}`).setLabel("🧹 Clear").setStyle(2), 
        new Discord.ButtonBuilder().setCustomId(`bdon_${cid}`).setLabel("✅ Done").setStyle(3)
    );
    return { embeds: [embed], components: [new Discord.ActionRowBuilder().addComponents(mSel), row] };
}
client.once("ready", async () => {
    const valueCommand = new Discord.SlashCommandBuilder()
        .setName("value")
        .setDescription("يعرض قيم وأسعار العناصر")
        .addStringOption(o => o.setName("name").setDescription("اسم العنصر").setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName("mutation").setDescription("الـ Mutation").setRequired(false).setAutocomplete(true));

    const checkCommand = new Discord.SlashCommandBuilder()
        .setName("valuecheck")
        .setDescription("تحديث وتجديد أسعار وبيانات الشخصيات والطفرات بالكامل")
        .addStringOption(o => o.setName("name").setDescription("اسم الشخصية المراد تجديدها").setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName("mutation").setDescription("تحديد الطفرة (اختياري)").setRequired(false).setAutocomplete(true))
        .addStringOption(o => o.setName("demand").setDescription("تعديل حالة الطلب ومؤشر الأسعار (Demand) - اختياري").setRequired(false));
        
    const editFullDetailsCommand = new Discord.SlashCommandBuilder()
        .setName("edit_full_details")
        .setDescription("تعديل كامل لخانات وتفاصيل الـ Full Details لأي شخصية بالسيرفر")
        .addStringOption(o => o.setName("name").setDescription("اختر اسم الشخصية").setRequired(true).setAutocomplete(true));

    const additemCommand = new Discord.SlashCommandBuilder()
        .setName("additem")
        .setDescription("إضافة شخصية جديدة بالكامل وسعرها ونوع فئتها وإيموجي مخصص مباشرة من ديسكورد")
        .addStringOption(o => o.setName("name").setDescription("اسم الشخصية الجديدة").setRequired(true))
        .addNumberOption(o => o.setName("price").setDescription("السعر الأساسي").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("نوع فئة الشخصية").setRequired(true).addChoices({ name: "SECRET", value: "SECRET" }, { name: "OG", value: "OG" }, { name: "BRAINROT GOD", value: "BRAINROT GOD" }))
        .addStringOption(o => o.setName("emoji").setDescription("ضع إيموجي الشخصية أو ملصقها المخصص هنا").setRequired(false));

    const edititemCommand = new Discord.SlashCommandBuilder()
        .setName("edititem")
        .setDescription("تعديل شامل لبيانات وإيموجيات ونصوص الشخصية وقاعدة البيانات")
        .addStringOption(o => o.setName("target").setDescription("اختر الشخصية المراد تعديلها").setRequired(false).setAutocomplete(true))
        .addBooleanOption(o => o.setName("delete_item").setDescription("حذف هذه الشخصية نهائياً من النظام").setRequired(false))
        .addStringOption(o => o.setName("new_name").setDescription("اسم جديد بالكامل للشخصية (اختياري)").setRequired(false))
        .addStringOption(o => o.setName("new_emoji").setDescription("إيموجي مخصص جديد، أو اكتب delete لحذفه (اختياري)").setRequired(false))
        .addNumberOption(o => o.setName("new_price").setDescription("تعديل السعر الأساسي لشخصية (اختياري)").setRequired(false))
        .addStringOption(o => o.setName("new_obtained").setDescription("تعديل خانة (صنع من) في الـ Full Details").setRequired(false))
        .addStringOption(o => o.setName("new_income").setDescription("تعديل حقل (سعر الشخصية/الإنتاج) في الـ Full Details").setRequired(false))
        .addStringOption(o => o.setName("new_status").setDescription("تعديل خانة الـ Status في الـ Full Details").setRequired(false))
        .addStringOption(o => o.setName("strawberry_emoji").setDescription("تعديل إيموجي حقل Strawberry المخصص للشخصية").setRequired(false))
        .addStringOption(o => o.setName("dragon_emoji").setDescription("تعديل إيموجي حقل Dragon المخصص للشخصية").setRequired(false))
        .addStringOption(o => o.setName("global_mutation").setDescription("تعديل إيموجي طفرة عامة بالسيرفر (اختياري)").setRequired(false).setAutocomplete(true))
        .addStringOption(o => o.setName("global_trait").setDescription("تعديل إيموجي صفة عامة بالسيرفر (اختياري)").setRequired(false).setAutocomplete(true))
        .addStringOption(o => o.setName("global_emoji_value").setDescription("ضع الإيموجي الجديد للطفرة أو الصفة المحددة بالأعلى (اختياري)").setRequired(false));
    
    try { 
        await client.application.commands.set([valueCommand, checkCommand, editFullDetailsCommand, additemCommand, edititemCommand]); 
        console.log(`[متصل] تم تحميل النظام بنجاح: ${client.user.tag}`); 
    } catch (err) { console.error(err); }
});
client.on("interactionCreate", async (i) => {
    try {
        if (i.isAutocomplete()) {
            const f = i.options.getFocused(true); 
            const dynamicList = Object.keys(itemsDatabase);
            let list = f.name === 'name' || f.name === 'target' ? dynamicList : mutationsList;
            const filtered = list.filter(c => c.toLowerCase().includes(f.value.toLowerCase())); 
            if (!i.responded) await i.respond(filtered.slice(0, 25).map(c => ({ name: c, value: c }))); 
            return;
        }

        if (i.isChatInputCommand()) {
            if (i.commandName === "edititem") {
                if (i.channel.name !== "تجديد・الفاليو〡♻️") return await i.reply({ content: "❌ **عذراً، استخدام أمر التعديل متاح فقط في روم تجديد・الفاليو〡♻️**", flags: [Discord.MessageFlags.Ephemeral] });
                
                const target = i.options.getString("target");
                const deleteFlag = i.options.getBoolean("delete_item");
                const newName = i.options.getString("new_name");
                const newEmoji = i.options.getString("new_emoji");
                const newPrice = i.options.getNumber("new_price");
                const newObtained = i.options.getString("new_obtained");
                const newIncome = i.options.getString("new_income");
                const newStatus = i.options.getString("new_status");
                const strawEmoji = i.options.getString("strawberry_emoji");
                const dragEmoji = i.options.getString("dragon_emoji");
                const globMut = i.options.getString("global_mutation");
                const globTrait = i.options.getString("global_trait");
                const globVal = i.options.getString("global_emoji_value");

                if (target && !itemsDatabase[target]) return await i.reply({ content: "❌ **عذراً، الشخصية المحددة غير موجودة بقاعدة البيانات**", flags: [Discord.MessageFlags.Ephemeral] });
                
                if (target && deleteFlag === true) { 
                    delete itemsDatabase[target]; 
                    saveDatabase(); 
                    return await i.reply({ embeds: [new Discord.EmbedBuilder().setColor("#FF0000").setTitle("🗑️ تم حذف الشخصية نهائياً!").setDescription(`قام الإداري **${i.user.username}** بإسقاط وحذف شخصية \`${target}\` بالكامل من قاعدة البيانات.`).setTimestamp()] }); 
                }

                let logMsg = `قام الإداري **${i.user.username}** بعمل التعديلات التالية:\n`;
                if (target) {
                    if (newName) { 
                        itemsDatabase[newName] = itemsDatabase[target]; 
                        if(newName !== target) delete itemsDatabase[target]; 
                        logMsg += `• تغيير الاسم من \`${target}\` إلى \`${newName}\`\n`; 
                    }
                    const currentKey = newName || target;
                    if (newEmoji) { 
                        if(newEmoji.toLowerCase() === "delete") { 
                            itemsDatabase[currentKey].customEmoji = ""; 
                            logMsg += "• تم حذف الإيموجي المخصص للشخصية والعودة للافتراضي\n"; 
                        } else { 
                            itemsDatabase[currentKey].customEmoji = newEmoji; 
                            logMsg += `• تحديث إيموجي الشخصية إلى: ${newEmoji}\n`; 
                        } 
                    }
                    if (newPrice) { 
                        itemsDatabase[currentKey].basePrice = newPrice; 
                        logMsg += `• تحديث السعر الأساسي للشخصية إلى \`$${newPrice}\`\n`; 
                    }
                    if (newObtained) { 
                        itemsDatabase[currentKey].obtained = newObtained; 
                        logMsg += `• تحديث حقل (صنع من) إلى: \`${newObtained}\`\n`; 
                    }
                    if (newIncome) { 
                        itemsDatabase[currentKey].income = newIncome; 
                        logMsg += `• تحديث حقل (سعر الشخصية/الإنتاج) إلى: \`${newIncome}\`\n`; 
                    }
                    if (newStatus) { 
                        itemsDatabase[currentKey].status = newStatus; 
                        logMsg += `• تحديث حالة الشخصية (Status) إلى: \`${newStatus}\`\n`; 
                    }
                    if (strawEmoji) { 
                        itemsDatabase[currentKey].customStrawberryEmoji = strawEmoji; 
                        logMsg += `• تحديث إيموجي حقل Strawberry للشخصية إلى: ${strawEmoji}\n`; 
                    }
                    if (dragEmoji) { 
                        itemsDatabase[currentKey].customDragonEmoji = dragEmoji; 
                        logMsg += `• تحديث إيموجي حقل Dragon للشخصية إلى: ${dragEmoji}\n`; 
                    }
                }

                if (globMut && globVal) { 
                    customSystemEmojis.mutations[globMut.toLowerCase()] = globVal; 
                    saveConfigDatabase(); 
                    logMsg += `• تحديث إيموجي طفرة \`${globMut}\` عامة إلى: ${globVal}\n`; 
                }
                if (globTrait && globVal) { 
                    customSystemEmojis.traits[globTrait.toLowerCase()] = globVal; 
                    saveConfigDatabase(); 
                    logMsg += `• تحديث إيموجي صفة \`${globTrait}\` عامة إلى: ${globVal}\n`; 
                }

                saveDatabase(); 
                return await i.reply({ embeds: [new Discord.EmbedBuilder().setColor("#FFFF00").setTitle("🔄 تم تعديل وتحديث البيانات بنجاح!").setDescription(logMsg).setTimestamp()] });
            }
            if (i.commandName === "edit_full_details") {
                if (i.channel.name !== "تجديد・الفاليو〡♻️") return await i.reply({ content: "❌ **عذراً، هذا الأمر متاح فقط في روم تجديد・الفاليو〡♻️**", flags: [Discord.MessageFlags.Ephemeral] });
                const targetChar = i.options.getString("name");
                if (!itemsDatabase[targetChar]) return await i.reply({ content: "❌ **هذه الشخصية غير مسجلة in قاعدة البيانات**", flags: [Discord.MessageFlags.Ephemeral] });
                const currentData = itemsDatabase[targetChar];
                
                const modalId = `fd_edit_${targetChar.replace(/\s+/g, '-')}`;
                const modal = new Discord.ModalBuilder().setCustomId(modalId).setTitle(`⚙️ تفاصيل: ${targetChar}`);
                
                modal.addComponents(
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("fd_obtained").setLabel("خيار (صنع من)").setValue(currentData.obtained || "Basic Craft").setStyle(Discord.TextInputStyle.Short).setRequired(true)),
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("fd_income").setLabel("خيار (سعر الشخصية/الإنتاج)").setValue(currentData.income || "10M/s").setStyle(Discord.TextInputStyle.Short).setRequired(true)),
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("fd_status").setLabel("خيار (حالة الثبات Status)").setValue(currentData.status || "Stable").setStyle(Discord.TextInputStyle.Short).setRequired(true))
                );
                return await i.showModal(modal);
            }

            if (i.commandName === "additem") {
                if (i.channel.name !== "تجديد・الفاليو〡♻️") return await i.reply({ content: "❌ **عذراً، أمر إضافة الشخصيات متاح فقط في روم تجديد・الفاليو〡♻️**", flags: [Discord.MessageFlags.Ephemeral] });
                const newName = i.options.getString("name"), newPrice = i.options.getNumber("price"), newType = i.options.getString("type"), newEmoji = i.options.getString("emoji") || "";
                
                itemsDatabase[newName] = { 
                    basePrice: newPrice, strawberry: "0.05", dragon: "1 Dragons", garama: "15.00", 
                    income: "10M/s", demand: "■■▢▢▢▢▢▢▢▢ `2/10` ▬", obtained: "Custom Command Added", status: "Stable", type: newType, customEmoji: newEmoji, combosData: {} 
                };
                
                saveDatabase(); 
                return await i.reply({ 
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setColor("#00FF00")
                            .setTitle("✅ تم إضافة شخصية جديدة بنجاح!")
                            .setDescription(`قام الإداري **${i.user.username}** بإنشاء حقل الشخصية فوراً.`)
                            .addFields(
                                { name: "🧸 اسم الشخصية", value: `\`${newName}\``, inline: true }, 
                                { name: "💵 السعر المعتمد", value: `\`$${newPrice.toFixed(2)}\``, inline: true }, 
                                { name: "🏷️ فئة ونوع الفخامة", value: `\`${newType}\``, inline: true }, 
                                { name: "✨ الإيموجي المربوط", value: newEmoji ? newEmoji : "`None`", inline: true }
                            )
                            .setTimestamp()
                    ] 
                });
            }
            if (i.commandName === "valuecheck") {
                if (i.channel.name !== "تجديد・الفاليو〡♻️") return await i.reply({ content: "❌ **عذراً، استخدام في روم تجديد・الفاليو〡♻️**", flags: [Discord.MessageFlags.Ephemeral] });
                
                const targetItem = i.options.getString("name");
                const selectedMut = i.options.getString("mutation") || "none";
                const inputDemand = i.options.getString("demand");
                const currentData = getItemData(targetItem);
                
                let displayPrice = String(currentData.basePrice);
                let displayStraw = currentData.strawberry;
                let displayDragon = currentData.dragon;
                let displayGarama = currentData.garama || "15.00";
                let displayDemand = currentData.demand; 
                let displayIncome = currentData.income || "10M/s";
                
                const comboKey = `${selectedMut.toLowerCase()}_none`;
                if (currentData.combosData && currentData.combosData[comboKey]) { 
                    const cData = currentData.combosData[comboKey]; 
                    displayPrice = String(cData.basePrice);
                    displayStraw = cData.strawberry;
                    displayDragon = cData.dragon;
                    displayGarama = cData.carama || cData.garama;
                    displayDemand = cData.demand; 
                    if (cData.income) displayIncome = cData.income;
                } else if (selectedMut !== "none") { 
                    displayPrice = String(currentData.basePrice * (mutationMultipliers[selectedMut.toLowerCase()] || 1.0)); 
                }
                
                activeCheckSession[i.user.id] = { targetItem, selectedMut, demand: inputDemand || displayDemand };
                const modal = new Discord.ModalBuilder().setCustomId("edf").setTitle(`📝 خانات توليفة: ${selectedMut}`); 
                
                modal.addComponents(
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("new_price").setLabel("السعر المخصص").setValue(displayPrice).setStyle(Discord.TextInputStyle.Short).setRequired(true)), 
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("new_strawberry").setLabel("قيمة Strawberry Elephant").setValue(displayStraw).setStyle(Discord.TextInputStyle.Short).setRequired(true)), 
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("new_dragon").setLabel("قيمة Dragon Cannelloni").setValue(displayDragon).setStyle(Discord.TextInputStyle.Short).setRequired(true)), 
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("new_garama").setLabel("قيمة Garama And Madundung").setValue(displayGarama).setStyle(Discord.TextInputStyle.Short).setRequired(true)), 
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("new_income").setLabel("سعر الشخصية (حقل منفصل كلياً)").setValue(displayIncome).setStyle(Discord.TextInputStyle.Short).setRequired(true))
                ); 
                return await i.showModal(modal);
            }
            if (i.commandName === "value") {
                if (i.channel.name !== "فاليو〡💰") return await i.reply({ content: "❌ **عذراً، يمكنك استخدام أمر الأسعار فقط في روم فاليو〡💰**", flags: [Discord.MessageFlags.Ephemeral] });
                
                await i.deferReply(); 
                let name = i.options.getString("name");
                const mut = i.options.getString("mutation") || "none";
                
                if (!itemsDatabase[name]) {
                    const allItems = Object.keys(itemsDatabase);
                    let closestName = null;
                    let highestScore = 0;
                    
                    allItems.forEach(item => {
                        let score = 0;
                        const minLen = Math.min(name.length, item.length);
                        for (let idx = 0; idx < minLen; idx++) {
                            if (name.toLowerCase()[idx] === item.toLowerCase()[idx]) score++;
                        }
                        if (score > highestScore) {
                            highestScore = score;
                            closestName = item;
                        }
                    });
                    
                    if (closestName && highestScore >= 2) {
                        name = closestName;
                    } else {
                        const noItemEmbed = new Discord.EmbedBuilder()
                            .setColor("#FF0000")
                            .setTitle("❌ شخصية غير مسجلة")
                            .setDescription(`عذراً، لا توجد هذه الشخصية \`${name}\` في قاعدة بيانات السوق حالياً!\n\n💡 **تلميح:** تأكد من إدخال الاسم بشكل صحيح أو استخدام خيار الإكمال التلقائي.`)
                            .setTimestamp();
                        return await i.editReply({ embeds: [noItemEmbed] });
                    }
                }
                
                const data = getItemData(name);
                let p = String(data.basePrice), strVal = data.strawberry, draVal = data.dragon, garVal = data.garama || "15.00", demVal = data.demand, finalTime = "لم يتم التجديد بعد", finalIncome = data.income || "10M/s"; 
                const comboKey = `${mut.toLowerCase()}_none`;
                
                if (data.combosData && data.combosData[comboKey]) { 
                    const cData = data.combosData[comboKey]; 
                    p = String(cData.basePrice); 
                    strVal = cData.strawberry; 
                    draVal = cData.dragon; 
                    garVal = cData.garama || cData.carama; 
                    demVal = cData.demand; 
                    if(cData.income) finalIncome = cData.income; 
                    if (cData.lastUpdated) finalTime = cData.lastUpdated; 
                } else if (mut && mut !== "none") { 
                    p = String(data.basePrice * (mutationMultipliers[mut.toLowerCase()] || 1.0)); 
                    if (data.lastUpdated) finalTime = data.lastUpdated;
                } else {
                    if (data.lastUpdated) finalTime = data.lastUpdated;
                }
                
                if (finalTime === "لم يتم التجديد بعد") {
                    p = "0.00";
                    strVal = "—";
                    draVal = "—";
                    garVal = "—";
                    finalIncome = "—";
                    demVal = "▢▢▢▢▢▢▢▢▢▢ `0/10` ▬";
                }
                
                let priceDisplay = isNaN(parseFloat(p)) ? p : `$${parseFloat(p).toFixed(2)}`; 
                const currentType = data.type || "SECRET";
                
                const currentStrawEmoji = data.customStrawberryEmoji || getStrawberryElephantEmoji(i.guild);
                const currentDragEmoji = data.customDragonEmoji || getDragonCannelloniFieldEmoji(i.guild);
                
                const embed = new Discord.EmbedBuilder()
                    .setColor(getEmbedColor(mut))
                    .setTitle(mut !== "none" ? `${getItemEmoji(i.guild, name, mut)}${name} — ${getMutationEmoji(client, i.guild, mut)} ${mut}` : `${getItemEmoji(i.guild, name, mut)}${name}`)
                    .setDescription(currentType)
                    .addFields(
                        { name: "📊 **Values**", value: "\u200B" }, 
                        { name: "💵 **سعر الشراء**", value: `— \`${priceDisplay}\`` }, 
                        { name: "Strawberry Elephant", value: `— ${currentStrawEmoji} \`${strVal}\`` }, 
                        { name: "Dragon Cannelloni", value: `— ${currentDragEmoji} \`${draVal}\`` }, 
                        { name: "Garama And Madundung", value: `— <:1498055902828171366:1537164414577410048> \`${garVal}\`` }, 
                        { name: "📈 **سعر الشخصية**", value: `— \`${finalIncome}\`` }, 
                        { name: "📊 **الطلب على الشخصية**", value: demVal }, 
                        { name: "🔒 **Availability**", value: "— ❌ **Unobtainable**" }, 
                        { name: "🛠️ **صنع من**", value: `— ${data.obtained || "Basic Craft"}` }, 
                        { name: "📌 **Status**", value: `— ${data.status || "Stable"}` }, 
                        { name: "📅 آخر تجديد فاليو للشخصية", value: finalTime }
                    )
                    .setFooter({ text: "SAB Market Value" });
                
                const imgUrl = getItemImageURL(i.guild, name); 
                if (i.guild && imgUrl) { 
                    embed.setThumbnail(imgUrl); 
                    embed.setImage(imgUrl); 
                }
                
                const actionRow = new Discord.ActionRowBuilder().addComponents(
                    new Discord.ButtonBuilder().setCustomId(`fd_${name.replace(/\s+/g, '_')}`).setLabel("📄 Full Details").setStyle(2), 
                    new Discord.ButtonBuilder().setCustomId(`tm_${name.replace(/\s+/g, '_')}`).setLabel("🪐 Mutations & value").setStyle(1), 
                    new Discord.ButtonBuilder().setCustomId(`rp_${name.replace(/\s+/g, '_')}`).setLabel("🚩 شكوى").setStyle(2)
                );
                
                return await i.editReply({ embeds: [embed], components: [actionRow] });
            }
        }
        if (i.isModalSubmit()) {
            if (i.customId.startsWith("fd_edit_")) {
                const targetChar = i.customId.split("_").slice(2).join(" ").replace(/-/g, " ");
                if (!itemsDatabase[targetChar]) return await i.reply({ content: "❌ حدث خطأ، لم يتم العثور على الشخصية", flags: [Discord.MessageFlags.Ephemeral] });
                
                const fObtained = i.fields.getTextInputValue("fd_obtained");
                const fIncome = i.fields.getTextInputValue("fd_income");
                const fStatus = i.fields.getTextInputValue("fd_status");
                
                itemsDatabase[targetChar].obtained = fObtained;
                itemsDatabase[targetChar].income = fIncome;
                itemsDatabase[targetChar].status = fStatus;
                saveDatabase();
                
                return await i.reply({ embeds: [new Discord.EmbedBuilder().setColor("#00FF00").setTitle("✅ تم تحديث كرت الـ Full Details بنجاح!").setDescription(`قام الإداري **${i.user.username}** بتعديل تفاصيل حقول الشخصية \`${targetChar}\` بنجاح داخل قاعدة البيانات المعزولة.`).addFields({ name: "🛠️ صنع من", value: `\`${fObtained}\``, inline: true }, { name: "📈 سعر الشخصية/الإنتاج", value: `\`${fIncome}\``, inline: true }, { name: "📌 الحالة (Status)", value: `\`${fStatus}\``, inline: true }).setTimestamp()] });
            }

            if (i.customId === "edf") {
                const session = activeCheckSession[i.user.id];
                if (!session) return await i.reply({ content: "❌ **انتهت الجلسة، يرجى كتابة الأمر مجدداً بشكل طبيعي.**", flags: [Discord.MessageFlags.Ephemeral] });
                
                const { targetItem, selectedMut, demand } = session;
                const newPrice = i.fields.getTextInputValue("new_price"), newStrawberry = i.fields.getTextInputValue("new_strawberry"), newDragon = i.fields.getTextInputValue("new_dragon"), newGarama = i.fields.getTextInputValue("new_garama"), newIncome = i.fields.getTextInputValue("new_income");
                
                delete activeCheckSession[i.user.id]; 

                if (!itemsDatabase[targetItem]) itemsDatabase[targetItem] = { income: "Not Set Yet", obtained: "Not Set Yet", status: "Unknown", type: "SECRET", customEmoji: "", combosData: {} };
                if (!itemsDatabase[targetItem].combosData) itemsDatabase[targetItem].combosData = {};
                
                const currentTimestamp = `بواسطة \`${i.user.username}\` في <t:${Math.floor(Date.now() / 1000)}:f>`;
                
                if (!selectedMut || selectedMut.toLowerCase() === "none") {
                    itemsDatabase[targetItem].basePrice = Number(newPrice) || newPrice;
                    itemsDatabase[targetItem].strawberry = newStrawberry;
                    itemsDatabase[targetItem].dragon = newDragon;
                    itemsDatabase[targetItem].garama = newGarama;
                    itemsDatabase[targetItem].income = newIncome;
                    itemsDatabase[targetItem].demand = demand;
                    itemsDatabase[targetItem].lastUpdated = currentTimestamp;
                }
                
                const comboKey = `${String(selectedMut || "none").toLowerCase()}_none`;
                let oldPrice = itemsDatabase[targetItem].combosData[comboKey] ? String(itemsDatabase[targetItem].combosData[comboKey].basePrice) : String(itemsDatabase[targetItem].basePrice || "لا يوجد");
                
                itemsDatabase[targetItem].combosData[comboKey] = { basePrice: newPrice, strawberry: newStrawberry, dragon: newDragon, garama: newGarama, income: newIncome, demand: demand, lastUpdated: currentTimestamp };
                saveDatabase(); 
                
                const finalImgUrl = getItemImageURL(i.guild, targetItem);
                const updateEmbed = new Discord.EmbedBuilder().setColor(getEmbedColor(selectedMut)).setTitle(`🔄 تم تجديد وتحديث الفاليو بنجاح!`).setDescription(`قام الإداري **${i.user.username}** بتحديث بيانات حقول عنصر في السوق فوراً وبأعلى استقرار وآمن وثبات دائم في الداتابيز.`).addFields({ name: "🧸 اسم الشخصية", value: `\`\`\`\n${targetItem}\`\`\``, inline: true }, { name: "✨ الطفرة المحددة", value: `\`\`\`\n${selectedMut || "بدون طفرة"}\`\`\``, inline: true }, { name: "📉 السعر القديم", value: `\`${isNaN(parseFloat(oldPrice)) ? oldPrice : `$${parseFloat(oldPrice).toFixed(2)}`}\``, inline: true }, { name: "📈 السعر الجديد", value: `\`${isNaN(parseFloat(newPrice)) ? newPrice : `$${parseFloat(newPrice).toFixed(2)}`}\``, inline: true }, { name: "📈 سعر الشخصية المنفصل (الإنتاج)", value: `\`${newIncome}\`` }, { name: "📊 حالة الطلب", value: `\`${demand}\`` }, { name: "📅 وقت التجديد الحالي", value: currentTimestamp }).setFooter({ text: "نظام إدارة وتجديد الأسعار التلقائي" }).setTimestamp();
                if (finalImgUrl) { updateEmbed.setThumbnail(finalImgUrl); updateEmbed.setImage(finalImgUrl); }
                
                const targetChannel = i.guild.channels.cache.find(c => c.name === "تجديد・الفاليو〡♻️");
                if (targetChannel) await targetChannel.send({ embeds: [updateEmbed] });
                return await i.reply({ content: "✅ **تم تعديل الفاليو بنجاح، وتثبيته بشكل دائم داخل ملف database.json بنجاح صاروخي!**", flags: [Discord.MessageFlags.Ephemeral] });
            }

            if (i.customId.startsWith("mdrp_")) {
                const charName = i.customId.split("_").slice(1).join(" ").replace(/_/g, " ");
                const issueType = i.fields.getTextInputValue("issue_type"); const issueDetails = i.fields.getTextInputValue("issue_details");
                const targetChannel = i.guild.channels.cache.find(c => c.name === "تجديد・الفاليو〡♻️");
                
                const reportEmbed = new Discord.EmbedBuilder().setColor("#FF0000").setTitle("🚩 بلاغ وشكوى جديدة حول الفاليو").setDescription(`قام العضو **${i.user.username}** (ID: \`${i.user.id}\`) بتقديم بلاغ فوري عن شخصية في السوق.`).addFields({ name: "🧸 الشخصية المستهدفة", value: `\`${charName}\``, inline: true }, { name: "📋 موضوع الشكوى", value: `\`\`\`\n${issueType}\`\`\`` }, { name: "🎨 لون الشخصية المرفق", value: `\`\`\`\n${issueDetails}\`\`\`` }).setTimestamp();
                
                const replyActionRow = new Discord.ActionRowBuilder().addComponents(
                    new Discord.ButtonBuilder().setCustomId(`admin_reply_${i.user.id}_${charName.replace(/\s+/g, '-')}`).setLabel("✉️ رد على الشكوى").setStyle(2)
                );

                if (targetChannel) await targetChannel.send({ embeds: [reportEmbed], components: [replyActionRow] });
                return await i.reply({ content: "✅ **تم إرسال شكواك وبلاغك بنجاح إلى روم تجديد・الفاليو〡♻️ للمراجعة الفورية! شكراً لك.**", flags: [Discord.MessageFlags.Ephemeral] });
            }

            if (i.customId.startsWith("submit_rep_")) {
                const parts = i.customId.split("_");
                const targetMemberId = parts[2];
                const charName = parts.slice(3).join(" ").replace(/-/g, " ");
                const adminReplyContent = i.fields.getTextInputValue("admin_reply_text");
                
                const responseEmbed = new Discord.EmbedBuilder()
                    .setColor("#00FFFF")
                    .setTitle("💬 رد إداري حول بلاغ الفاليو")
                    .setDescription(`تمت مراجعة بلاغك الخاص بالشخصية \`${charName}\` من قبل الإدارة.`)
                    .addFields(
                        { name: "👑 المسؤول المراجع", value: `\`${i.user.username}\``, inline: true },
                        { name: "✉️ نص الرد الإداري المعتمد", value: `\`\`\`\n${adminReplyContent}\`\`\`` }
                    )
                    .setTimestamp();
                
                await i.channel.send({ content: `🔔 **رد فوري مخصص للعضو صاحب الشكوى:** <@${targetMemberId}>`, embeds: [responseEmbed] });
                return await i.reply({ content: "✅ **تم إرسال ردك فوراً ومنشن العضو بنجاح كلي!**", flags: [Discord.MessageFlags.Ephemeral] });
            }
        }
        if (i.isStringSelectMenu()) { 
            await i.deferUpdate(); 
            const cleanName = i.customId.split("_").slice(1).join(" ").replace(/_/g, " "); 
            if (!userSelections[i.user.id]) userSelections[i.user.id] = { mutation: "none" }; 
            if (i.customId.startsWith("ms_")) userSelections[i.user.id].mutation = i.values; 
            return await i.editReply(generateMutationMenu(i.guild, cleanName, i.user.id)); 
        } 
        if (i.isButton()) { 
            const cleanButtonName = i.customId.split("_").slice(1).join(" ").replace(/_/g, " "), userId = i.user.id; 
            
            if (i.customId.startsWith("admin_reply_")) {
                const parts = i.customId.split("_");
                const memberId = parts[2];
                const itemChar = parts.slice(3).join("_");
                
                const replyModal = new Discord.ModalBuilder().setCustomId(`submit_rep_${memberId}_${itemChar}`).setTitle("الرد الفوري على الشكوى");
                replyModal.addComponents(
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("admin_reply_text").setLabel("اكتب ردك المعتمد هنا للعضو").setPlaceholder("اكتب هنا نص الرد أو التعديل الذي تم على الفاليو...").setStyle(Discord.TextInputStyle.Paragraph).setRequired(true))
                );
                return await i.showModal(replyModal);
            }

            if (i.customId.startsWith("rp_")) {
                const reportModal = new Discord.ModalBuilder().setCustomId(`mdrp_${cleanButtonName.replace(/\s+/g, '_')}`).setTitle("Report an issue");
                reportModal.addComponents(
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("issue_type").setLabel("Type of issue").setPlaceholder("اكتب ما شكوتك عن الفاليو").setStyle(Discord.TextInputStyle.Short).setRequired(true)), 
                    new Discord.ActionRowBuilder().addComponents(new Discord.TextInputBuilder().setCustomId("issue_details").setLabel("اكتب مالون هذه الشخصيه").setPlaceholder("اكتب هنا كامل تفاصيل الشكوى أو الاقتراح...").setStyle(Discord.TextInputStyle.Paragraph).setRequired(true))
                );
                return await i.showModal(reportModal);
            }
            if (!userSelections[userId]) userSelections[userId] = { mutation: "none" }; 
            
            if (i.customId.startsWith("tm_")) { 
                await i.deferReply({ flags: [Discord.MessageFlags.Ephemeral] }); 
                const menuData = generateMutationMenu(i.guild, cleanButtonName, userId);
                return await i.editReply(menuData); 
            } 
            
            if (i.customId.startsWith("fd_")) { 
                await i.deferReply({ flags: [Discord.MessageFlags.Ephemeral] });
                const d = getItemData(cleanButtonName); 
                const fdEmbed = new Discord.EmbedBuilder().setColor("#FF0000").setTitle(`📄 تفاصيل كاملة للشخصية: ${cleanButtonName}`).setDescription(d.type || "SECRET").addFields({ name: "📈 **سعر الشخصية/الإنتاج**", value: `— \`${d.income || "Not Set Yet"}\`` }, { name: "🛠️ **صنع من**", value: `— \`${d.obtained || "Not Set Yet"}\`` }, { name: "📌 **حالة الثبات (Status)**", value: `— \`${d.status || "Unknown"}\`` }).setFooter({ text: "SAB Market Full Details" });
                const img = getItemImageURL(i.guild, cleanButtonName); if (img) { fdEmbed.setThumbnail(img); fdEmbed.setImage(img); } 
                return await i.editReply({ embeds: [fdEmbed] }); 
            } 
            if (i.customId.startsWith("bclr_")) { await i.deferUpdate(); userSelections[userId] = { mutation: "none" }; return await i.editReply(generateMutationMenu(i.guild, cleanButtonName, userId)); } 
            
            if (i.customId.startsWith("bdon_")) { 
                const data = getItemData(cleanButtonName), m = String(userSelections[userId].mutation || "none"); 
                let fp = String(data.basePrice), finalStr = data.strawberry, finalDra = data.dragon, finalGar = data.garama || "15.00", finalDem = data.demand, finalTime = "لم يتم التجديد بعد", finalIncome = data.income || "10M/s"; 
                
                const comboKey = `${m.toLowerCase()}_none`; 
                if (data.combosData && data.combosData[comboKey]) { 
                    const cData = data.combosData[comboKey]; 
                    fp = String(cData.basePrice); finalStr = cData.strawberry; finalDra = cData.dragon; finalGar = cData.garama || cData.carama; finalDem = cData.demand; 
                    if(cData.income) finalIncome = cData.income; if (cData.lastUpdated) finalTime = cData.lastUpdated; 
                } else if (m !== "none") { fp = String(data.basePrice * (mutationMultipliers[m.toLowerCase()] || 1.0)); }
                let priceDisplay = isNaN(parseFloat(fp)) ? fp : `$${parseFloat(fp).toFixed(2)}`; const currentType = data.type || "SECRET"; 
                const finalEmbed = new Discord.EmbedBuilder().setColor(getEmbedColor(m)).setTitle(m !== "none" ? `${getItemEmoji(i.guild, cleanButtonName, m)} ${cleanButtonName} — ${getMutationEmoji(client, i.guild, m)} ${m}` : `${getItemEmoji(i.guild, cleanButtonName, m)} ${cleanButtonName}`).setDescription(currentType).addFields({ name: "💵 **سعر الشراء**", value: `— \`${priceDisplay}\`` }, { name: "Strawberry Elephant", value: `— \`${finalStr}\`` }, { name: "Dragon Cannelloni", value: `— \`${finalDra}\`` }, { name: "Garama And Madundung", value: `— \`${finalGar}\`` }, { name: "📊 **سعر الشخصية**", value: `— \`${finalIncome}\`` }, { name: "📊 **الطلب على الشخصية**", value: finalDem }).setFooter({ text: "SAB Market Value" });
                const imgUrl = getItemImageURL(i.guild, cleanButtonName); if (imgUrl) { finalEmbed.setThumbnail(imgUrl); finalEmbed.setImage(imgUrl); }
                
                return await i.update({ embeds: [finalEmbed], components: [new Discord.ActionRowBuilder().addComponents(new Discord.ButtonBuilder().setCustomId(`fd_${cleanButtonName.replace(/\s+/g, '_')}`).setLabel("📄 Full Details").setStyle(2), new Discord.ButtonBuilder().setCustomId(`tm_${cleanButtonName.replace(/\s+/g, '_')}`).setLabel("🪐 Mutations & value").setStyle(1), new Discord.ButtonBuilder().setCustomId(`rp_${cleanButtonName.replace(/\s+/g, '_')}`).setLabel("🚩 شكوى").setStyle(2))] }); 
            } 
        } 
    } catch (error) { console.error("Error detected:", error); } 
});

client.on("messageCreate", async (msg) => {
    try {
        if (msg.author.bot) return; 
        if (msg.channel.name === "اقتراحات〡💡") {
            await msg.react("✅"); await msg.react("❌");
        }
    } catch (error) { console.error("Error adding reactions in suggestions channel:", error); }
});

client.login(token);
