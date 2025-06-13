/**
	@type {typeof import('lui/index')}
*/
let socket;
const lui=window.lui;
const {
	init,
	node,
	node_dom,
	node_map,
	hook_effect,
	hook_memo,
	hook_model,
}=lui;

const statusTemplate={
	id: null,
	pid: null,
	players: [],
	running: false,
	socketOnline: false,
	status: "Offline",
	statusColor: "red",
};

const model={
	init:()=>({
		connected: false,
		serverStatus: [],
		servers: [],
		view: "overview",
		histories: {},
	}),
	logState: (state,debug)=>{
		if(debug) debugger;
		console.log("SATE:",state);
		return state;
	},
	setConnected:(state,connected)=>({
		...state,
		connected,
	}),
	setServers:(state,servers)=>({
		...state,
		servers,
		histories: Object.fromEntries(servers.map(item=>
			state.histories[item.id]
			? 	Object.entries(state.histories[item.id])
			: 	[item.id,[]]
		)),
	}),
	setServerStatus:(state,serverStatus)=>({
		...state,
		serverStatus,
	}),
	changeServerStatusById:(state,id,status)=>({
		...state,
		serverStatus: state.serverStatus
			.map(item=>item.id!==id?item:{
				...statusTemplate,
				...status,
			}),
	}),
	setView:(state,view)=>({
		...state,
		view,
	}),
	updateServerStatusKey:(state,{id,key,value})=>({
		...state,
		serverStatus: state.serverStatus
			.map(item=>item.id!==id?item:{
				...statusTemplate,
				...item,
				[key]: value,
			}),
	}),
	addPlayerToServerStatus:(state,{id,playerName})=>({
		...state,
		serverStatus: state.serverStatus
			.map(item=>item.id!==id?item:{
				...statusTemplate,
				...item,
				players: [
					...item.players,
					playerName,
				],
			}),
	}),
	removePlayerFromServerStatus:(state,{id,playerName})=>({
		...state,
		serverStatus: state.serverStatus
			.map(item=>item.id!==id?item:{
				...statusTemplate,
				...item,
				players: item.players
					.filter(item=>item!==playerName),
			}),
	}),
	setServerStatusToTemplate:(state,id)=>({
		...state,
		serverStatus: state.serverStatus
			.map(item=>item.id!==id?item:{
				...statusTemplate,
				id: item.id,
				socketOnline: item.socketOnline,
			}),
	}),
	historyPush: (state,[serverId,time,type,...data])=>({
		...state,
		histories:{
			...state.histories,
			[serverId]: [
				...state.histories[serverId],
				{
					id: time,
					type,
					data,
				},
			],
		},
	}),
	setAllHistories: (state,histories)=>({
		...state,
		histories: Object.fromEntries(Object.entries(histories).map(item=>([
			item[0],
			item[1].map(i=>({
				id: i[0],
				type: i[1],
				data: i.slice(2),
			}))
		]))),
	}),
};
function getToken(){
	const cookie=document.cookie.split("; ").find(item=>item.startsWith("token="));
	if(cookie) return cookie.substring(6);
	return null;
}
function ViewOverview({state,actions}){return[
	node_dom("h1[innerText=Server Übersicht]",{
		S:{
			color: socket.connected?"":"red",
		},
	}),
	node_map(Server,state.serverStatus,{state,actions}),
]}
function Server({I,state,actions}){
	const server=state.servers.find(item=>item.id===I.id);
	
	return[
		server.serverType!=="proxy/bungee"&&
		node_dom("p[className=serverItem]",null,[
			node_dom("span[className=name]",{
				innerText: server.name+":",
				onclick:()=> actions.setView("$"+I.id),
			}),

			I.socketOnline&&
			node_dom("span[style=color:green]",{
				innerText:" "+(
					(
						!I.running&&
						I.status==="Sleeping"
					)
					?	"(Schläft)"
					:	I.players.length
				),
			}),

			!I.socketOnline&&
			node_dom("span[style=color:red][innerText= (Offline)]"),
		]),
	];
}
function ViewServerInfo({id,state,actions}){
	const server=state.servers.find(item=>item.id===id);
	const status=state.serverStatus.find(item=>item.id===id);
	let counter=1e3;
	const idCounter=()=>{counter+=100;return counter;}
	return[
		node_dom("h1[className=withButton]",null,[
			node_dom("button[innerText=Back]",{
				onclick: ()=> actions.setView("overview"),
			}),
			node_dom("span",{
				innerText: server.name,
				title: id,
			}),
		]),
		node_dom("p[innerText=Status: ]",null,[
			node_dom("span",{
				innerText: status.status,
				S:{
					color: status.statusColor||"",
				},
			}),
		]),
		node_dom("p[innerText=Spieler: ]",null,[
			node_dom("span",{
				innerText: status.players.length===0?"Keine":status.players.join(", "),
				S:{
					color: status.players.length===0?"red":"green",
				},
			}),
		]),
		node_dom("div[className=messages]",null,[
			node_map(
				History,
				state.histories[id].filter(item=>item.type==="message"),
				{state,actions}),
		]),
		node_dom("p[className=withButton chatbox]",null,[
			node_dom("input[title=Schreibe mit Minecraft-Chat][hint=Hallo!][id=msg]"),
			node_dom("button[innerText=>]",{
				onclick:()=>{
					const input=document.getElementById("msg");
					const value=input.value;
					if(!value) return;
					socket.emit("post-msg",id,value);
					input.value="";
				},
			}),
		]),
	];
}
function History({I,state,actions}){
	const now=Date.now();
	const showFullDate=now-I.id>1e3*60*60*24;
	const date=new Date(I.id);
	const dateStr=showFullDate?date.toLocaleString():date.toLocaleTimeString();
	return[
		I.type==="message"&&
		node_dom("p[className=message]",null,[
			node_dom("span[className=date]",{innerText:dateStr}),
			node_dom("span[innerText=: ]"),
			node_dom("span[className=player]",{
				innerText: I.data[0],
				S:{
					"color": I.data[2]==="minecraft"?"green":"orange",
				},
			}),
			node_dom("span[innerText=: ]"),
			node_dom("span[className=content]",{innerText:I.data[1]}),
		]),

		I.type==="log"&&
		node_dom("p",{
			innerText: "LOG: "+I.data[0],
		}),
	];
}

init(()=>{
	const [state,actions]=hook_model(model);

	hook_effect(()=>{
		socket=io({
			path:"/bind/socket/minecraftServerInfo",
			auth: {
				token: getToken(),
			},
		});
		socket.on("connect",()=>{
			console.log("Connected as "+socket.id);
			actions.setConnected(true);
		});
		socket.on("disconnect",()=>{
			console.log("Disconnected");
			actions.setConnected(false);
		});
		socket.on("serverStatus",actions.setServerStatus);
		socket.on("servers",actions.setServers);
		socket.on("serverStatusUpdateFull",actions.changeServerStatusById);
		socket.on("updateStatusKey",actions.updateServerStatusKey);
		socket.on("playerJoin",actions.addPlayerToServerStatus);
		socket.on("playerLeft",actions.removePlayerFromServerStatus);
		socket.on("loadStatusTemplate",actions.setServerStatusToTemplate);
		socket.on("history",actions.historyPush);
		socket.on("all-histories",actions.setAllHistories);

		socket.onAny(console.log);

		window.logState=actions.logState;
	});

	return[null,[
		state.view==="overview"&&
		node(ViewOverview,{state,actions}),

		state.view.startsWith("$")&&
		node(ViewServerInfo,{
			id: state.view.substring(1),
			state, actions,
		}),
	]];
});