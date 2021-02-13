const {remote, ipcRenderer, shell} = require('electron')
const win = remote.getCurrentWindow()

function closeWin() { 
    ipcRenderer.send('closeAddWinIfOpen')
    win.hide() 
}
function minimize() { win.minimize() }