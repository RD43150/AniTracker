const {ipcRenderer,remote} = require('electron'),
addWin = remote.getCurrentWindow();

let delayLabelL, delayValI, delayHourL, loader, err_title, err_req, err_delay

window.onload = () => {
    delayLabelL = document.getElementById('delayLabel'),
    delayValI = document.getElementById('delayVal'),
    delayHourL = document.getElementById('delayHour'),
    loader = document.getElementById('loader'),
    err_title = document.getElementById('err-title'),
    err_req = document.getElementById('err-req'),
    err_delay = document.getElementById('err-delay'),
    btn = document.getElementById('btn')
}

/*
const animeName = document.getElementById('animeName'),
siteLinkI = document.getElementById('siteLink'),
delayCheckI = document.getElementById('delayCheck'),
delayLabelL = document.getElementById('delayLabel'),
delayValI = document.getElementById('delayVal'),
delayHourL = document.getElementById('delayHour'),
loader = document.getElementById('loader'),
err_title = document.getElementById('err-title'),
err_req = document.getElementById('err-req'),
err_delay = document.getElementById('err-delay')
*/

ipcRenderer.on('err-title',() => { err_title.style.display = 'block' })
ipcRenderer.on('no-err-title',() => { err_title.style.display = 'none' })
ipcRenderer.on('err-req',() => { err_req.style.display = 'block' })
ipcRenderer.on('no-err-req',() => { err_req.style.display = 'none' })
ipcRenderer.on('hide-loader',() => { loader.style.display = 'none' })
ipcRenderer.on('enable-button',() => { btn.disabled = false })

let data = {
    name: '',
    siteLink: '',
    delay: 0,
}

function changeData(e,target) { typeof target === Number ? data[target] += e.value : data[target] = e.value; }

function check(e) {
    data.delay = 0
    delayLabelL.style.color = e.checked ? '#E8E8E8' : 'black';
    delayHourL.style.color = e.checked ? '#E8E8E8' : 'black';
    delayValI.disabled = e.checked ? false : true;
    delayValI.value = ""
}

function findAndShowAnime() { 
    if (data.delay > 100) {
        err_delay.style.display = 'block'
        ipcRenderer.send('validateErrors',data.name)
    }
    else {
        err_title.style.display = 'none'
        err_req.style.display = 'none'
        err_delay.style.display = 'none'
        loader.style.display = 'block'

        btn.disabled = true
        ipcRenderer.send('data', {name: data.name,siteLink: data.siteLink || "#",delay: data.delay || 0})
        data.delay = 0;
    }
}