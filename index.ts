import { Client, RichEmbed, Message } from 'discord.js';
const client = new Client();

import fs from 'fs'
import axios from "axios";

import yaml from "yaml";

import moment from "moment";


// CONFIG
const config = yaml.parse(fs.readFileSync("config.yaml", "utf8"));
const Commands = config.Commands;
let customCommandMap = loadCommandsFromStorage();
const nasa = config["NASA_API_KEY"];

const forbiddenList: string[] = [
    "crypter",
    "crypté",
    "cryptage",
    "cryptation",
    "encrypter"
];

const chiffrer: RichEmbed = new RichEmbed()
    .setURL("https://chiffrer.info")
    .setAuthor("La Langue Française", "https://chiffrer.info/wp-content/uploads/2016/07/ic_lock_outline_black_48dp_2x.png", "https://chiffrer.info")
    .setTimestamp(new Date().getTime())
    .setDescription("ON DIT CHIFFRER, ET PAS CRYPTER. :-)")

function loadCommandsFromStorage() {
    const file = fs.readFileSync("customCommands.json", "utf8")
    const commandList = JSON.parse(file);
    const commandMap = new Map();
    for (let i = 0; i < commandList.length; i++) {
        let command = commandList[i];
        commandMap.set(command.name, command);
    }
    return commandMap;
}

client.on('ready', () => {
    console.log(`Connected as ${client.user.tag}!`);
});

client.on('message', async (message: Message) => {
    const messageContent = message.content

    if (messageContent.toLowerCase() === "good bot") return message.reply("Good human!");
    if (messageContent.toLowerCase() === "bad bot") return message.reply("Sorry :(");

    for (let forbidden in forbiddenList) {
        if (messageContent.toLowerCase().includes(forbiddenList[forbidden])) {
            message.channel.send(chiffrer);
            break;
        }
    }


    const issuePosition: number = messageContent.indexOf("#");
    let issueID;
    if (issuePosition > -1 && messageContent[issuePosition + 1] !== "<") {
        if (messageContent.substring(issuePosition + 1).includes(" ")) {
            issueID = messageContent.substring(issuePosition + 1).split(" ")[0]
        } else {
            issueID = messageContent.substring(issuePosition + 1)
        }
        let index = issuePosition + issueID.length
        if (!(messageContent.charAt(issuePosition - 1) === "<" && messageContent.charAt(index) === ">")) {

            let link = config["Omega-Repository"];
            if (issueID.charAt(issueID.length - 1) === 'e') {
                link = config["Numworks-Repository"];
            }

            const data = await axios.get(`https://api.github.com/repos/${link}/issues/${issueID}`)
                .catch(err => message.channel.send("ERROR : " + err.toString())); 
                
            const body = data.body             
            const embed = new RichEmbed()
                .setURL(body.html_url)
                .setTitle(body.title + " (#" + body.number + ")")
                .setAuthor(body.user.login, body.user.avatar_url, body.user.html_url)
                .setDescription(body.body)
                .setTimestamp(Date.parse(body.created_at));
                let AdditionalInformations = "";
                if (body.state !== "open") {
                    AdditionalInformations += ":x: Closed by " + body.closed_by.login + " " + moment(body.closed_at).fromNow() + " (" + moment(body.closed_at).format("D, MMMM YYYY, HH:mm:ss") + " )\n";
                    embed.setColor("a30000")
                } else {
                    AdditionalInformations += ":white_check_mark: Open\n";
                    embed.setColor("2b2b2b")
                }
                if (body.labels.length !== 0) {
                    AdditionalInformations += ":label: Labels : ";
                    body.labels.forEach((item, index) => {
                        if (index !== 0) {
                            AdditionalInformations += ", "
                        }
                        AdditionalInformations += item.name
                    });
                    AdditionalInformations += "\n"
                }
                if (body.assignees.length !== 0) {
                    AdditionalInformations += ":person_frowning: Assigned to ";
                    body.assignees.forEach((item, index) => {
                        if (index !== 0) {
                            AdditionalInformations += ", "
                        }
                        AdditionalInformations += item.login
                    });
                    AdditionalInformations += "\n"
                }
                if (body.locked) {
                    AdditionalInformations += ":lock: locked\n"
                }
                if (body.pull_request !== undefined) {
                    AdditionalInformations += ":arrows_clockwise: Pull request\n"
                }
                if (body.comments !== 0) {
                    AdditionalInformations += ":speech_balloon: Comments : " + body.comments + "\n"
                }
                if (issueID.toLowerCase() === body.number + "c") {
                    const resp = await axios.get(body.comments_url)
                    const body = resp.body
                    body.forEach((item) => {
                        embed.addField(`**Answer of**${item.user.login}** ${moment(item.created_at).fromNow()} (${moment(item.created_at).format("D, MMMM YYYY, HH:mm:ss")})**`, item.body)
                    });
                    embed.addField("Additional informations", AdditionalInformations)
                        .setFooter(client.user.tag, client.user.avatarURL);
                    message.channel.send(embed)
                } else {
                    embed.addField("Additional informations", AdditionalInformations)
                        .setFooter(client.user.tag, client.user.avatarURL);
                    message.channel.send(embed)
                }
        }
    }

    if (message.channel.id === config.Channel) {

        let m = messageContent.toString().split(" ")[0].trim();
        let lastChar = m.charAt(m.length - 1);
        let multiplier = 1;
        if (lastChar.toUpperCase() === 'S') {
            multiplier = 1000;
        }
        let duration = m.substr(0, m.length - 1);
        let durationInteger = parseInt(duration);
        if (isNaN(durationInteger)) {
            durationInteger = 30;
            multiplier = 1000;
        }
        let durationComplete = multiplier * durationInteger;
        if (durationComplete > config.DurationMax)
            durationComplete = config.DurationMax;
        else if (durationComplete <= config.DurationMin)
            durationComplete = config.DurationMin;
        setTimeout(() => {
            message.delete(0).catch(reason => console.log("The Message was already destroyed"))
        }, durationComplete)

    }

    if (!messageContent.startsWith(config.Prefix)) return

    const withoutPrefix = messageContent.replace(config.Prefix, "");
    const [command, ...args] = withoutPrefix.toLocaleLowerCase().trim().split(/\s+/)

    if (command === Commands.help.input) {
        const response = new RichEmbed()
            .setTitle("Here are the commands you can use with me")
            .setThumbnail(client.user.displayAvatarURL)
            .setTimestamp(new Date())
            .setURL(config.URL)
            .setAuthor(client.user.tag, client.user.displayAvatarURL, config.URL);
        for (const command of Commands) {
            response.addField(config.Prefix + command.input, command.description)
        }
        message.channel.send(response);
    } else if (command === Commands.repository.input) {
        const response = new RichEmbed()
            .setTitle("Here are the repositories of the omega project")
            .setTimestamp(new Date())
            .setURL(config.URL)
            .setAuthor(client.user.tag, client.user.displayAvatarURL, config.URL);
        for (const repository of Commands.repository.repositories) {
            response.addField(repository.name, `${repository.desc} (${repository.url})`)
        }
        message.channel.send(response);
    } else if (command === Commands.team.input) {
        const response = new RichEmbed()
            .setTitle("Here are the people who develop the omega project")
            .setTimestamp(new Date())
            .setURL(config.URL)
            .setAuthor(client.user.tag, client.user.displayAvatarURL, config.URL);
        const team = await import("./team.json")
        team.forEach(element => {
            response.addField(element.name, `Github : ${element.Github} Discord : ${client.users.get(element.DiscordId)?.tag}`)
        });
        message.channel.send(response);
    } else if (command === Commands.apod.input) {
        let argsMessage = args.join(' ')
        if (!moment(argsMessage, "YYYY-MM-DD").isValid()) {
            argsMessage = "";
        }
        if (!argsMessage.match(/([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/)) {
            argsMessage = "";
        }
        let s = moment(argsMessage, "YYYY-MM-DD");
        if (s.isAfter(moment.now())) argsMessage = "";
        if (s.isBefore(moment("1995-06-17"))) argsMessage = "";

        const embed = getEmbedApod(message, argsMessage);
        return message.channel.send(embed)

    } else if (command === "reload") {
        customCommandMap = loadCommandsFromStorage();
        message.reply("The command list was reloaded")
    } else if (command === "custom") {
        if (!(message.author.id === "339132422946029569" || message.author.id === "171318796433227776")) {
            message.reply("You do not have the permission to perform this command!");
            return;
        }
        
        const [subcommand, cmd, ...action] = args
        if (subcommand === "set") {
            const actionString: string = action.join(" ");
            
            if (cmd === "" || actionString === "") {
                return message.reply("You can't create an empty command!")
            }
            
            let command = {
                "name": cmd,
                action
            }

            if (customCommandMap.has(cmd)) {
                return message.reply("This command already exist."); 
            }

            customCommandMap.set(cmd, command);
            return message.reply(`You successfully registered the ${cmd} command`)
        
        } else if (subcommand === "remove") {
            if (!customCommandMap.has(cmd)) return message.reply("This command does not exist.")
            
            customCommandMap.delete(cmd);
            message.reply(`You successfully removed the ${cmd} command`)
        } else {
            const response = new RichEmbed()
                .setTitle("Custom Command Help")
                .setThumbnail(client.user.displayAvatarURL)
                .setTimestamp(new Date())
                .setURL(config.URL)
                .setAuthor(client.user.tag, client.user.displayAvatarURL, config.URL)
                .addField("!custom set [cmd] [action]", "Create a command")
                .addField("!custom remove [cmd]", "Remove a custom command")
            message.channel.send(response);
        }
        saveCustomCommands()
    } else if (command === Commands.customs.input) {
        const response = new RichEmbed()
            .setTitle("List of custom commands")
            .setThumbnail(client.user.displayAvatarURL)
            .setTimestamp(new Date())
            .setURL(config.URL)
            .setAuthor(client.user.tag, client.user.displayAvatarURL, config.URL);
        const list = [];
        for (let key of customCommandMap.keys()) {
            list.push(customCommandMap.get(key));
        }
        for (let command of list) {
            response.addField(`${config.Prefix}${command.name}`, command.action);
        }
        message.channel.send(response);
    } else {
        if (customCommandMap.has(command)) {
            message.channel.send(customCommandMap.get(command).action);
        }
    }

    /* Guild Commands */
    /* hug,
       kiss,
       cuddle,
       pat,
       waifu,
       feed,
       owo,
       fact,
       kemonomimi,
       corona,
       egg,
       drunk,
       compat
    */

    if (message.guild.id !== "685936220395929600") return notAllowed(message)

    if (command === Commands.hug.input) {
        if (!message.mentions.users.size) return message.reply('Are you alone :( ?')
        return sendInteraction(message, "hug", "hugged");
    } else if (command === Commands.kiss.input) {
        if (!message.mentions.users.size) return message.reply('Are you alone :( ?')
        return sendInteraction(message, "kiss", "kissed");
    } else if (command === Commands.cuddle.input) {

        if (!message.mentions.users.size) return message.reply('Are you alone :( ?')
        return sendInteraction(message, "cuddle", "cuddled");

    } else if (command === Commands.pat.input) {
        if (!message.mentions.users.size) return message.reply('Are you alone :( ?')
        return sendInteraction(message, "pat", "head-patted");
    } else if (command === Commands.waifu.input) {

        return sendImage(message, "waifu", "waifu");
    } else if (command === Commands.feed.input) {
        if (!message.mentions.users.size) return message.reply('Are you alone :( ?')
        return sendInteraction(message, "feed", "fed");
    } else if (command === Commands.owo.input) {

        if (args.length === 0) return message.reply("Send a text :) !");
        const owoifyMessage = await owoify(message, args.join(''));
        message.reply(owoifyMessage)

    } else if (command === Commands.fact.input) {
        const fact = await getFact(message);
        message.reply(`Fun fact : ${fact}`)
    } else if (command === Commands.kemonomimi.input) {
        return sendImage(message, "kemonomimi", "picture");
    } else if (command === Commands.corona.input) {

        const user = args.join(' ') || message.author.username

        const random = Math.floor(Math.random() * 101);
        const answer = new RichEmbed()
            .setColor("#0099ff")
            .setTitle("SRAS-CoV-2 Diagnostic Machine")
            .setDescription(`The probability that **${user}** has the SRAS-CoV-2 is **${random}%**`)
            .setTimestamp()

        message.channel.send(answer);

    } else if (command === Commands.egg.input) {
        const user = args.join(' ') || message.author.username

        const random = user.toLowerCase() === "quentin" ? 100 : Math.floor(Math.random() * 101);
        const base = "My Magic Told Me That... **";

        const end = random > 50 ? "** is an egg!" : "** isnt an egg!";

        const answer = `${base}${user}${end}`

        const embed = new RichEmbed()
            .setColor("#0099ff")
            .setTitle("Egginator")
            .setDescription(answer)
            .setTimestamp()
        message.channel.send(embed);
    } else if (command === Commands.drunk.input) {
        const user = args.join(' ') || message.author.username


        const random = user.toLowerCase() === "legmask" ? 100 : Math.floor(Math.random() * 101);
        
        const base = "My Magic Told Me That... **";
        const end = random > 50 ? "** is drunk!" : "** isnt drunk!";
        const answer = `${base}${user}${end}`

        const embed = new RichEmbed()
            .setColor("#0099ff")
            .setTitle("Hips!")
            .setDescription(base)
            .setTimestamp()
        message.channel.send(embed);
    } else if (command === Commands.compatibility.input) {
        if (args.length < 2) {
            return message.reply("You need 2 persons to do so!");
        }

        if (args.length > 2) {
            return message.reply("Oh! Naughty you! Only 2 please ;)")
        }

        const random = Math.floor(Math.random() * 101);
        const answer = new RichEmbed()
            .setColor("#0099ff")
            .setTitle("Love Calculator")
            .setDescription(`**${args[0]}** and **${args[1]}** are.... **${random}%** compatible`)
            .setTimestamp()
        message.channel.send(answer)
    } 

});

function saveCustomCommands() {
    const list = [];
    for (const key of customCommandMap.keys()) {
        list.push(customCommandMap.get(key));
    }
    fs.writeFileSync("customCommands.json", JSON.stringify(list), "utf8");
}

async function sendInteraction(message: Message, action: string, verb: string) {
    try {
        const user = message.mentions.users.first();
        if (!user) return message.channel.send("Merci de préciser un utilisateur")

        const url = await getNekoImageURL(action)
        if (!url) return message.channel.send("an error occured");

        const answer = new RichEmbed()
            .setTitle(`@${user.username} is ${verb} by @${message.author.username}`)
            .setImage(url)
            .addField("Provided by : ", "nekos.life")

        message.channel.send(answer)
    } catch (e) {
        console.log(e)
        return message.channel.send("an error occured")
    }
}

async function getNekoImageURL(action: string): Promise<string> {
    const { data: { url } } = await axios.get(`https://nekos.life/api/v2/img/${action}`);
    return url
}

async function sendImage(message: Message, action: string, text: string) {
    try {
        const url = await getNekoImageURL(action)
        if (!url) return message.channel.send("an error occured");
        let answer = new RichEmbed()
            .setTitle("Here is your " + text)
            .setImage(url)
            .addField("Provided by : ", "nekos.life")
        message.channel.send(answer)
    } catch (e) {
        console.log(e)
        return message.channel.send("an error occured")
    }
}

async function owoify(message: Message, text: string) {
    const { data: { owo } } = await axios.get(`https://nekos.life/api/v2/owoify?text=${text}`);
    if (!owo) return message.channel.send("an error occured");
    return owo
}

async function getFact(message: Message) {
    const { data: { fact } } = await axios.get('https://nekos.life/api/v2/fact');
    if (!fact) return message.channel.send("an error occured");

    return fact
}

async function getEmbedApod(message: Message, date: string = "") {

    let link = `https://api.nasa.gov/planetary/apod?api_key=${nasa}${`&date=${date.trim()}`}`;
    const { data: { url, copyright, explanation } } = await axios.get(link);
    if (!url) return message.channel.send("an error occured");

    const answer = new RichEmbed()
        .setTitle("NASA Astronomy Picture of the Day")
        .setAuthor(copyright)
        .setImage(url)
        .setDescription(explanation);

    return answer
}

function notAllowed(message: Message) {
    message.reply("Fun commands are not allowed on this server, go to https://discord.gg/rm85hDH")
}

client.login(config.Token);