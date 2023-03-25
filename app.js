/**
	@type {typeof import('lui/index')}
*/
const lui=window.lui;
const {
	init,
	//node,
	node_dom,
	//node_map,
	//hook_effect,
	//hook_memo,
	hook_model,
}=lui;

const model={
	init:()=>({

	}),
};

init(()=>{
	const [state,actions]=hook_model(model);
	
	return[null,[
		node_dom("h1[innerText=Test]"),
	]];
});