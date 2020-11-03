const { Client } = require('whatsapp-web.js');
const fs = require('fs');
const fetch = require('node-fetch');
const e = require('express');
const SESSION_FILE_PATH = './session.json';
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox']});
  const page = await browser.newPage();
  await page.goto('http://owlcommand.com');
  await page.screenshot({path: 'example.png'});

  await browser.close();
})();
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) { //mengecek apakah udah ada session yang tersimpan
    sessionCfg = require(SESSION_FILE_PATH);
}

// ini sama kaya function cuma disederhanain aja biar lebih ringkes
// kalo di function kan, async function searchOnBible (Ppassage, Pchapter, Pverse = "") { fungsinya }

const searchOnBible = async (Ppassage, Pchapter, Pverse = "") => {

// pada parameter Pverse diberi = "" (maksutnya untuk memberi nilai default apabila tidak ada value / undefined)

    try {
        const data = await fetch(`https://api-alkitab.herokuapp.com/v1/passage/${Ppassage}/${Pchapter}/${Pverse}`).then(res => res.json())
        const { status, response, message } = data
        const { title, chapter } = response.passage[0]
        const { verse } = chapter.verses

// const { } = object , adalah destructing object , gunanya untuk menyederhanakan object , lebih jelasnya bisa search google aja

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
client.on('qr', (qr) => { //menampilkan qr code dan menerima qr code
    console.log('QR RECEIVED', qr);
});
client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {  //jika session belum tersimpan maka akan membuat session baru 
        if (err) {
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

	// .split berfungsi membagi / memisahkan (text / string) kedalam json array menurut delimeter / parameternya
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
		
		// .map berfungsi melooping json array , dalam .map kita bisa mendapatkan value dan index sijson tsb
		// sebenernya fine" aja kalo mau pake foreach , for , dll , cuma cara ini lebih ringkes dan readable mnurut gw

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
