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
};

function getToken(){
	const cookie=document.cookie.split("; ").find(item=>item.startsWith("token="));
	if(cookie) return cookie.substring(6);
	return null;
}
function ViewOverview({state,actions}){return[
	node_dom("h1[innerText=Server Übersicht]",{
		S:{
			color: socket.connected?"unset":"red",
		},
	}),
	node_map(Server,Object.keys(state.serverStatus),{state,actions}),
]}
function Server({I,state,actions}){
	const server=state.servers.find(item=>item.id===I);
	const status=state.serverStatus[I];
	
	return[
		server.serverType!=="proxy/bungee"&&
		node_dom("p",{
			innerText: server.name+": ",
		},[
			status.httpOnline&&
			node_dom("span[style=color:green]",{
				innerText: (
					!status.running&&
					status.status==="Sleeping"
				)?"(Schläft)":status.players.length,
			}),
			!status.httpOnline&&
			node_dom("span[style=color:red][innerText=(Offline)]"),
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
		node(ViewOverview,{state,actions}),
	]];
});