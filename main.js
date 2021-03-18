//const { exec } = require('child_process')
const { shell, ipcRenderer, nativeImage } = require('electron');
const electron = require('electron');
const {app, BrowserWindow, ipcMain, Notification, Menu, Tray} = electron;

const path = require('path'),
      fs = require('fs'),
      axios = require('axios'),
      isDev = require('isdev'),
      DATA_FILE_PATH = path.join(__dirname,isDev ? 'db/data.json' : '../db/data.json') 
      CONVERT_H_TO_MS = 3600000,
      auto_launch = require('auto-launch')
      //script = `$player = New-Object System.Media.SoundPlayer; $player.SoundLocation='${__dirname}\\src\\assets\\Sounds\\tuturu.wav'; $player.PlaySync()`

let mainWindow,tray,notif,addWindow = null
const gotTheLock = app.requestSingleInstanceLock()


if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) { mainWindow.restore() }
      if (!mainWindow.isVisible()) { mainWindow.show() }
    }
  })
} 

function createWindow() {
  const screenSize = electron.screen.getPrimaryDisplay().size;
  let autoLaunch = new auto_launch({
    name: 'AniTracker',
    path: app.getPath('exe'),
    isHidden: true
  });

  if (!fs.existsSync(DATA_FILE_PATH))
    createDataFile()
    
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });

  mainWindow = new BrowserWindow({width: 600,
     height: 680,
     icon: path.join(__dirname,'src/assets/Images/logo.png'),
     frame: false,
     webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    },
    x: screenSize.width - 640,
    y: 40,
    resizable: false,
    minimizable: true,
    title: "AniTracker"
  });
  
  mainWindow.loadURL(path.join(__dirname, '/src/index.html'));
  mainWindow.on('closed', () => mainWindow = null);
  mainWindow.on('close',(e) => {
    if (!app.quitFromTray) 
      e.preventDefault()
      mainWindow.hide()
  })

  if (process.argv.indexOf('--hidden') !== -1)
    mainWindow.hide()
}

function createDataFile() {
  const fileContents = JSON.stringify([]);
  fs.writeFileSync(DATA_FILE_PATH, fileContents)
}

function aniDBQuery(page,status) {
  return new Promise(async function (resolve,reject) {
    let options = {
      query: `
      query {
        Page(page: ${page}, perPage: 50) {
          pageInfo {
            total
            perPage
            currentPage
            lastPage
            hasNextPage
          }
          media(status: ${status}, type: ANIME) {
            title {
              romaji
              english
              userPreferred
            }
            coverImage {
              medium
            }
            episodes
            id
            idMal
            status
            nextAiringEpisode {
              episode
              timeUntilAiring
            }
          }
        }
      }
      `,
      variables: {}
    }
  
    let head = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    try { 
      const data = await axios.post('https://graphql.anilist.co',options,head); 
      const pageInfo = data.data.data.Page.pageInfo;
      const media = data.data.data.Page.media;

      if (pageInfo && media) 
        resolve([pageInfo,media])
      
      reject('ERROR')
    }
    catch(err) {
      //console.log(err)
      reject('err-req')
    }
  })
}

function matchAniName(searchName,aniName) {
  const reg = /[a-zA-Z0-9]+/gi;
  let tempName;
  searchName = searchName.split(' ').join('').toLowerCase().match(reg).join('');
  for (let el in aniName) {
    if (aniName[el] != null) {
      tempName = aniName[el].split(' ').join('').toLowerCase().match(reg).join('');
      if (searchName == tempName)
        return true;
    }
  }
  return false
}

function searchAnime(searchName,status) {
  return new Promise(async function(resolve,reject) {
    let hasNextPage = true,
        page = 1
    
    while (hasNextPage) {
      const pageData = await aniDBQuery(page,status).catch((err) => {
        switch(err) {
          case 'err-req': reject('err-req'); break;
          case 'err-unk': reject('err-unk'); break;
        }
      })

      hasNextPage = pageData[0].hasNextPage
      for (let i = 0;i < pageData[1].length;i++) {
        if (matchAniName(searchName,pageData[1][i].title)) 
          resolve(pageData[1][i]); 
      }
      page++
    }

    reject('err-title')
  })
}

async function resetData(data) {
  let changedData = [];

  for(let aniData of data) {
    const i = changedData.length;
    
    newAniData = await searchAnime(aniData.title.english,aniData.status).catch(err => { console.log('fuck') })
    
    changedData.push(newAniData)
    changedData[i].siteLink = data[i].siteLink;
    changedData[i].delay = data[i].delay;
    changedData[i].dataID = data[i].dataID;
  }

  return changedData;
}

function getImg(name,link) {
  return new Promise((resolve,reject) => {
    const fileName = (name.split(' ').join('')) + '.jpg';
    const fileAddress = path.join(__dirname,isDev ? 'src/assets/Images/' + filename : '../db/notif-images/' + fileName);
  
    if (fs.existsSync(fileAddress)) {
      resolve(fileAddress)
      return;
    }
    
    const res = axios({
      method: 'GET',
      url: link,
      responseType: 'stream'
    }).then((response) => {
      response.data.pipe(fs.createWriteStream(fileAddress)).on('close', () => { resolve(fileAddress) })
      response.data.on('error',() => { reject('fuck') } )
    })
  })
}

ipcMain.on('data',async function (event,searchData) {
  let data = JSON.parse(fs.readFileSync(DATA_FILE_PATH));

  aniData = await searchAnime(searchData.name,'RELEASING').catch((err) => {
    switch(err) {
      case 'err-req': event.sender.send('err-req'); break;
      case 'err-unk': event.sender.send('err-unk'); break;
    }
  })

  if (aniData !== Object(aniData)) {
    aniData = await searchAnime(searchData.name,'NOT_YET_RELEASED').catch((err) => {
      event.sender.send('hide-loader')
      switch(err) {
        case 'err-title': event.sender.send('err-title'); break;
        case 'err-req': event.sender.send('err-req'); break;
        case 'err-unk': event.sender.send('err-unk'); break;
      }
    })

    if (!aniData)
      return;  
  }
  
  event.sender.send('hide-loader')
  event.sender.send('no-err-title')
  event.sender.send('no-err-req')

  aniData.siteLink = searchData.siteLink
  aniData.delay = searchData.delay
  aniData.dataID = data.length + 1;

  if (data.every((el) => el.title.english !== aniData.title.english)) {
    data.push(aniData) 
    fs.writeFileSync(DATA_FILE_PATH,JSON.stringify(data))
    mainWindow.webContents.send('updatedDB',aniData)
  } 

  event.sender.send('enable-button')
})


ipcMain.on('addWin',() => {
  const mainWinBounds = mainWindow.getBounds();

  if (addWindow != null) {
      mainWindow.send('rotate_add')
      addWindow.close();
      return;
  }

  mainWindow.send('rotate_x')

  addWindow = new BrowserWindow({width: 400,
      height: 330,
      frame: false,
      webPreferences: {
       nodeIntegration: true,
       enableRemoteModule: true
     },
     parent: mainWindow,
     center: false,
     x: mainWinBounds.x + (mainWinBounds.width / 6),
     y: mainWinBounds.y + (mainWinBounds.height / 4),
     resizable: false
   });

   addWindow.loadURL(path.join(__dirname,'src/add.html'));
   addWindow.on('closed', () => addWindow = null); 
})

ipcMain.on('getJsonFileData',async function(e,reset) {
  //if (!fs.existsSync('./db/data.json'))
  // createDataFile()

  const data = JSON.parse(fs.readFileSync(DATA_FILE_PATH))
  let newData = undefined;
  
  if (reset) 
    newData = await resetData(data)
  
  e.sender.send('jsonFileData',newData || data)
  fs.writeFileSync(DATA_FILE_PATH,JSON.stringify(data))
})

ipcMain.on('deleteAni',(e,id) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE_PATH));
  let intID;
  for (let aniData of data) {
    if (aniData.dataID == id) {
      data.splice(data.indexOf(aniData),1)
      intID = aniData.intID;
    }
  }
  e.sender.send('clearInt',intID)
  fs.writeFileSync(DATA_FILE_PATH,JSON.stringify(data))
})

ipcMain.on('addIntervalAttr',(e,id,intID) => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE_PATH))
  for (let aniData of data) {
    if (aniData.dataID == id)
      aniData.intID = intID; 
  }
  fs.writeFileSync(DATA_FILE_PATH,JSON.stringify(data))
})

ipcMain.on('closeAddWinIfOpen',e => {
  if (addWindow != null) {
    mainWindow.send('rotate_add')
    addWindow.close()
  }
})

ipcMain.on('log',(e,log) => console.log(log))

app.on('ready', createWindow);

app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, 'src/assets/Images/logo.ico'))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Exit', type: 'normal', click: () => { 
        app.quitFromTray = true;
        app.quit(); 
      } 
    }
  ])
  tray.setToolTip('AniTracker')
  tray.setContextMenu(contextMenu)

  tray.on('click',() => {
    mainWindow.show()
  })
})

ipcMain.on('notif',(e,name,img,nextEp,siteLink) => {
  //exec('powershell -c ' + script)
  getImg(name,img).then(img => {
      notif = new Notification({title: name, 
        body: 'EP ' + nextEp + ' is out', 
        icon: nativeImage.createFromPath(img) || path.join(__dirname, 'src/assets/Images/qMark.jpg'),
        urgency: 'critical', 
        silent: true,
      });
      
      notif.on('click',(e) => { shell.openExternal(siteLink) })
      notif.show()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});