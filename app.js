/**
	@type {typeof import('lui/index')}
*/
let socket;
const lui=window.lui;
const {
	init,
	node,
	node_dom,
	//node_map,
	hook_effect,
	hook_memo,
	hook_model,
}=lui;

const model={
	init:()=>({
		connected: false,
	}),
	setConnected:(state,bool)=>({
		...state,
		connected: bool,
	}),
};

function getToken(){
	const cookie=document.cookie.split("; ").find(item=>item.startsWith("token="));
	if(cookie) return cookie.substring(6);
	return null;
}
function ViewOverview({state,actions}){return[
	node_dom("h1[innerText=Test]",{
		S:{
			color: socket.connected?"unset":"red",
		},
	}),
]}

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
	});

	return[null,[
		node(ViewOverview,{state,actions}),
	]];
});