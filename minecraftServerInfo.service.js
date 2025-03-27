const socketIo=require("socket.io");
const socketIoClient=require("socket.io-client");

const statusTemplate={
	id: null,
	pid: null,
	players: [],
	running: false,
	socketOnline: false,
	status: "Offline",
	statusColor: "red",
};

this.start=()=>{
	this.serviceRunning=false;
	this.socketServers=[];
	this.startStep=2;
	this.serverSocketIps=[
		"http://localhost:3501",
	];
	this.servers=[];
	this.status=new Map();
	{
		const fn=()=>{
			if(this.startStep==2){
				this.startNext();
			}else{
				setTimeout(fn,3e2);
			}
		}
		setTimeout(fn,3e2);
	}
};
this.startNext=data=>{
	this.serviceRunning=true;
	for(const ip of this.serverSocketIps){
		const socket=socketIoClient(ip);

		socket.on("connect",()=>{
			socket.emit("get-serverObject");
			socket.on("serverObject",server=>{
				this.servers.push(server);
				this.socketServers.push({
					id: server.id,
					socket,
				});
				console.log(server.name+": "+socket.id);
				this.status.set(server.id,{
					...statusTemplate,
					...this.status.has(server.id)?this.status.get(server.id):[],
					socketOnline: true,
				});
				this.io.emit("updateStatusKey",{
					id: server.id,
					key: "socketOnline",
					value: false,
				});

				socket.on("serverStatus",status=>{
					this.status.set(server.id,{
						...statusTemplate,
						...status,
					});
					this.io.emit("serverStatusUpdateFull",server.id,this.status.get(server.id));
				});
				socket.on("playerJoin",playerName=>{
					const status=this.status.get(server.id);
					this.status.set(server.id,{
						...statusTemplate,
						...status,
						players:[
							...status.players,
							playerName,
						],
					});
					this.io.emit("playerJoin",{
						id: server.id,
						playerName,
					});
				});
				socket.on("playerLeft",playerName=>{
					const status=this.status.get(server.id);
					this.status.set(server.id,{
						...statusTemplate,
						...status,
						players: status.players
							.filter(item=>item!==playerName),
					});
					this.io.emit("playerLeft",{
						id: server.id,
						playerName,
					});
				});
				socket.on("disconnect",()=>{
					this.status.set(server.id,{
						...statusTemplate,
						...this.status.get(server.id),
						socketOnline: false,
					});
					this.io.emit("updateStatusKey",{
						id: server.id,
						key: "socketOnline",
						value: false,
					});
				});
				socket.on("updateStatusKey",(key,value)=>{
					this.status.set(server.id,{
						...statusTemplate,
						...this.status.get(server.id),
						[key]: value,
					});
					this.io.emit("updateStatusKey",{
						id: server.id,
						key, value,
					});
				});
				socket.on("loadStatusTemplate",()=>{
					const status=this.status.get(server.id);
					this.status.set(server.id,{
						...statusTemplate,
						id: status.id,
						socketOnline: status.socketOnline,
					});
					this.io.emit("loadStatusTemplate",server.id);
				});

				socket.emit("serverStatus");
			});
		});
	}
	
	this.io=socketIo(22663,{
		cors:{
			origin:"*",
		},
	});

	this.io.on("connection",socket=>{
		if(!this.serviceRunning){
			socket.emit("msg","Service offline");
			socket.disconnect();
			return;
		}
		log("socket "+socket.id+" has connected");

		socket.emit("servers",this.servers);
		socket.emit("serverStatus",this.statusToArray());

		socket.on("disconnect",()=>{
			log("socket "+socket.id+" has disconnected");
		});
		socket.on("get-servers",()=>{
			socket.emit("get-servers",this.servers);
		});
		socket.on("get-serverStatus",()=>{
			socket.emit("get-serverStatus",this.statusToArray());
		});
	});
};
this.statusToArray=()=>{
	return Object.entries(Object.fromEntries(this.status)).map(item=>({...item[1],id:item[0]}));
}
this.stop=()=>{
	this.io.emit("shutdown",0);
	this.io.close();
	for(const server of this.socketServers){
		server.socket.disconnect();
	}
	this.serviceRunning=false;
};
