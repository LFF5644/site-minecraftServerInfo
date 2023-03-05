let servers=[];
let serverStatus={};

const socket=io({path:"/bind/socket/minecraftServerInfo/socket.io/"});
const ids={
	code_connected: document.getElementById("code_connected"),
	button_connect: document.getElementById("button_connect"),
	button_disconnect: document.getElementById("button_disconnect"),
	div_servers: document.getElementById("div_servers"),
};
const names={
	radio_servers: document.getElementsByName("radio_servers"),
}

function updateText(){
	const connected=socket.connected;

	ids.code_connected.innerText=connected?"Verbunden":"Nicht verbunden";
	ids.code_connected.style.color=connected?"green":"red";
	ids.button_connect.disabled=connected;
	ids.button_disconnect.disabled=!connected;
}
function updateServerHTML(){
	let html="";
	for(let index in servers){
		const server=servers[index];
		const key=server.id?server.id:String(index);
		const status=serverStatus[key];
		html+=(`
			<p>
				<label title=${server.id?server.id:"\"\""}>
					<input type=radio name=radio_servers value="${key}">
					${server.name}${
						!status.httpOnline||
						!status.running?
						" <span style=\"color:red;\">(OFFLINE)</span>":""
					}${
						status.playersOnline?
						" <span style=\"color:green;\">("+status.playersOnline+" Online)</span>":""
					}
				</label>
			<p>
			${status.httpOnline?`
				<div id=div_server_${key} class=hidden>
						<p>Status: <code${status.statusColor?" style=\"color:"+status.statusColor+";\"":""}>${status.status}</code></p>
						<p>Spieler Online ${status.playersOnline}: <code>${status.players.join("; ")}</code></p>
				</div>
			`:""}

		`
			.split("\n").join("")
			.split("\t").join("")
		);
	}
	ids.div_servers.innerHTML=html;
	for(let radio of names.radio_servers){radio.onchange=radioServersChanged}
}
function findActiveRadio(list){
	for(let radio of list){
		if(radio.checked){
			return radio.value;
		}
	}
	throw new Error("in radio list isn't an checked radio element");
}
function radioServersChanged(){
	const key=findActiveRadio(names.radio_servers);
	const disable=servers.map(item=>item.id);
	for(let id of disable){document.getElementById("div_server_"+id).className="hidden"}
	document.getElementById("div_server_"+key).className="";
}

ids.button_connect.onclick=event=>{
	const button=event.target;
	socket.connect();
};
ids.button_disconnect.onclick=event=>{
	const button=event.target;
	socket.disconnect();
};

socket.on("connect",()=>{
	console.log("CONNECTED as "+socket.id);
	updateText();
});
socket.on("get-servers",data=>{
	console.log("Getting servers!");
	servers=data; 
});
socket.on("get-serverStatus",data=>{
	console.log("Getting serverStatus");
	serverStatus=data;
});
socket.on("update-serverStatus",data=>{
	const {serverKey,status}=data;
	serverStatus[serverKey]=status;
	console.log("update server with key "+serverKey);
	updateServerHTML();
});
socket.on("update-frame",()=>{
	updateText();
	updateServerHTML();
})
socket.on("shutdown",code=>{
	console.log("Shutdown socket server");
	socket.disconnect();
});
socket.on("disconnect",()=>{
	console.log("DISCONNECTED");
	updateText();
});
