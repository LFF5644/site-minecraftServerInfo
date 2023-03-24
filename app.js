let servers=[];
let serverStatus={};
let hasServers=false;
let hasServerStatus=false;

const socket=io({path:"/bind/socket/minecraftServerInfo"});
const ids={
	code_connected: document.getElementById("code_connected"),
	button_connect: document.getElementById("button_connect"),
	button_disconnect: document.getElementById("button_disconnect"),
	div_server: document.getElementById("div_server"),
	select_server: document.getElementById("select_server"),
};

function updateText(){
	const connected=socket.connected;

	ids.code_connected.innerText=connected?"Verbunden":"Nicht verbunden";
	ids.code_connected.style.color=connected?"green":"red";
	ids.button_connect.disabled=connected;
	ids.button_disconnect.disabled=!connected;
}
function setServers(){
	if(!hasServerStatus||!hasServers) return;

	const oldValue=ids.select_server.value;
	ids.select_server.innerHTML="";

	{
		let element=document.createElement("option");
		element.innerText="-- Kein Server --";
		element.value="$none";
		ids.select_server.appendChild(element);

		element=document.createElement("option");
		element.innerText="-- Spieler Übersicht --";
		element.value="$players";
		ids.select_server.appendChild(element);
	}
	for(let server of servers){
		const id=server.id;
		const status=serverStatus[id];

		const element=document.createElement("option");
		element.innerText=server.name;
		element.value=id;
		element.disabled=!status.httpOnline;
		ids.select_server.appendChild(element);
	}
	ids.select_server.value=oldValue;
	displayServer();
}
function totalPlayersOnline(){
	return eval(
		Object.keys(serverStatus)
			.map(item=>serverStatus[item].players.length)
			.join("+")
	);
}
function displayServer(){
	if(!hasServerStatus||!hasServers) return;
	const id=ids.select_server.value;
	if(id.startsWith("$")){
		const value=id.substring(1);
		if(value=="none") ids.div_server.innerHTML="";
		if(value=="players"){
			const serversWithPlayers=(Object.keys(serverStatus)
				.filter(item=>
					serverStatus[item].players.length
				)
				.map(item=>
					[item,serverStatus[item].players]
				)
			);
			const playersOnline=totalPlayersOnline();
			ids.div_server.innerHTML=`<p>Spieler insgesamt: <span style="color:${playersOnline?"green":"red"}">${playersOnline}</span></p>`;
			ids.div_server.innerHTML+=(serversWithPlayers
				.map(item=>
					`<p>${item[0]} <ul>${item[1]
						.map(item=>"<li>"+item+"</li>")
						.join("")
					}</ul></p>`
				)
				.join("")
			);
		}
		return;
	}
	
	const status=serverStatus[id];
	const server=servers.find(item=>item.id==id);

	ids.div_server.innerHTML=`<p>Server Name: <span style="color:green">${server.name}</span></p>`;
	ids.div_server.innerHTML+=`<p>Server id: <span style="color:green">${server.id}</span></p>`
	ids.div_server.innerHTML+=`<p>Spieler Online: <span style="color:${status.players.length?"green":"red"}">${status.players.length}</p>`;
	if(status.players.length>0) ids.div_server.innerHTML+=`<p>Spieler: <ul>${status.players.map(item=>`<li style="color:green">${item}</li>`).join("")}</ul></p>`;
}

ids.button_connect.onclick=event=>{
	const button=event.target;
	socket.connect();
};
ids.button_disconnect.onclick=event=>{
	const button=event.target;
	socket.disconnect();
};
ids.select_server.onchange=displayServer;

socket.on("connect",()=>{
	console.log("CONNECTED as "+socket.id);
	updateText();
});
socket.on("get-servers",data=>{
	console.log("Getting: servers");
	servers=data;
	hasServers=true;
	setServers();
});
socket.on("get-serverStatus",data=>{
	console.log("Getting: serverStatus");
	serverStatus=data;
	hasServerStatus=true;
	setServers();
});
socket.on("update-serverStatus",data=>{
	const {serverKey,status}=data;
	serverStatus[serverKey]=status;
	if(
		serverKey==ids.select_server.value||
		ids.select_server.value.startsWith("$")
	) displayServer();
	console.log("Update server: "+serverKey);
});
socket.on("shutdown",code=>{
	console.log("Shutdown socket server");
	socket.disconnect();
});
socket.on("msg",msg=>{
	alert(msg);
});
socket.on("disconnect",()=>{
	console.log("DISCONNECTED");
	updateText();
});
