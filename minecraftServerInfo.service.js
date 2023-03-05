const socketIo=require("socket.io");
const {exec}=require("child_process");
const fetch=require("node-fetch");

const ip="192.168.178.48";
const minecraftServerRunnerPath="/home/lff/Programmes/MinecraftServer/minecraftServerStarter";
const serversJson=minecraftServerRunnerPath+"/servers.json";
const configJson=minecraftServerRunnerPath+"/config.json";

this.start=()=>{
	this.serviceRunning=true;
	this.startStep=0;
	this.config={};
	this.servers=[];
	this.status={};

	exec(`ssh ${ip} cat ${configJson}`,(error,stdout,stderr)=>{
		if(error){
			log("ERROR: "+error);
		}
		if(stderr){log(stderr)}
		const json=JSON.parse(stdout.trim());
		this.config=json;
		this.startStep+=1;
	});
	exec(`ssh ${ip} -y cat ${serversJson}`,(error,stdout,stderr)=>{
		if(error){log("ERROR: "+error);}
		if(stderr){log(stderr)}
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
}
this.startNext=data=>{
	const fn=(()=>{
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
	
	this.io=socketIo(22663,{
		cors:{
			origin:"*",
		},
	});

	this.io.on("connection",socket=>{
		log("socket "+socket.id+" has connected");

		socket.emit("get-servers",this.servers);
		socket.emit("get-serverStatus",this.status);
		socket.emit("update-frame");

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
}
this.handleServerResponse=data=>{
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
				...serverResponse,
				httpOnline: true,
			}:{
				httpOnline:false,
			}
		);

		if(
			JSON.stringify(old)!=
			JSON.stringify(this.status[key])
		){
			this.io.emit("update-serverStatus",{
				serverKey: key,
				status: this.status[key],
			});
		}
	}
}
this.stop=()=>{
	this.io.emit("shutdown",0);
	this.serviceRunning=false;
}
