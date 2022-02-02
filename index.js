const Discord = require("discord.js");
const config = require("./config.json");

const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGES"]});

client.login(config.BOT_TOKEN);

const prefix = "!";

// nextCronDate : returns the ms until this cron job needs to be fired
function nextCronDate(str) {
    if (!(typeof str === "string" || str instanceof string)) {
        return null;
    }

    const parseme = (x) => isNaN(parseInt(x)) ? "*" : parseInt(x);

    const arr = str.split(" ").map(parseme);

    const cron = {
        minute: arr[0],
        hour: arr[1],
        day: arr[2],
        month: arr[3],
        weekday: arr[4]
    };

    const date = new Date();

    const datePassCron = (d, cron) => {
        if (cron.month !== "*" && d.getMonth() !== cron.month)
            return false;

        if (cron.date !== "*" && d.getDate() !== cron.date)
            return false;

        if (cron.day !== "*" && d.getDay() !== cron.day)
            return false;

        if (cron.hour !== "*" && d.getHour() !== cron.hour)
            return false;

        if (cron.minutes !== "*" && d.getMinutes() !== cron.minutes)
            return false;

        return true;
    };

    do {
        date.setTime(date.getTime() + (60 * 1000));
    } while (datePassCron(date, cron));

    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

function delay(t) {
    return new Promise(function (resolve) {
        setTimeout(resolve, t);
    });
}

Promise.delay = function(fn, t) {
    if (!t) {
        t = fn;
        fn = function() {};
    }

    return delay(t).then(fn);
}

Promise.prototype.delay = function(fn, t) {
    return this.then(function() {
        return Promise.delay(fn, t);
    });
}

// fnMessage : the function to send a message
async function fnMessage(server, channel, args) {
    const ch = await client.channels.fetch(channel);
    if (ch === null) {
        console.error(`ERR: '${e.name}' could not be found.`);
    } else {
        ch.send(args.join(" "));
    }
}

// setupCommand : sets up a single command
async function setupCommand(command) {
    const funcs = {
        message: fnMessage
    };

    const func = funcs[command.fn] ?? null;
    if (func === null) {
        console.error(`couldn't setup '${command.description}', command not found`);
        return;
    }

    const getDelay = () => nextCronDate(command.cron).getTime() - Date.now();

    let promise = null;

    const dofunc = () => {
        func(command.serverid, command.channelid, command.args);
        promise.delay(dofunc, getDelay());
    };

    promise = delay(getDelay());;
    promise.then(dofunc());
}

function messageCreateHandler(message) {
    if (message.author.bot)
        return;

    if (!message.content.startsWith(prefix))
        return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(" ");
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        const duration = Date.now() - message.createdTimestamp;
        message.reply(`Pong! Reply in ${duration}ms.`);
    }
}

async function asyncmain() {
    config.commands.map(async (e) => {
        await setupCommand(e);
    });

    // const duration = nextWednesday() - new Date();
    // console.log(`waiting ${duration}ms`);
    // setTimeout(timedMessage, duration);

    client.on("messageCreate", messageCreateHandler);
}

client.once("ready", asyncmain);

