const socketIo=require("socket.io");
const socketIoClient=require("socket.io-client");
const {exec}=require("child_process");
const fetch=require("node-fetch");

const user="lff";
const ip="192.168.178.48";
const minecraftServerRunnerPath="/home/lff/Programmes/MinecraftServer/minecraftServerStarter";
const serversJson=minecraftServerRunnerPath+"/servers.json";
const configJson=minecraftServerRunnerPath+"/config.json";
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
	this.serviceRunning=true;
	this.socketServers=[];
	this.startStep=0;
	this.config={};
	this.servers=[];
	this.status=[];

	exec(`ssh ${user}@${ip} cat ${configJson}`,(error,stdout,stderr)=>{
		if(error) log("ERROR: "+error);
		if(stderr) log("STDERR: "+stderr);
		const json=JSON.parse(stdout.trim());
		this.config=json;
		this.startStep+=1;
	});
	exec(`ssh ${user}@${ip} -y cat ${serversJson}`,(error,stdout,stderr)=>{
		if(error) log("ERROR: "+error);
		if(stderr) log("STDERR: "+stderr);
		const json=JSON.parse(stdout.trim());
		this.servers=json;
		this.startStep+=1;
	});
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
	/*const fn=(()=>{
		for(let index in this.servers){
			const server=this.servers[index];
			if(!server.httpPort) continue;
			fetch(`http://${ip}:${server.httpPort}/get/serverStatus`)
				.then(r=>r.json())
				.then(r=>this.handleServerResponse({
					serverOnline: true,
					serverResponse: r,
					requestPath: "/get/serverStatus",
					serverIndex: new Number(index),
				}))
				.catch(()=>this.handleServerResponse({
					serverOnline: false,
					serverResponse: null,
					requestPath: "/get/serverStatus",
					serverIndex: new Number(index),
				}));
		}
		if(this.serviceRunning) setTimeout(fn,2e3);
	});
	fn();
	*/
	for(const index in this.servers){
		const server=this.servers[index];
		this.status.push({
			...statusTemplate,
			id: server.id,
		});
	}
	for(const index in this.servers){
		const server=this.servers[index];
		if(!server.socketPort) continue;
		const socket=socketIoClient(`http://${ip}:${server.socketPort}`);
		this.socketServers.push({
			id: server.id,
			socket,
		});

		socket.on("connect",()=>{
			console.log(server.name+": "+socket.id);

			const index=this.status.findIndex(item=>item.id===server.id);
			if(index===-1){
				log("Server id "+server.id+" cant found in this.status");
				return;
			}
			this.status[index]={
				...this.status[index],
				socketOnline: true,
			};
			this.io.emit("updateStatusKey",{
				id: server.id,
				key: "socketOnline",
				value: true,
			});

			socket.on("serverStatus",status=>{
				this.status[index]={
					...statusTemplate,
					...status,
				};
				this.io.emit("serverStatusUpdateFull",server.id,this.status[index]);
			});
			socket.on("playerJoin",playerName=>{
				this.status[index]={
					...statusTemplate,
					...this.status[index],
					players:[
						...this.status[index].players,
						playerName,
					],
				};
				this.io.emit("playerJoin",{
					id: server.id,
					playerName,
				});
			});
			socket.on("playerLeft",playerName=>{
				this.status[index]={
					...statusTemplate,
					...this.status[index],
					players: this.status[index].players
						.filter(item=>item!==playerName),
				};
				this.io.emit("playerLeft",{
					id: server.id,
					playerName,
				});
			});
			socket.on("disconnect",()=>{
				const index=this.status.findIndex(item=>item.id===server.id);
				if(index===-1){
					log("Server id "+server.id+" cant found in this.status");
					return;
				}
				this.status[index]={
					...statusTemplate,
					...this.status[index],
					socketOnline: false,
				};
				this.io.emit("updateStatusKey",{
					id: server.id,
					key: "socketOnline",
					value: false,
				});
			});
			socket.on("updateStatusKey",(key,value)=>{
				this.status[index]={
					...statusTemplate,
					...this.status[index],
					[key]: value,
				};
				this.io.emit("updateStatusKey",{
					id: server.id,
					key, value,
				});
			});
			socket.on("loadStatusTemplate",()=>{
				this.status[index]={
					...statusTemplate,
					id: this.status[index].id,
				};
				this.io.emit("loadStatusTemplate",server.id);
			});

			socket.emit("serverStatus");
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
		socket.emit("serverStatus",this.status);

		socket.on("disconnect",()=>{
			log("socket "+socket.id+" has disconnected");
		});
		socket.on("get-servers",()=>{
			socket.emit("get-servers",this.servers);
		});
		socket.on("get-serverStatus",()=>{
			socket.emit("get-serverStatus",this.status);
		});
	});
};
/*this.handleServerResponse=data=>{
	const {
		serverOnline,
		serverResponse,
		requestPath,
		serverIndex,
	}=data;

	if(requestPath=="/get/serverStatus"){
		const server=this.servers[serverIndex];
		const key=server.id?server.id:String(serverIndex);
		const old=this.status[key];

		this.status[key]=(
			serverOnline?{
				...statusTemplate,
				...serverResponse,
				socketOnline: true,
			}:{
				...statusTemplate,
				socketOnline:false,
			}
		);

		if(
			JSON.stringify(old)!=
			JSON.stringify(this.status[key])
		){
			this.io.emit("update-serverStatus",{
				id: key,
				status: {
					id: key,
					...this.status[key],
				},
			});
		}
	}
}*/
this.stop=()=>{
	this.io.emit("shutdown",0);
	this.io.close();
	for(const server of this.socketServers){
		server.socket.disconnect();
	}
	this.serviceRunning=false;
};
