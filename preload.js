// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const ytdl = require("ytdl-core"),
ytsr = require("ytsr"),
fs = require("fs"),
path = require("path"),
open = require("open");
window.addEventListener("load", () => {
	try{
		if (!fs.existsSync("./audio")) fs.mkdirSync("./audio");
		clear();
		const searchInput = document.getElementById("search"),
		results = document.getElementById("results"),
		audioContainer = document.getElementById("audioctn"),
		alertText = document.getElementById("alert"),
		alertContainer = document.getElementById("alertctn");
		var processing = false;
		if(localStorage.getItem("search") != null) searchInput.value = localStorage.getItem("search");
		if(localStorage.getItem("lastPlayed") != null) {
			alert("resuming last session...");
			play(JSON.parse(localStorage.getItem("lastPlayed")));
		};
		function removeAllChildren(parent) {
			while (parent.lastChild) {
				parent.removeChild(parent.lastChild);
			}
		}
		function alert(text) {
			if(text) {
				alertText.innerText = text;
				alertContainer.classList.remove("hidden");
			} else {
				alertContainer.classList.add("hidden");
			}
		}
		async function clear() {
			const directory = "audio";
			fs.readdir(directory, (err, files) => {
				if (err) throw err;
				for (const file of files) {
					fs.unlink(path.join(directory, file), err => {if (err) throw err;});
				}
			});		
		}
		async function search() {
			if(processing || searchInput.value.trim() == "") return;
			processing = true;
			alert("searching...")
			const filters = await ytsr.getFilters(searchInput.value),
			videoFilter = filters.get("Type").get("Video");
			ytsr(videoFilter.url, {
				limit: 20,
			}).then(res => {
				alert();
				removeAllChildren(results)
				results.classList.remove("hidden")
				res.items.forEach(item => {
					const result = document.createElement("a");
					result.href = item.url;
					result.classList.add("result");
					if(item.bestThumbnail) {
						const thumb = document.createElement("img");
						thumb.src = item.bestThumbnail.url;
						result.appendChild(thumb);
					}
					if(item.title) {
						const title = document.createElement("h2");
						title.innerText = item.title;
						result.appendChild(title);
					}
					if(item.author) {
						const author = document.createElement("h3");
						author.innerText = item.author.name;
						result.appendChild(author);	
					}
					result.addEventListener("click",e=>{
						e.preventDefault();
						alert("downloading audio to play...");
						play(item);
					})
					results.appendChild(result);
					processing = false;
				})
			});
		}
		async function play(item) {
			if(processing) return;
			processing = true;
			clear();
			const source = "./audio/" + ytdl.getVideoID(item.url);
			const stream = ytdl(ytdl.getVideoID(item.url), {quality:"highestaudio",filter:"audioonly"}).pipe(fs.createWriteStream(source));
			stream.addListener("finish", async () => {
				stream.end();
				alert();
				removeAllChildren(audioContainer)
				audioContainer.classList.remove("hidden")
				localStorage.setItem("lastPlayed",JSON.stringify(item));
				if(item.bestThumbnail) {
					const thumb = document.createElement("img");
					thumb.src = item.bestThumbnail.url;
					audioContainer.appendChild(thumb);
				}
				const audio = document.createElement("audio");
				audio.src = source;
				audio.controls = true;
				audioContainer.appendChild(audio);
				if(item.title) {
					const title = document.createElement("h2");
					title.innerText = item.title;
					audioContainer.appendChild(title);
				}
				if(item.author) {
					const author = document.createElement("h3");
					author.innerText = item.author.name;
					audioContainer.appendChild(author);	
				}
				audioContainer.scrollIntoView();
				audioContainer.focus();
				audio.play();
				window.addEventListener("keydown", async (e) => {
					if(typeof audio == "undefined" || e.target.tagName == "INPUT") return;
					switch (e.key) {
						case "k":
							audio.paused?await audio.play():audio.pause();
							alert((audio.paused?"paused":"played") + " audio!");
							break;
						case "l":
							audio.loop = !audio.loop;
							alert((audio.loop?"looped":"unlooped") + " audio!");
							break;
						case "m":
							audio.muted = !audio.muted;
							alert((audio.muted?"muted":"unmuted") + " audio!");
							break;
						case "a":
							audioContainer.scrollIntoView();
							audioContainer.focus();
							break;
					}
				})
				processing = false;
			})	
		}
		searchInput.addEventListener("input",()=>{
			localStorage.setItem("search",searchInput.value);
		})
		searchInput.addEventListener("keydown",e=>{
			if(e.key == "Enter") search();
		});
		document.getElementById("searchbtn").addEventListener("click",search)
		document.getElementById("aboutbtn").addEventListener("click",()=>{
			open("./about.html");
		})
		window.addEventListener("keydown",e=>{
			if(e.key == "/" && e.target.tagName != "INPUT") {
				e.preventDefault();
				searchInput.focus();
			}
		})
	} catch(err) {
		console.error(err);
	}
})