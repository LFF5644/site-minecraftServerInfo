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

const model={
	init:()=>({
		connected: false,
		serverStatus: {},
		servers: [],
		view: "overview",
	}),
	setConnected:(state,connected)=>({
		...state,
		connected,
	}),
	setServers:(state,servers)=>({
		...state,
		servers,
	}),
	setServerStatus:(state,serverStatus)=>({
		...state,
		serverStatus,
	}),
	setServerStatusId:(state,id,status)=>({
		...state,
		serverStatus: {
			...state.serverStatus,
			[id]: status,
		},
	}),
	setView:(state,view)=>({
		...state,
		view,
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
	node_map(
		Server,
		hook_memo(Object.keys,[state.serverStatus]),
		{state,actions}
	),
]}
function Server({I,state,actions}){
	const server=state.servers.find(item=>item.id===I);
	const status=state.serverStatus[I];
	
	return[
		server.serverType!=="proxy/bungee"&&
		node_dom("p[className=serverItem]",null,[
			node_dom("span[className=name]",{
				innerText: server.name+":",
				onclick:()=> actions.setView("$"+I),
			}),

			status.httpOnline&&
			node_dom("span[style=color:green]",{
				innerText:" "+(
					(
						!status.running&&
						status.status==="Sleeping"
					)
					?	"(Schläft)"
					:	status.players.length
				),
			}),

			!status.httpOnline&&
			node_dom("span[style=color:red][innerText= (Offline)]"),
		]),
	];
}
function ViewServerInfo({id,state,actions}){
	const server=state.servers.find(item=>item.id===id);
	const status=state.serverStatus[id];

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
		socket.on("get-serverStatus",data=>{
			console.log("Getting: serverStatus",data);
			actions.setServerStatus(data);
		});
		socket.on("get-servers",data=>{
			console.log("Getting: servers",data);
			actions.setServers(data);
		});
		socket.on("update-serverStatus",data=>{
			const {id,status}=data;
			actions.setServerStatusId(id,status);
			console.log("Update server: "+id);
		});
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