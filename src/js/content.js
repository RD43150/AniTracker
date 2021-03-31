const ANISITE_URL = 'https://anilist.co/anime/',
MAL_URL = 'https://myanimelist.net/anime/'

let contentDiv,audioDiv;

window.onload = () => {
    contentDiv = document.getElementById('content');
    audioDiv = document.getElementById('audioDiv');

    ipcRenderer.send('getJsonFileData',true)
}

ipcRenderer.on('rotate_add',() => { document.getElementById('addsvg').style.transform = 'rotate(0deg)' })
ipcRenderer.on('rotate_x',() => { document.getElementById('addsvg').style.transform = 'rotate(45deg)' })
ipcRenderer.on('clearInt',(e,intID) => { clearInterval(intID) })
ipcRenderer.on('jsonFileData',(e,data) => {
    contentDiv.innerHTML = ''
        
    for (let aniData of data) {
        contentDiv.innerHTML += `
        <div id="anime-block">
            <div id="img-block">
                <img id="ani-img" alt="Anime Cover" src=${aniData.coverImage.medium || "assets/Images/qMark.jpg"}></img>
                <button id="watch-btn" onclick="openSite('${aniData.siteLink}')">Watch</button>
            </div>
            <h2 id="ani-title">${aniData.title.english || "Unknown"}</h2>
            <h3 id="epi-counter">Episode <span id="${'ep' + aniData.dataID}">${aniData.nextAiringEpisode.episode}</span> coming out in <span id="${'time' + aniData.dataID}">${convertMsToTimeLeft(aniData.nextAiringEpisode.timeUntilAiring,aniData.delay)}<span></h3>   
            <a id="anilist-link" href="#" onclick="openSite('${ANISITE_URL + aniData.id}')">ANILIST</a>
            <a id="mal-link" href="#" onclick="openSite('${MAL_URL + aniData.idMal}')">MAL</a>         
            <img id="delete" alt="Trashcan" src="assets/Images/trashcan.png" onclick="deleteAni(${aniData.dataID})"></img>
        </div>  
      `  

        let intIndex = setInterval(() => {
        let timeSpan = document.getElementById('time' + aniData.dataID)

        if (aniData.episodes === null) 
            aniData.episodes = 99999
        if (aniData.nextAiringEpisode.timeUntilAiring <= 0 && aniData.nextAiringEpisode.episode != aniData.episodes+1) {
            audioDiv.play()
            ipcRenderer.send('notif',aniData.title.english,aniData.coverImage.medium,aniData.nextAiringEpisode.episode,aniData.siteLink)
            ipcRenderer.send('getJsonFileData',true)
            aniData.nextAiringEpisode.timeUntilAiring = null
            clearInterval(intIndex)
        } else if (aniData.nextAiringEpisode.timeUntilAiring <= 0 && aniData.nextAiringEpisode.episode === aniData.episodes+1 || !aniData.nextAiringEpisode.episode) {
            aniData.nextAiringEpisode.timeUntilAiring = convertMsToTimeLeft(null,0)
            clearInterval(intIndex)
        }
        timeSpan.innerHTML = convertMsToTimeLeft(aniData.nextAiringEpisode.timeUntilAiring -= 60 || null,aniData.delay)
      }, 60000)

      ipcRenderer.send('addIntervalAttr',aniData.dataID,intIndex)
    }
})

function openAddWindow() { ipcRenderer.send('addWin') }
function openSite(link) { shell.openExternal(link) }

function deleteAni(id) {
    ipcRenderer.send('deleteAni',id)
    ipcRenderer.send('getJsonFileData',false)
}

function convertMsToTimeLeft(ms,delay) {
    if (ms === null || !Number.isInteger(ms) || ms <= 0) 
        return '?d ?h ?m'

    let days = Math.floor(ms / (86400)),
        hours = Math.floor(ms/3600 - (days * 24)),
        minutes = Math.floor(ms/60 - (hours * 60) - (days * 24 * 60))
    
    hours += Math.floor(delay)
    minutes += ((delay * 60) - (Math.floor(delay) * 60))
    
    if (hours >= 24) {
      days += Math.floor(hours/24) || 1;
      hours = hours % 24;
    }
   
    if (minutes >= 60) {
      hours += Math.floor(minutes/60) || 1;
      minutes = minutes % 60;
    }
  
    return (days + 'd ' + hours + 'h ' + minutes + 'm')  
}


ipcRenderer.on('updatedDB',(e,aniData) => {
  contentDiv.innerHTML += `
                      <div id="anime-block">
                    <div id="img-block">
                        <img id="ani-img" alt="Anime Cover" src=${aniData.coverImage.medium || "assets/Images/qMark.jpg"}></img>
                        <button id="watch-btn" onclick="openSite('${aniData.siteLink}')">Watch</button>
                    </div>
                    <h2 id="ani-title">${aniData.title.english || "Unknown"}</h2>
                <h3 id="epi-counter">Episode <span id="${'ep' + aniData.dataID}">${aniData.nextAiringEpisode.episode}</span> coming out in <span id="${'time' + aniData.dataID}">${convertMsToTimeLeft(aniData.nextAiringEpisode.timeUntilAiring,aniData.delay)}<span></h3>   
                    <a id="anilist-link" href="#" onclick="openSite('${ANISITE_URL + aniData.id}')">ANILIST</a>
                    <a id="mal-link" href="#" onclick="openSite('${MAL_URL + aniData.idMal}')">MAL</a>         
                    <img id="delete" alt="Trashcan" src="assets/Images/trashcan.png" onclick="deleteAni(${aniData.dataID})"></img>
                    </div>  
                    `  

    let intIndex = setInterval(async function() {
        let timeSpan = document.getElementById('time' + aniData.dataID)

        if (aniData.episodes === null) 
            aniData.episodes = 99999
        if (aniData.nextAiringEpisode.timeUntilAiring <= 0 && aniData.nextAiringEpisode) {
            audioDiv.play()
            ipcRenderer.send('notif',aniData.title.english,aniData.coverImage.medium,aniData.nextAiringEpisode.episode,aniData.siteLink)
            ipcRenderer.send('getJsonFileData',true)
            aniData.nextAiringEpisode.timeUntilAiring = null
            clearInterval(intIndex)
        } else if (aniData.nextAiringEpisode.timeUntilAiring <= 0 && !aniData.nextAiringEpisode) {
            aniData.nextAiringEpisode.timeUntilAiring = convertMsToTimeLeft(null,0)
            clearInterval(intIndex)
        }
        
        timeSpan.innerHTML = convertMsToTimeLeft(aniData.nextAiringEpisode.timeUntilAiring -= 60 || null,aniData.delay)
    }, 60000)

    ipcRenderer.send('addIntervalAttr',aniData.dataID,intIndex)
})