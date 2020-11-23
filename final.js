const { Client } = require('whatsapp-web.js');
const fs = require('fs');
const fetch = require('node-fetch');
const e = require('express');
const SESSION_FILE_PATH = './session.json';

let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) { //Checking the session
    sessionCfg = require(SESSION_FILE_PATH);
}

// Make a function searchOnBible with Async

const searchOnBible = async (Ppassage, Pchapter, Pverse = "") => {

// in parameter Pverse we declare = "" (its mean to give default value if there is no value / undefined)

    try {
        const data = await fetch(`https://api-alkitab.herokuapp.com/v1/passage/${Ppassage}/${Pchapter}/${Pverse}`).then(res => res.json())
        const { status, response, message } = data
        const { title, chapter } = response.passage[0]
        const { verse } = chapter.verses

// const { } = is destructing object

        return {
            message, status, title, verse
        }
    } catch (error) {
        return {
            status: 0,
            message: error.message
        }
    }

}


const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

client.initialize();
client.on('qr', (qr) => { //to show the Qr Code of the whatsapp
    console.log('QR RECEIVED', qr);
});
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {  //if there no session, so make the new one
            console.error(err);
        }
    });
});
client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});
client.on('ready', () => {
    console.log('READY');
});
client.on('message', async msg => {

    if (msg.body.toLowerCase().startsWith("#alkitab")) {

	// .split is to split text / string into json array with its delimeter / parameter
        const pesan = msg.body.split(" ")
        const surat = pesan[1]
        const ayat = pesan[2]

        if (surat == undefined || ayat == undefined) {
            msg.reply("Ups, Format Salah !!")
        } else {
            const splitAyat = ayat.split(":")
            const chapter = splitAyat[0]
            const verse = splitAyat[1]
            const result = await searchOnBible(surat, chapter, verse);

            if (result.status == 200) {
                let fullVerse = '';
		
		// .map is looping the array to get array and its index
                result.verse.map((data, index) => {
                    isNumbering = verse == undefined ? `${index + 1}. ` : '';
                    fullVerse += `${isNumbering}${data.text}\n\n`
                })
                msg.reply(`${result.title}\n\n${fullVerse}`)
            } else {
                msg.reply('Maaf! Server sedang sibuk, coba beberapa saat lagi.')
                //msg.reply(`Ups, Getting error\n${result.message}`)
            }
        }
      
    }   
    if (msg.body.toLowerCase() == 'hai') {
        msg.reply("Hai! Alkitab WA berjalan dalam format :  \n1. Untuk menampilkan seluruh Pasal : #alkitab (Nama Kitab) (Pasal), \ncontoh: #alkitab Matius 1 \n2. Untuk menampilkan ayat tertentu: #alkitab (Nama Kitab) (Pasal):(Ayat), contoh : #alkitab Matius 2:2");
    } 

});
client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});
